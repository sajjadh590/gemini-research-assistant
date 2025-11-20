from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List
import os
import json
from dotenv import load_dotenv

# Import Modules
from app.modules.pubmed_client import PubMedClient
from app.modules.gemini_client import GeminiClient
from app.modules.stats_engine import StatsEngine

load_dotenv()

app = FastAPI()

# --- 🛠️ DEBUGGING TOOLS (ابزار عیب‌یابی) ---
def print_structure(startpath):
    print(f"\n📂 Listing files in: {startpath}")
    if not os.path.exists(startpath):
        print("❌ Path does not exist!")
        return
    
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        # فقط ۵ فایل اول هر پوشه را نشان بده که لاگ شلوغ نشود
        for f in files[:5]:
            print(f"{subindent}{f}")
        if len(files) > 5:
            print(f"{subindent}... ({len(files)-5} more files)")
            
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

# چاپ ساختار فایل‌ها در لحظه شروع برنامه
print("--- 🚀 STARTUP DIAGNOSTICS ---")
print(f"Base Directory: {BASE_DIR}")
print_structure(BASE_DIR)
print("------------------------------\n")
# ---------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Clients
pubmed = PubMedClient()
stats_tool = StatsEngine()
gemini_api_key = os.getenv("GEMINI_API_KEY")
gemini = None

if gemini_api_key:
    try:
        gemini = GeminiClient(gemini_api_key)
        print("✅ Gemini Client Initialized Successfully.")
    except Exception as e:
        print(f"⚠️ Gemini Init Error: {e}")
else:
    print("⚠️ WARNING: GEMINI_API_KEY is missing in Environment Variables!")

# Models
class SearchQuery(BaseModel):
    query: str
    max_results: int = 10

class AnalyzeRequest(BaseModel):
    papers: List[str]
    topic: str
    language: str = "en"

# API Endpoints
@app.post("/api/search")
async def search_api(request: SearchQuery):
    return {"results": pubmed.search_articles(request.query, request.max_results)}

@app.post("/api/analyze/gaps")
async def analyze_gaps_api(request: AnalyzeRequest):
    if not gemini: raise HTTPException(500, "Gemini API Key missing or invalid")
    text = "\n\n".join(request.papers[:10])
    return json.loads(gemini.analyze_gap(text, request.language))

@app.post("/api/stats/auto-estimate")
async def auto_sample_size(request: SearchQuery):
    if not gemini: raise HTTPException(500, "Gemini API Key missing or invalid")
    articles = pubmed.search_articles(request.query, max_results=5)
    abstracts = [a['abstract'] for a in articles if a.get('abstract')]
    
    if not abstracts: return {"error": "No similar studies found."}
    
    full_text = " ".join(abstracts)
    try:
        ai_data = json.loads(gemini.extract_sample_params(full_text))
        effect = float(ai_data.get("suggested_effect_size", 0.5))
    except:
        effect = 0.5
        ai_data = {"reasoning": "Default used."}
        
    n = stats_tool.calculate_sample_size(effect)
    return {
        "suggested_sample_size": n * 2,
        "parameters": {"effect_size": effect, "alpha": 0.05, "power": 0.8},
        "reasoning": ai_data.get("reasoning", ""),
        "basis_papers": [a['title'] for a in articles]
    }

# --- Serve React App (Robust Mode) ---
# تلاش برای پیدا کردن فایل‌ها حتی اگر پوشه assets دقیقاً آنجا نباشد
if os.path.isdir(ASSETS_DIR):
    print(f"✅ Assets directory found at: {ASSETS_DIR}")
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
else:
    print(f"❌ CRITICAL: Assets directory NOT found at {ASSETS_DIR}")
    # ساخت پوشه خالی برای جلوگیری از کرش کردن سرور
    os.makedirs(ASSETS_DIR, exist_ok=True)
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(404)
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return JSONResponse(
        status_code=500, 
        content={
            "error": "Frontend index.html not found!",
            "debug_path": str(index_path),
            "suggestion": "Check the logs to see file structure."
        }
    )