import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from threading import RLock
from typing import Protocol

import httpx

from schemas import FlightItinerary, SearchRequest

logger = logging.getLogger(__name__)

USD_TO_EUR = 0.88
SEARCHAPI_URL = "https://www.searchapi.io/api/v1/search"
SEARCHAPI_TIMEOUT_SECONDS = 30.0
SEARCHAPI_RETRIES = 3
SEARCHAPI_BACKOFF = (1, 3, 6)


class FlightSourceError(RuntimeError):
    pass


class FlightScraper(Protocol):
    def search(self, origin: str, destination: str, departure_date: date, passengers: int) -> list[FlightItinerary]: ...


def _searchapi_get(url: str, params: dict) -> httpx.Response:
    return httpx.get(url, params=params, timeout=SEARCHAPI_TIMEOUT_SECONDS)


def _format_duration(total_minutes: int | float | None) -> str | None:
    if total_minutes is None:
        return None
    minutes = int(total_minutes)
    hours, mins = divmod(minutes, 60)
    parts = []
    if hours:
        parts.append(f"{hours}h")
    if mins or not parts:
        parts.append(f"{mins}m")
    return " ".join(parts)


class SearchApiFlightsScraper:
    def __init__(self, api_key: str | None = None, requester=_searchapi_get):
        self.api_key = api_key or os.getenv("SEARCHAPI_API_KEY")
        self.requester = requester

    def search(self, origin: str, destination: str, departure_date: date, passengers: int) -> list[FlightItinerary]:
        if not self.api_key:
            raise FlightSourceError("SEARCHAPI_API_KEY is not configured")

        params = {
            "engine": "google_flights",
            "departure_id": origin,
            "arrival_id": destination,
            "flight_type": "one_way",
            "outbound_date": departure_date.isoformat(),
            "travel_class": "economy",
            "stops": "any",
            "currency": "USD",
            "hl": "en",
            "gl": "us",
            "adults": str(passengers),
            "children": "0",
            "infants_in_seat": "0",
            "infants_on_lap": "0",
            "api_key": self.api_key,
        }

        payload = self._fetch_payload(params)
        return self._extract_itineraries(payload, departure_date)

    def _fetch_payload(self, params: dict) -> dict:
        last_error = None
        for attempt in range(SEARCHAPI_RETRIES):
            if attempt > 0:
                time.sleep(SEARCHAPI_BACKOFF[min(attempt - 1, len(SEARCHAPI_BACKOFF) - 1)])
            try:
                response = self.requester(SEARCHAPI_URL, params)
                response.raise_for_status()
                data = response.json()
                metadata = data.get("search_metadata") or {}
                if metadata.get("status") not in (None, "Success"):
                    raise FlightSourceError(f"SearchAPI returned status {metadata.get('status')!r}")
                return data
            except (httpx.HTTPError, ValueError, KeyError, TypeError, FlightSourceError) as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                logger.warning("SearchAPI fetch attempt %s/%s failed: %s", attempt + 1, SEARCHAPI_RETRIES, last_error)

        raise FlightSourceError(f"SearchAPI request failed after {SEARCHAPI_RETRIES} attempts [{last_error}]")

    def _extract_itineraries(self, payload: dict, departure_date: date) -> list[FlightItinerary]:
        groups = list(payload.get("best_flights") or []) + list(payload.get("other_flights") or [])
        itineraries: list[FlightItinerary] = []
        for group in groups:
            itinerary = self._normalize_group(group, departure_date)
            if itinerary is not None:
                itineraries.append(itinerary)
        itineraries.sort(key=lambda item: (item.price, item.departure_date, item.departure_time or ""))
        return itineraries

    @staticmethod
    def _normalize_group(group: dict, departure_date: date) -> FlightItinerary | None:
        segments = group.get("flights") or []
        if not segments:
            return None

        price = group.get("price")
        if price is None:
            return None

        first_segment = segments[0]
        last_segment = segments[-1]
        airlines = [segment.get("airline") for segment in segments if segment.get("airline")]
        airline = " + ".join(dict.fromkeys(airlines)) if airlines else "Unknown airline"
        departure_time = (first_segment.get("departure_airport") or {}).get("time")
        arrival_time = (last_segment.get("arrival_airport") or {}).get("time")
        duration = _format_duration(group.get("total_duration"))
        stops = max(len(segments) - 1, 0)

        return FlightItinerary(
            departure_date=departure_date,
            price=round(float(price) * USD_TO_EUR, 2),
            currency="EUR",
            airline=airline,
            departure_time=departure_time,
            arrival_time=arrival_time,
            duration=duration,
            stops=stops,
            booking_url=None,
        )


GoogleFlightsScraper = SearchApiFlightsScraper


class FlightSourceError(RuntimeError):
    pass


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
            if cached and cached.expires_at > datetime.now(timezone.utc):
                return self._apply_budget("cache", cached.itineraries, request)
            self.cache.pop(key, None)

        dates = [request.departure_date + timedelta(days=i) for i in range(request.flex_days + 1)]
        flights = []
        had_successful_fetch = False
        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(dates))) as pool:
            futures = [pool.submit(self.scraper.search, request.origin, request.destination, day, request.passengers) for day in dates]
            for future in as_completed(futures):
                try:
                    flights.extend(future.result())
                    had_successful_fetch = True
                except FlightSourceError:
                    pass

        if not flights:
            if had_successful_fetch:
                return self._apply_budget("live", [], request, "No itineraries found for the requested search.")
            return self._apply_budget("demo_fallback", self._demo_results(request), request, "Live flight data was unavailable; showing demo results.")

        flights.sort(key=lambda item: (item.price, item.departure_date))
        with self.lock:
            self.cache[key] = CacheEntry(datetime.now(timezone.utc) + timedelta(seconds=self.ttl_seconds), flights)
        return self._apply_budget("live", flights, request)

    @staticmethod
    def _apply_budget(source, itineraries, request, message=None):
        if not itineraries:
            return source, itineraries, message, "not_applied"
        if request.max_budget_eur is None:
            return source, itineraries, message, "not_applied"
        matches = [itinerary for itinerary in itineraries if itinerary.price <= request.max_budget_eur]
        if matches:
            return source, matches, message, "matched"
        cheapest = min(itineraries, key=lambda itinerary: itinerary.price)
        budget_message = f"No itineraries meet the €{request.max_budget_eur:.2f} budget; showing the cheapest option at €{cheapest.price:.2f}."
        return source, [cheapest], FlightSearchService._combine_messages(message, budget_message), "exceeded"

    @staticmethod
    def _combine_messages(*messages):
        return " ".join(message for message in messages if message) or None

    @staticmethod
    def _demo_results(request):
        d = request.departure_date
        return [
            FlightItinerary(departure_date=d, price=round(149.0 * USD_TO_EUR, 2), currency="EUR", airline="Sky Scout Demo Air", departure_time="08:10", arrival_time="10:35", duration="2h 25m", stops=0),
            FlightItinerary(departure_date=d, price=round(184.0 * USD_TO_EUR, 2), currency="EUR", airline="Sky Scout Demo Connect", departure_time="13:40", arrival_time="17:05", duration="3h 25m", stops=1),
        ]