from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from schemas import SearchRequest, SearchResponse
from services import FlightSearchService, SearchApiFlightsScraper

app = FastAPI(title="Sky Scout Flight Search API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
search_service = FlightSearchService(SearchApiFlightsScraper())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    source, itineraries, message, budget_status = search_service.search(request)
    return SearchResponse(
        origin=request.origin,
        destination=request.destination,
        departure_date=request.departure_date,
        flex_days=request.flex_days,
        max_budget_eur=request.max_budget_eur,
        budget_status=budget_status,
        source=source,
        itineraries=itineraries,
        message=message,
    )
