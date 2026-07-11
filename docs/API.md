# Sky Scout Backend API

## Base URL and interactive documentation

Run the service locally at `http://localhost:8000`; use the deployed Render URL in production. FastAPI exposes interactive Swagger documentation at `/docs` and an OpenAPI document at `/openapi.json`.

All prices are returned in EUR. Sky Scout uses the fixed conversion 1 USD = 0.88 EUR; it does not request live exchange rates.

Live flight results come from SearchAPI's Google Flights engine. Set the SEARCHAPI_API_KEY environment variable locally and in Render; never put the key in requests from the frontend or commit it to Git.

## `GET /health`

Checks whether the service is available.

```json
{"status":"ok"}
```

## `POST /search`

Searches one-way flights for the requested departure date and up to seven following dates.

### Request body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `origin` | string | Yes | Three-letter IATA airport code, for example `DUB`. |
| `destination` | string | Yes | Three-letter IATA airport code different from `origin`. |
| `departure_date` | date | Yes | ISO date, for example `2026-08-01`. |
| `flex_days` | integer | No | `0` through `7`; defaults to `0`. |
| `passengers` | integer | No | `1` through `9`; defaults to `1`. |
| `max_budget_eur` | number | No | Positive quoted-trip-total budget in EUR. |

```json
{"origin":"DUB","destination":"CDG","departure_date":"2026-08-01","flex_days":2,"passengers":1,"max_budget_eur":180}
```

### Response fields

| Field | Meaning |
| --- | --- |
| `source` | `live` for Google Flights data supplied by SearchAPI, `cache` for a fresh in-memory result, or `demo_fallback` when SearchAPI is unavailable. |
| `budget_status` | `not_applied` when no budget was provided, `matched` when returned flights meet it, or `exceeded` when only the cheapest over-budget result is returned. |
| `itineraries` | Price-ranked flight options. Each price is in EUR. |
| `message` | Optional explanation, including live-source fallback or an over-budget notice. |

### Budget-matched response

```json
{"origin":"DUB","destination":"CDG","departure_date":"2026-08-01","flex_days":2,"max_budget_eur":180,"budget_status":"matched","source":"live","itineraries":[{"departure_date":"2026-08-01","price":131.12,"currency":"EUR","airline":"Example Air","departure_time":"08:10","arrival_time":"10:35","duration":"2h 25m","stops":0,"booking_url":null}],"message":null}
```

### Over-budget response

When every result exceeds the supplied limit, the API still returns HTTP 200 and one cheapest alternative so the UI can show a useful fallback.

```json
{"max_budget_eur":100,"budget_status":"exceeded","source":"cache","itineraries":[{"departure_date":"2026-08-01","price":131.12,"currency":"EUR","airline":"Example Air"}],"message":"No itineraries meet the €100.00 budget; showing the cheapest option at €131.12."}
```

### Validation and fallback behavior

- Invalid airport codes, equal origin/destination, invalid dates, passenger counts outside 1–9, `flex_days` outside 0–7, and zero/negative budgets return HTTP 422.
- A `demo_fallback` response is explicitly labeled and must not be presented as live pricing.