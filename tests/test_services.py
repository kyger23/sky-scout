from datetime import date

from schemas import FlightItinerary, SearchRequest
from services import FlightSearchService, FlightSourceError, SearchApiFlightsScraper


class GoodScraper:
    def search(self, origin, destination, departure_date, passengers):
        return [FlightItinerary(departure_date=departure_date, price=float(departure_date.day * 100), currency="EUR", airline="Test Air")]


class BadScraper:
    def search(self, *args):
        raise FlightSourceError("blocked")


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


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


def test_searchapi_maps_live_results_and_converts_usd_to_eur():
    def requester(url, params):
        assert params["engine"] == "google_flights"
        assert params["api_key"] == "test-key"
        return FakeResponse({
            "search_metadata": {"status": "Success"},
            "best_flights": [{
                "price": 123.45,
                "total_duration": 155,
                "flights": [{
                    "airline": "Test Air",
                    "departure_airport": {"time": "08:00"},
                    "arrival_airport": {"time": "10:35"},
                }],
            }],
        })

    results = SearchApiFlightsScraper(api_key="test-key", requester=requester).search("DUB", "CDG", date(2026, 8, 1), 1)
    assert len(results) == 1
    assert results[0].price == 108.64
    assert results[0].currency == "EUR"
    assert results[0].duration == "2h 35m"
    assert results[0].airline == "Test Air"


def test_successful_empty_search_does_not_return_demo_data():
    class EmptyScraper:
        def search(self, *args):
            return []

    request = SearchRequest(origin="DUB", destination="CDG", departure_date=date(2026, 8, 1))
    source, results, message, status = FlightSearchService(EmptyScraper()).search(request)
    assert source == "live"
    assert results == []
    assert "No itineraries" in message
    assert status == "not_applied"
