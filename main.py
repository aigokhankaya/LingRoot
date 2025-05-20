from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import logging
import os
import sys
from fastapi.middleware.cors import CORSMiddleware

# Bu dizini Python path'ine ekle (import için)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from transcript_scraper_new import get_transcript_from_yttranscript_com
except ImportError:
    # Lokal import dene
    from backend.youtubetranscriptservice.transcript_scraper_new import get_transcript_from_yttranscript_com

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='transcript_service.log'
)

app = FastAPI(
    title="YouTube Transcript Service",
    description="YouTube videolarından transkript çekme servisi",
    version="1.0.0"
)

# CORS ayarlarını düzelt - özellikle frontend bağlantısı için
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TranscriptRequest(BaseModel):
    url: str
    language_code: str = Field(default="en", description="Transkript dil kodu (örn: en, tr, es)")

@app.post("/scrape-transcript")
async def scrape_transcript(req: TranscriptRequest):
    """
    Endpoint to scrape transcript from a YouTube video URL
    """
    try:
        logging.info(f"Received request for URL: {req.url} with language: {req.language_code}")
        transcript = await get_transcript_from_yttranscript_com(req.url, req.language_code)
        logging.info(f"Successfully retrieved transcript for URL: {req.url}")
        return {"transcript": transcript}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error processing request: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/health")
async def health_check():
    """
    Servisin çalışıp çalışmadığını kontrol etmek için sağlık endpoint'i
    """
    return {"status": "ok", "service": "youtube-transcript-service"}

@app.options("/scrape-transcript")
async def options_transcript():
    """
    CORS sorunlarını çözmek için OPTIONS endpoint'i
    """
    return {}

if __name__ == "__main__":
    import uvicorn
    # Varsayılan olarak port 8001 kullan, ancak PORT ortam değişkeni varsa onu kullan
    port = int(os.getenv("PORT", 8001))
    print(f"YouTube Transcript Service port {port} üzerinde başlatılıyor...")
    uvicorn.run(app, host="0.0.0.0", port=port) 