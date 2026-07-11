from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

class SearchRequest(BaseModel):
    origin: str
    destination: str
    departure_date: date
    flex_days: int = Field(default=0, ge=0, le=7)
    passengers: int = Field(default=1, ge=1, le=9)
    max_budget_eur: float | None = Field(default=None, gt=0)

    @field_validator("origin", "destination")
    @classmethod
    def iata(cls, value: str) -> str:
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise ValueError("must be a three-letter IATA airport code")
        return value

    @field_validator("destination")
    @classmethod
    def different_airport(cls, value: str, info) -> str:
        if value == info.data.get("origin"):
            raise ValueError("must differ from origin")
        return value

class FlightItinerary(BaseModel):
    departure_date: date
    price: float
    currency: str = "EUR"
    airline: str
    departure_time: str | None = None
    arrival_time: str | None = None
    duration: str | None = None
    stops: int | None = None
    booking_url: str | None = None

class SearchResponse(BaseModel):
    origin: str
    destination: str
    departure_date: date
    flex_days: int
    max_budget_eur: float | None = None
    budget_status: Literal["not_applied", "matched", "exceeded"]
    source: Literal["live", "cache", "demo_fallback"]
    itineraries: list[FlightItinerary]
    message: str | None = None