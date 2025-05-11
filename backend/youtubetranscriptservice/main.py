from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
from backend.youtubetranscriptservice.transcript_scraper import get_transcript_from_yttranscript_com

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='backend/logs/transcript_service.log'
)

app = FastAPI()

class TranscriptRequest(BaseModel):
    url: str

@app.post("/scrape-transcript")
async def scrape_transcript(req: TranscriptRequest):
    """
    Endpoint to scrape transcript from a YouTube video URL
    """
    try:
        logging.info(f"Received request for URL: {req.url}")
        transcript = get_transcript_from_yttranscript_com(req.url)
        return {"transcript": transcript}
    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 