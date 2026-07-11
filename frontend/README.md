# Sky Scout

A React + MapLibre travel discovery experience. Users enter their starting point and total budget; the recommendations API returns countries, which are highlighted on the world map in their assigned colours.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

No map token is needed. The app uses [MapLibre GL JS](https://maplibre.org/) with OpenStreetMap tiles and open country-boundary data. Keep the required OpenStreetMap attribution visible, and use a dedicated tile provider or self-host tiles before high-traffic production use.

## Flight-search backend

Sky Scout talks to the [Sky Scout Backend API](https://sky-scout-2lr6.onrender.com) (FastAPI, `POST /search`), which searches one-way flights for a single origin/destination/date rather than returning "countries within budget" directly. To keep the browse-by-country experience, the frontend fans out a `/search` call per destination in a fixed shortlist (`src/recommendations.js`) — Portugal (LIS), Morocco (RAK), Croatia (SPU), Greece (ATH), Spain (MAD), Italy (FCO), France (CDG) — using the entered departure city, date, and budget, then keeps whichever destinations report `budget_status !== "exceeded"`.

Set `VITE_RECOMMENDATIONS_API_URL` to point at a different backend instance; it defaults to the deployed Render URL above.

The "Flying from" field accepts a major city name (mapped to its main airport via a small lookup table in `resolveOriginCode`) or a 3-letter IATA code directly. If the live backend is unreachable entirely, the app falls back to local sample data and labels it as such — matching the API's own `demo_fallback` source label, which is never presented as live pricing.
