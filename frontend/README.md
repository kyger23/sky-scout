# Sky Scout

A React + MapLibre travel discovery experience. Users enter their starting point and total budget; the recommendations API returns countries, which are highlighted on the world map in their assigned colours.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

No map token is needed. The app uses [MapLibre GL JS](https://maplibre.org/) with OpenStreetMap tiles and open country-boundary data. Keep the required OpenStreetMap attribution visible, and use a dedicated tile provider or self-host tiles before high-traffic production use.

## Connect the recommendations API

Set `VITE_RECOMMENDATIONS_API_URL` to the endpoint. Sky Scout sends:

```json
{ "location": "Dublin, Ireland", "budget": 500 }
```

The response should have this shape:

```json
{
  "countries": [
    {
      "name": "Portugal",
      "code": "PRT",
      "color": "#FFB15C",
      "fromPrice": 175,
      "note": "Sunlit cities & Atlantic coast"
    }
  ]
}
```

`code` must be the ISO 3166-1 alpha-3 country code, which the map uses to colour the corresponding boundary. Without an endpoint, the app deliberately shows sample results so the user flow remains easy to explore.
