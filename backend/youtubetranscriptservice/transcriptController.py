from fastapi import APIRouter
from pydantic import BaseModel
from transcript_scraper import get_transcript_from_yttranscript_com

router = APIRouter()

class TranscriptRequest(BaseModel):
    url: str

@router.post("/scrape-transcript")
def scrape_transcript(data: TranscriptRequest):
    transcript = get_transcript_from_yttranscript_com(data.url)
    return { "transcript": transcript } 