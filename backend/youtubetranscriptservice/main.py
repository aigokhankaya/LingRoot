from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import logging
import os
import sys
from fastapi.middleware.cors import CORSMiddleware

# Bu dizini Python path'ine ekle (import için)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# LocalScript transcript scraper modülünü import et
try:
    from transcript_scraper import get_transcript_from_yttranscript_com
except ImportError:
    # Alternatif import yolunu dene
    from backend.youtubetranscriptservice.transcript_scraper import get_transcript_from_yttranscript_com

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Log dosyasını oluştur (eğer dizin mevcutsa)
try:
    if not os.path.exists('backend/logs'):
        os.makedirs('backend/logs', exist_ok=True)
    logging.basicConfig(filename='backend/logs/transcript_service.log')
except Exception as e:
    print(f"Log dosyası oluşturulamadı: {e}")

app = FastAPI(
    title="YouTube Transcript Service",
    description="YouTube videolarından transkript çekme servisi",
    version="1.0.0"
)

# CORS ayarlarını düzelt - özellikle frontend bağlantısı için
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tüm originlere izin ver
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
        return {"transcript": transcript, "success": True}
    except Exception as e:
        error_msg = str(e)
        logging.error(f"Error processing request: {error_msg}")
        
        # Hata olsa bile fallback transcript dön (UI için gerekli)
        fallback_transcript = f"""
        HATA: {error_msg}
        
        Bu bir fallback transkript örneğidir. Gerçek transcript çekilemedi.
        
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Proin euismod, nunc in aliquam ultrices, nisi enim aliquam ipsum,
        vitae luctus nisl nunc in lectus. Donec auctor, nisl eget aliquam ultrices.
        """
        
        return {
            "transcript": fallback_transcript,
            "success": False,
            "error": error_msg
        }

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