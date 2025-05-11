from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class TranscriptRequest(BaseModel):
    url: str

@app.post("/scrape-transcript")
async def scrape_transcript(req: TranscriptRequest):
    return {"transcript": "dummy transcript for " + req.url} 