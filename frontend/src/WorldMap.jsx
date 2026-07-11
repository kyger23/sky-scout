import React, { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import { EUROPEAN_COUNTRY_CODES } from "./recommendations";

const COUNTRIES_GEOJSON =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

const destinationCoordinates = {
  PRT: [-9.14, 38.72],
  ITA: [12.5, 41.9],
  HRV: [15.98, 45.81],
  GRC: [23.73, 37.98],
};

const countryDetails = {
  PRT: {
    images: [
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    ],
    activities: [
      "Lisbon: Ride Tram 28 through Alfama",
      "Porto: Walk the Ribeira waterfront",
      "Sintra: Explore Pena Palace",
      "Douro Valley: Vineyard river cruise",
      "Ericeira: Atlantic surf lessons",
    ],
  },
  ITA: {
    images: [
      "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    ],
    activities: [
      "Rome: Colosseum and Forum walk",
      "Florence: Duomo and Uffizi highlights",
      "Venice: Grand Canal and Rialto",
      "Amalfi Coast: Scenic coastal drive",
      "Cinque Terre: Cliffside village trail",
    ],
  },
  HRV: {
    images: [
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80",
    ],
    activities: [
      "Dubrovnik: City walls and Old Town",
      "Split: Diocletian's Palace",
      "Plitvice Lakes: National park trails",
      "Hvar: Island hopping boat day",
      "Zadar: Sea Organ at dusk",
    ],
  },
  GRC: {
    images: [
      "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=800&q=80",
    ],
    activities: [
      "Athens: Acropolis and Parthenon",
      "Santorini: Caldera cliff walk",
      "Crete: Knossos Palace tour",
      "Naxos: Beach and mountain villages",
      "Delphi: Sanctuary of Apollo",
    ],
  },
};

const originCoordinates = {
  dublin: [-6.26, 53.35],
  london: [-0.13, 51.51],
  paris: [2.35, 48.86],
  amsterdam: [4.9, 52.37],
  berlin: [13.41, 52.52],
  madrid: [-3.7, 40.42],
  rome: [12.5, 41.9],
};

const mapStyle = {
  version: 8,
  sources: {
    openstreetmap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "openstreetmap", type: "raster", source: "openstreetmap" }],
};

const countryLayer = {
  id: "recommended-countries",
  type: "fill",
  paint: { "fill-color": "#ffb15c", "fill-opacity": 0.65 },
};
const borderLayer = {
  id: "recommended-country-borders",
  type: "line",
  paint: { "line-color": "#fff7e8", "line-width": 1.8, "line-opacity": 1 },
};
const routeGlowLayer = {
  id: "route-glow",
  type: "line",
  paint: {
    "line-color": ["get", "color"],
    "line-width": 5,
    "line-opacity": 0.25,
    "line-blur": 3,
  },
};
const routeLayer = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": ["get", "color"],
    "line-width": 1.5,
    "line-opacity": 0.9,
    "line-dasharray": [2, 2],
  },
};
const countryCodeExpression = [
  "coalesce",
  ["get", "ISO3166-1-Alpha-3"],
  ["get", "ISO_A3"],
];
const fallbackColors = [
  "#ffb15c",
  "#ea6a47",
  "#83d3bd",
  "#8374f2",
  "#54b8ff",
  "#f08a5d",
];

function getOrigin(location) {
  const city = location.split(",")[0].trim().toLowerCase();
  return originCoordinates[city] ?? originCoordinates.dublin;
}

