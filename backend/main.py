from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import os
import json
from dotenv import load_dotenv

from app.modules.pubmed_client import PubMedClient
from app.modules.gemini_client import GeminiClient
from app.modules.stats_engine import StatsEngine

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# کلاینت‌ها
pubmed = PubMedClient()
stats_tool = StatsEngine()
gemini_api_key = os.getenv("GEMINI_API_KEY")
gemini = None

if gemini_api_key:
    try:
        gemini = GeminiClient()
    except:
        pass

# مدل‌ها
class SearchQuery(BaseModel):
    query: str
    max_results: int = 10

class AnalyzeRequest(BaseModel):
    papers: List[str]
    topic: str
    language: str = "en"

# --- API Endpoints ---

@app.post("/api/search")
async def search_api(request: SearchQuery):
    return {"results": pubmed.search_articles(request.query, request.max_results)}

@app.post("/api/analyze/gaps")
async def analyze_gaps_api(request: AnalyzeRequest):
    if not gemini: raise HTTPException(500, "Gemini API Key missing")
    text = "\n\n".join(request.papers[:10])
    return json.loads(gemini.analyze_gap(text, request.language))

@app.post("/api/stats/auto-estimate")
async def auto_sample_size(request: SearchQuery):
    if not gemini: raise HTTPException(500, "Gemini API Key missing")
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

# --- بخش مهم: سرو کردن سایت React ---
# اتصال فایل‌های استاتیک (CSS/JS)
app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")

# نمایش فایل HTML اصلی در صفحه اول
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(404)
    return FileResponse("app/static/index.html")