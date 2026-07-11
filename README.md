# Sky Scout

Hackathon-ready FastAPI service for one-way, flexible-date flight searches.

## Local development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Run tests with `pytest`.

## API

`GET /health` verifies availability. `POST /search` accepts one-way searches and searches the requested departure date plus `flex_days` following dates (maximum seven).

```json
{"origin":"DUB","destination":"CDG","departure_date":"2026-08-01","flex_days":2,"passengers":1}
```

Responses label their source as `live`, `cache`, or `demo_fallback`. Demo fallback results are returned only when Google Flights is unavailable.

## Render

Connect the repository in Render using **New > Blueprint**. `render.yaml` installs dependencies and launches Uvicorn on Render's assigned `PORT`. Free instances can cold-start and clear the in-memory cache after restarts; Google Flights can rate-limit searches.