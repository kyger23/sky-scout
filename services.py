from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from threading import RLock
from typing import Protocol
from schemas import FlightItinerary, SearchRequest

class FlightSourceError(RuntimeError): pass
class FlightScraper(Protocol):
    def search(self, origin: str, destination: str, departure_date: date, passengers: int) -> list[FlightItinerary]: ...

class GoogleFlightsScraper:
    """Adapter that keeps the rest of the API independent of fast-flights types."""
    def search(self, origin, destination, departure_date, passengers):
        try:
            from fast_flights import FlightData, Passengers, get_flights
            result = get_flights(
                flight_data=[FlightData(date=departure_date.isoformat(), from_airport=origin, to_airport=destination)],
                trip="one-way", seat="economy",
                passengers=Passengers(adults=passengers, children=0, infants_in_seat=0, infants_on_lap=0),
            )
            flights = getattr(result, "flights", result)
            normalized = [self._normalize(flight, departure_date) for flight in flights]
            if not normalized: raise FlightSourceError("Google Flights returned no itineraries")
            return normalized
        except FlightSourceError: raise
        except Exception as exc: raise FlightSourceError("Google Flights search failed") from exc

    @staticmethod
    def _normalize(flight, departure_date):
        def get(name, default=None): return getattr(flight, name, default)
        price = float(str(get("price", 0)).replace("$", "").replace(",", ""))
        return FlightItinerary(departure_date=departure_date, price=price,
            currency=get("currency", "USD"), airline=get("name", get("airline", "Unknown airline")),
            departure_time=get("departure", get("departure_time")), arrival_time=get("arrival", get("arrival_time")),
            duration=get("duration"), stops=get("stops"))

@dataclass(frozen=True)
class CacheEntry:
    expires_at: datetime
    itineraries: list[FlightItinerary]

class FlightSearchService:
    def __init__(self, scraper, ttl_seconds=900, max_workers=4):
        self.scraper, self.ttl_seconds, self.max_workers = scraper, ttl_seconds, max_workers
        self.cache, self.lock = {}, RLock()

    def search(self, request: SearchRequest):
        key = (request.origin, request.destination, request.departure_date.isoformat(), request.flex_days, request.passengers)
        with self.lock:
            cached = self.cache.get(key)
            if cached and cached.expires_at > datetime.now(timezone.utc): return "cache", cached.itineraries, None
            self.cache.pop(key, None)
        dates = [request.departure_date + timedelta(days=i) for i in range(request.flex_days + 1)]
        flights = []
        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(dates))) as pool:
            futures = [pool.submit(self.scraper.search, request.origin, request.destination, day, request.passengers) for day in dates]
            for future in as_completed(futures):
                try: flights.extend(future.result())
                except FlightSourceError: pass
        if not flights:
            return "demo_fallback", self._demo_results(request), "Live Google Flights data was unavailable; showing demo results."
        flights.sort(key=lambda item: (item.price, item.departure_date))
        with self.lock: self.cache[key] = CacheEntry(datetime.now(timezone.utc) + timedelta(seconds=self.ttl_seconds), flights)
        return "live", flights, None

    @staticmethod
    def _demo_results(request):
        d = request.departure_date
        return [FlightItinerary(departure_date=d, price=149.0, airline="Sky Scout Demo Air", departure_time="08:10", arrival_time="10:35", duration="2h 25m", stops=0), FlightItinerary(departure_date=d, price=184.0, airline="Sky Scout Demo Connect", departure_time="13:40", arrival_time="17:05", duration="3h 25m", stops=1)]