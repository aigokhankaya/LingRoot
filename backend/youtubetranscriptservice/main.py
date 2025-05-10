from fastapi import FastAPI
from transcriptController import router as transcript_router

app = FastAPI()
app.include_router(transcript_router) 