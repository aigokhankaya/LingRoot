from fastapi import FastAPI
from pydantic import BaseModel
import logging
from youtube_transcript_api import YouTubeTranscriptApi
import re

# Log ayarı
logging.basicConfig(filename='transcript_service.log', level=logging.INFO)

app = FastAPI()

class TranscriptRequest(BaseModel):
    url: str

@app.post("/scrape-transcript")
async def scrape_transcript(req: TranscriptRequest):
    logging.info(f"Request received: {req.url}")
    match = re.search(r"v=([a-zA-Z0-9_-]+)", req.url)
    if not match:
        logging.error("Invalid YouTube URL")
        return {"transcript": ""}
    video_id = match.group(1)
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join([x['text'] for x in transcript])
        logging.info("Transcript fetched successfully")
        return {"transcript": text}
    except Exception as e:
        logging.error(f"Error fetching transcript: {e}")
        return {"transcript": ""} 