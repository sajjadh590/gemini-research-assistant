from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Any
import os
import json
from dotenv import load_dotenv

# Import Modules
from app.modules.pubmed_client import PubMedClient
from app.modules.gemini_client import GeminiClient
from app.modules.stats_engine import StatsEngine

load_dotenv()

app = FastAPI()

# --- Path Setup ---
# مسیردهی دقیق برای جلوگیری از ارور "Directory not found"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Initialize Clients ---
pubmed = PubMedClient()
stats_tool = StatsEngine()
gemini_api_key = os.getenv("GEMINI_API_KEY")
gemini = None

if gemini_api_key:
    try:
        # ارسال کلید API به کلاس (رفع باگ قبلی)
        gemini = GeminiClient(gemini_api_key)
        print("✅ Gemini Client Initialized.")
    except Exception as e:
        print(f"⚠️ Gemini Init Error: {e}")
else:
    print("⚠️ CRITICAL: GEMINI_API_KEY missing in environment variables.")

# --- Data Models ---

class PaperModel(BaseModel):
    id: str
    title: str
    abstract: str
    authors: List[str] = []
    year: str = ""
    journal: str = ""
    url: str = ""
    source: str = ""
    selected: bool = False

class SearchQuery(BaseModel):
    query: str
    max_results: int = 10

class AnalyzeRequest(BaseModel):
    papers: List[PaperModel]
    topic: str = ""
    language: str = "en"

class ProposalRequest(BaseModel):
    topic: str
    papers: List[PaperModel]
    structure: str
    language: str = "en"

class StatsRequest(BaseModel):
    topic: str
    language: str = "en"

# --- API Endpoints ---

@app.post("/api/search")
async def search_api(request: SearchQuery):
    return {"results": pubmed.search_articles(request.query, request.max_results)}

@app.post("/api/analyze/gaps")
async def analyze_gaps_api(request: AnalyzeRequest):
    if not gemini: raise HTTPException(500, "Gemini API Key missing")
    
    # تبدیل لیست مقالات به متن
    text_context = "\n\n".join([f"Title: {p.title}\nAbstract: {p.abstract}" for p in request.papers])
    
    # دریافت نتیجه (ممکن است رشته باشد یا دیکشنری)
    result = gemini.analyze_gap(text_context, request.language)
    
    # اگر خروجی رشته بود، تبدیل به JSON کن تا فرانت‌اند کرش نکند
    if isinstance(result, str):
        try:
            return json.loads(result)
        except:
            # در صورت خرابی JSON، یک دیتای اضطراری بفرست
            return {
                "gaps": [],
                "summary": "Error parsing AI response. Please try again.",
                "methodologySuggestions": ""
            }
    return result

@app.post("/api/proposal")
async def generate_proposal_api(request: ProposalRequest):
    if not gemini: raise HTTPException(500, "Gemini API Key missing")
    
    text_context = "\n\n".join([f"[{p.year}] {p.title}: {p.abstract}" for p in request.papers])
    proposal_text = gemini.generate_proposal(request.topic, text_context, request.structure, request.language)
    
    return {"content": proposal_text}

@app.post("/api/stats/auto-estimate")
async def auto_sample_size(request: StatsRequest):
    if not gemini: raise HTTPException(500, "Gemini API Key missing")
    
    # 1. Search
    articles = pubmed.search_articles(request.topic, max_results=5)
    abstracts = [a['abstract'] for a in articles if a.get('abstract')]
    
    if not abstracts: return {"error": "No similar studies found."}
    
    # 2. AI Extract
    full_text = " ".join(abstracts)
    try:
        ai_data_raw = gemini.extract_sample_params(full_text)
        # هندلینگ اینکه خروجی رشته است یا دیکشنری
        if isinstance(ai_data_raw, str):
            ai_data = json.loads(ai_data_raw)
        else:
            ai_data = ai_data_raw
            
        suggested_effect = float(ai_data.get("suggested_effect_size", 0.5))
    except:
        suggested_effect = 0.5
        ai_data = {"reasoning": "Default used due to extraction error."}
        
    # 3. Calculate
    n = stats_tool.calculate_sample_size(suggested_effect)
    
    return {
        "suggested_sample_size": n * 2,
        "parameters": {"effect_size": suggested_effect, "alpha": 0.05, "power": 0.8},
        "reasoning": ai_data.get("reasoning", ""),
        "basis_papers": [a['title'] for a in articles]
    }

# --- Serve Static Files (Frontend) ---

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
else:
    # ایجاد پوشه خالی برای جلوگیری از کرش سرور
    os.makedirs(ASSETS_DIR, exist_ok=True)
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(404, "API Endpoint Not Found")
    
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return JSONResponse(status_code=500, content={"error": "Frontend index.html not found"})