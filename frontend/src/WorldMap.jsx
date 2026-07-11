import React, { useRef } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'

const COUNTRIES_GEOJSON = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'

const mapStyle = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'openstreetmap', type: 'raster', source: 'openstreetmap' }],
}

const countryLayer = {
  id: 'recommended-countries',
  type: 'fill',
  paint: { 'fill-color': '#ffb15c', 'fill-opacity': 0.72 },
}

const borderLayer = {
  id: 'recommended-country-borders',
  type: 'line',
  paint: { 'line-color': '#fff7e8', 'line-width': 1.4, 'line-opacity': 0.9 },
}

export default function WorldMap({ countries, onSelectCountry, selectedCountry }) {
  const mapRef = useRef(null)

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 8, latitude: 25, zoom: 1.3 }}
      mapStyle={mapStyle}
      interactiveLayerIds={[countryLayer.id]}
      onClick={(event) => {
        const country = event.features?.[0]?.properties
        const selected = countries.find((item) => item.code === country?.ISO_A3)
        if (selected) onSelectCountry(selected)
      }}
    >
      <Source id="recommended-countries-source" type="geojson" data={COUNTRIES_GEOJSON}>
        <Layer {...countryLayer} paint={{ ...countryLayer.paint, 'fill-color': ['match', ['get', 'ISO_A3'], ...countries.flatMap((country) => [country.code, country.color]), 'transparent'] }} />
        <Layer {...borderLayer} filter={['in', ['get', 'ISO_A3'], ['literal', countries.map((country) => country.code)]]} />
      </Source>
      {selectedCountry && <div className="map-callout">{selectedCountry.name}</div>}
    </Map>
  )
}
