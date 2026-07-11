from datetime import date
from schemas import FlightItinerary, SearchRequest
from services import FlightSearchService, FlightSourceError, GoogleFlightsScraper

class GoodScraper:
    def search(self, origin, destination, departure_date, passengers):
        return [FlightItinerary(departure_date=departure_date, price=float(departure_date.day * 100), currency="EUR", airline="Test Air")]
class BadScraper:
    def search(self, *args): raise FlightSourceError("blocked")

def test_searches_requested_dates():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1), flex_days=2)
    source, results, _, budget_status = FlightSearchService(GoodScraper()).search(request)
    assert source == "live" and budget_status == "not_applied"
    assert [item.departure_date for item in results] == [date(2026, 8, 1), date(2026, 8, 2), date(2026, 8, 3)]

def test_returns_labeled_demo_fallback():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1))
    source, results, message, budget_status = FlightSearchService(BadScraper()).search(request)
    assert source == "demo_fallback" and len(results) == 2 and "demo" in message.lower()
    assert budget_status == "not_applied"

def test_budget_returns_only_matching_results():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1), flex_days=2, max_budget_eur=200)
    _, results, _, budget_status = FlightSearchService(GoodScraper()).search(request)
    assert budget_status == "matched"
    assert [item.price for item in results] == [100.0, 200.0]

def test_budget_returns_cheapest_over_budget_result():
    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1), flex_days=1, max_budget_eur=50)
    _, results, message, budget_status = FlightSearchService(GoodScraper()).search(request)
    assert budget_status == "exceeded"
    assert [item.price for item in results] == [100.0]
    assert "cheapest option" in message

def test_cached_results_are_refiltered_for_each_budget():
    service = FlightSearchService(GoodScraper())
    first = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1), flex_days=1, max_budget_eur=150)
    second = first.model_copy(update={"max_budget_eur": 250})
    assert service.search(first)[0] == "live"
    source, results, _, status = service.search(second)
    assert source == "cache" and status == "matched"
    assert [item.price for item in results] == [100.0, 200.0]

def test_google_price_is_converted_to_eur():
    class Flight:
        price = "$123.45"
        name = "Test Air"
        departure = "08:00"
        arrival = "10:00"
        duration = "2h"
        stops = 0
    result = GoogleFlightsScraper._normalize(Flight(), date(2026, 8, 1))
    assert result.price == 108.64
    assert result.currency == "EUR"