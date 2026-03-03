from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from .generator import get_queued_puzzle

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/puzzle")
def fetch_puzzle(size: int = Query(8, ge=8, le=11)):
    """Fetches a unique, unconstrained puzzle from the queue."""
    return get_queued_puzzle(size)