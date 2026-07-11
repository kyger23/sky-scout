from fastapi.testclient import TestClient
from main import app
client = TestClient(app)

def test_health():
    assert client.get("/health").json() == {"status": "ok"}

def test_invalid_airport_is_rejected():
    response = client.post("/search", json={"origin":"Dublin","destination":"CDG","departure_date":"2026-08-01"})
    assert response.status_code == 422

def test_non_positive_budget_is_rejected():
    response = client.post("/search", json={"origin":"DUB","destination":"CDG","departure_date":"2026-08-01","max_budget_eur":0})
    assert response.status_code == 422