function mercatorY(latitude) {
  const radians = latitude * (Math.PI / 180);
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function latitudeFromMercatorY(value) {
  return (2 * Math.atan(Math.exp(value)) - Math.PI / 2) * (180 / Math.PI);
}

function formatDate(dateValue) {
  if (!dateValue) return "Not set";
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fallbackSlideImage(countryName) {
  const label = encodeURIComponent(`${countryName} view unavailable`);
  return `https://placehold.co/1200x700/183250/e9f1f5?text=${label}`;
}

function MovingDot({ from, to, delay, color }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame;
    const startedAt = performance.now() + delay;
    const animate = (now) => {
      setProgress(Math.max(0, ((now - startedAt) % 7000) / 7000));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [delay]);

  const fromY = mercatorY(from[1]);
  const toY = mercatorY(to[1]);
  const longitude = from[0] + (to[0] - from[0]) * progress;
  const latitude = latitudeFromMercatorY(fromY + (toY - fromY) * progress);
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <span
        className="moving-dot"
        style={{ "--dot-color": color }}
        aria-hidden="true"
      />
    </Marker>
  );
}

export default function WorldMap({
  countries,
  location,
  leaveDate,
  returnDate,
  selectedCountry,
  onSelectCountry,
}) {
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const origin = getOrigin(location);
  const styledCountries = useMemo(
    () =>
      countries
        .map((country, index) => {
          const normalizedCode = String(country.code ?? "").toUpperCase();
          return {
            ...country,
            code: normalizedCode,
            color:
              country.color ?? fallbackColors[index % fallbackColors.length],
            coordinates:
              country.coordinates ?? destinationCoordinates[normalizedCode],
          };
        })
        .filter((country) => EUROPEAN_COUNTRY_CODES.has(country.code)),
    [countries],
  );
  const destinations = styledCountries.filter((country) => country.coordinates);
  const countryFillColor = useMemo(() => {
    if (styledCountries.length === 0) return "transparent";
    return [
      "match",
      countryCodeExpression,
      ...styledCountries.flatMap((country) => [country.code, country.color]),
      "transparent",
    ];
  }, [styledCountries]);
  const routes = useMemo(
    () => ({
      type: "FeatureCollection",
      features: destinations.map((country) => ({
        type: "Feature",
        properties: { color: country.color },
        geometry: {
          type: "LineString",
          coordinates: [origin, country.coordinates],
        },
      })),
    }),
    [destinations, origin],
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [isSlideLoading, setIsSlideLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || destinations.length === 0) return;

    const points = [
      origin,
      ...destinations.map((country) => country.coordinates),
    ];
    const longitudes = points.map((point) => point[0]);
    const latitudes = points.map((point) => point[1]);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);

    const isMobile = window.innerWidth <= 800;
    mapRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        duration: 1100,
        padding: isMobile
          ? { top: 180, right: 36, bottom: 44, left: 36 }
          : { top: 52, right: 420, bottom: 56, left: 56 },
      },
    );
  }, [destinations, origin]);

  useEffect(() => {
    setSlideIndex(0);
  }, [selectedCountry?.code]);

  const selectedImages = useMemo(() => {
    if (!selectedCountry) return [];
    const details = countryDetails[selectedCountry.code] ?? {};
    return details.images ?? [];
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedImages.length < 2) return undefined;
    const timer = setInterval(() => {
      setSlideIndex((current) => (current + 1) % selectedImages.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [selectedImages]);

  useEffect(() => {
    if (selectedImages.length === 0) return;
    setIsSlideLoading(true);
  }, [selectedCountry?.code, slideIndex, selectedImages.length]);

  useEffect(() => {
    if (!selectedCountry) return undefined;

    const handleOutsideClick = (event) => {
      if (popupRef.current?.contains(event.target)) return;
      onSelectCountry(null);
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [selectedCountry, onSelectCountry]);

  return (
    <div className="world-map">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 12, latitude: 53, zoom: 3.2 }}
        maxBounds={[
          [-31, 32],
          [45, 72],
        ]}
        minZoom={2.8}
        mapStyle={mapStyle}
        interactiveLayerIds={[countryLayer.id]}
        onClick={(event) => {
          const clicked = styledCountries.find(
            (country) =>
              country.code ===
              (event.features?.[0]?.properties?.["ISO3166-1-Alpha-3"] ??
                event.features?.[0]?.properties?.ISO_A3),
          );
          if (clicked) onSelectCountry(clicked);
        }}
      >
        <Source
          id="recommended-countries-source"
          type="geojson"
          data={COUNTRIES_GEOJSON}
        >
          <Layer
            {...countryLayer}
            paint={{
              ...countryLayer.paint,
              "fill-color": countryFillColor,
            }}
          />
          <Layer
            {...borderLayer}
            filter={[
              "in",
              countryCodeExpression,
              ["literal", styledCountries.map((country) => country.code)],
            ]}
          />
        </Source>
        <Source id="route-source" type="geojson" data={routes}>
          <Layer {...routeGlowLayer} />
          <Layer {...routeLayer} />
        </Source>
        {destinations.map((country, index) => (
          <React.Fragment key={country.code}>
            <Marker
              longitude={country.coordinates[0]}
              latitude={country.coordinates[1]}
              anchor="bottom"
            >
              <button
                className="destination-pin"
                type="button"
                aria-label={`${country.name}, from €${country.fromPrice}`}
                onClick={() => onSelectCountry(country)}
              >
                <span style={{ background: country.color }} />
                <b>{country.name}</b>
                <small>from €{country.fromPrice}</small>
              </button>
            </Marker>
            <MovingDot
              from={origin}
              to={country.coordinates}
              delay={index * 1300}
              color={country.color}
            />
          </React.Fragment>
        ))}
        {destinations.length > 0 && (
          <Marker longitude={origin[0]} latitude={origin[1]} anchor="center">
            <span className="origin-marker" aria-label="Departure point" />
          </Marker>
        )}
      </Map>
      {selectedCountry && (
        <aside
          ref={popupRef}
          className="country-popup"
          aria-label={`${selectedCountry.name} trip ideas`}
        >
          <button
            className="country-popup-close"
            type="button"
            aria-label="Close country details"
            onClick={() => onSelectCountry(null)}
          >
            <span aria-hidden="true">X</span>
          </button>
          {selectedImages.length > 0 && (
            <div
              className="country-slideshow"
              aria-label={`${selectedCountry.name} image slideshow`}
            >
              <div
                className={`slide-skeleton${isSlideLoading ? " visible" : ""}`}
                aria-hidden="true"
              />
              <img
                className={`slide-image${isSlideLoading ? " loading" : ""}`}
                src={selectedImages[slideIndex % selectedImages.length]}
                alt={`${selectedCountry.name} view ${
                  (slideIndex % selectedImages.length) + 1
                }`}
                loading="eager"
                onLoad={() => setIsSlideLoading(false)}
                onError={(event) => {
                  setIsSlideLoading(false);
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackSlideImage(
                    selectedCountry.name,
                  );
                }}
              />
              {selectedImages.length > 1 && (
                <>
                  <button
                    className="slide-nav prev"
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setSlideIndex(
                        (current) =>
                          (current - 1 + selectedImages.length) %
                          selectedImages.length,
                      )
                    }
                  >
                    ‹
                  </button>
                  <button
                    className="slide-nav next"
                    type="button"
                    aria-label="Next photo"
                    onClick={() =>
                      setSlideIndex(
                        (current) => (current + 1) % selectedImages.length,
                      )
                    }
                  >
                    ›
                  </button>
                  <div className="slide-dots" aria-hidden="true">
                    {selectedImages.map((imageUrl, index) => (
                      <span
                        key={imageUrl}
                        className={
                          index === slideIndex % selectedImages.length
                            ? "active"
                            : ""
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="country-popup-copy">
            <p>EXPLORE {selectedCountry.name.toUpperCase()}</p>
            <strong>{selectedCountry.name}</strong>
            <small>from €{selectedCountry.fromPrice}</small>
            <div className="trip-dates" aria-label="Trip dates">
              <span>
                <b>Leave:</b> {formatDate(leaveDate)}
              </span>
              <span>
                <b>Return:</b> {formatDate(returnDate)}
              </span>
            </div>
            <div className="activity-tags">
              {(
                countryDetails[selectedCountry.code]?.activities ?? [
                  "Old town walking tour",
                  "Signature food tasting",
                  "Scenic coastal lookout",
                  "Museum and culture stop",
                  "Sunset photo spots",
                ]
              ).map((activity) => (
                <span key={activity}>{activity}</span>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
