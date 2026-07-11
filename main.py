from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import SearchRequest, SearchResponse
from services import FlightSearchService, GoogleFlightsScraper

app = FastAPI(title="Sky Scout Flight Search API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
search_service = FlightSearchService(GoogleFlightsScraper())

@app.get("/health")
def health(): return {"status": "ok"}

@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    source, itineraries, message = search_service.search(request)
    return SearchResponse(origin=request.origin, destination=request.destination, departure_date=request.departure_date, flex_days=request.flex_days, source=source, itineraries=itineraries, message=message)