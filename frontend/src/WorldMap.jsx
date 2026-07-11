import React, { useEffect, useRef, useState } from 'react'
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre'

const COUNTRIES_GEOJSON = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
const ISO_A3_PROPERTY = 'ISO3166-1-Alpha-3'
const EUROPE_VIEW = { longitude: 9, latitude: 45, zoom: 3.4 }

function ringArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

function bboxCenter(points) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  points.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
}

// Countries like Portugal (Azores, Madeira) or France (overseas territories) are
// MultiPolygons where a plain bounding box across every part gets dragged toward
// distant islands. Pin the mainland instead: the polygon with the largest area.
function centroidOf(geometry) {
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates
    : geometry.type === 'Polygon' ? [geometry.coordinates]
    : []
  if (!polygons.length) return null
  const mainland = polygons.reduce((best, polygon) => {
    const area = ringArea(polygon[0])
    return !best || area > best.area ? { polygon, area } : best
  }, null)
  return bboxCenter(mainland.polygon[0])
}

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
  const [centroids, setCentroids] = useState({})

  useEffect(() => {
    let cancelled = false
    fetch(COUNTRIES_GEOJSON)
      .then((response) => response.json())
      .then((geojson) => {
        if (cancelled) return
        const next = {}
        geojson.features.forEach((feature) => {
          const code = feature.properties?.[ISO_A3_PROPERTY]
          const centroid = code && centroidOf(feature.geometry)
          if (code && centroid) next[code] = centroid
        })
        setCentroids(next)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <Map
      ref={mapRef}
      initialViewState={EUROPE_VIEW}
      minZoom={EUROPE_VIEW.zoom}
      maxZoom={EUROPE_VIEW.zoom}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoomRotate={false}
      boxZoom={false}
      dragRotate={false}
      dragPan={false}
      keyboard={false}
      mapStyle={mapStyle}
      interactiveLayerIds={[countryLayer.id]}
      onClick={(event) => {
        const country = event.features?.[0]?.properties
        const selected = countries.find((item) => item.code === country?.[ISO_A3_PROPERTY])
        if (selected) onSelectCountry(selected)
      }}
    >
      <Source id="recommended-countries-source" type="geojson" data={COUNTRIES_GEOJSON}>
        <Layer {...countryLayer} paint={{ ...countryLayer.paint, 'fill-color': ['match', ['get', ISO_A3_PROPERTY], ...countries.flatMap((country) => [country.code, country.color]), 'transparent'] }} />
        <Layer {...borderLayer} filter={['in', ['get', ISO_A3_PROPERTY], ['literal', countries.map((country) => country.code)]]} />
      </Source>
      {countries.map((country) => {
        const centroid = centroids[country.code]
        if (!centroid) return null
        const isActive = selectedCountry?.code === country.code
        return (
          <Marker
            key={country.code}
            longitude={centroid[0]}
            latitude={centroid[1]}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation()
              onSelectCountry(country)
            }}
          >
            <span className={`map-pin ${isActive ? 'active' : ''}`} style={{ '--pin-color': country.color }} />
          </Marker>
        )
      })}
      {selectedCountry && <div className="map-callout">{selectedCountry.name}</div>}
    </Map>
  )
}
