from datetime import date
from schemas import FlightItinerary, SearchRequest
from services import FlightSearchService, FlightSourceError

class GoodScraper:
    def search(self, origin, destination, departure_date, passengers):
        return [FlightItinerary(departure_date=departure_date, price=200, airline="Test Air")]
class BadScraper:
    def search(self, *args): raise FlightSourceError("blocked")

def test_searches_requested_dates():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1), flex_days=2)
    source, results, _ = FlightSearchService(GoodScraper()).search(request)
    assert source == "live"
    assert [item.departure_date for item in results] == [date(2026, 8, 1), date(2026, 8, 2), date(2026, 8, 3)]

def test_returns_labeled_demo_fallback():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1))
    source, results, message = FlightSearchService(BadScraper()).search(request)
    assert source == "demo_fallback" and len(results) == 2 and "demo" in message.lower()