import React, { useRef, useState } from "react";
import WorldMap from "./WorldMap";
import { getRecommendations } from "./recommendations";

export default function App() {
  const [location, setLocation] = useState("Dublin, Ireland");
  const [budget, setBudget] = useState("500");
  const [leaveDate, setLeaveDate] = useState("2026-09-10");
  const [returnDate, setReturnDate] = useState("2026-09-17");
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [status, setStatus] = useState(
    "Choose your departure point and budget to reveal destinations.",
  );
  const [isDemo, setIsDemo] = useState(true);
  const [panelPosition, setPanelPosition] = useState(null);
  const panelRef = useRef(null);
  const latestSearchRef = useRef(0);

  function startPanelDrag(event) {
    if (window.matchMedia("(max-width: 900px)").matches) return;
    event.preventDefault();
    const bounds = panelRef.current.getBoundingClientRect();
    const offset = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const move = (moveEvent) =>
      setPanelPosition({
        left: Math.max(
          8,
          Math.min(window.innerWidth - 80, moveEvent.clientX - offset.x),
        ),
        top: Math.max(
          8,
          Math.min(window.innerHeight - 80, moveEvent.clientY - offset.y),
        ),
      });
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const searchId = latestSearchRef.current + 1;
    latestSearchRef.current = searchId;

    setCountries([]);
    setSelectedCountry(null);
    setStatus("Searching the skies…");

    try {
      const result = await getRecommendations({ location, budget });

      // Ignore stale responses so previous searches cannot repaint old highlights.
      if (latestSearchRef.current !== searchId) return;

      setCountries(result.countries);
      setIsDemo(result.isDemo);
      setStatus(
        result.countries.length
          ? `${result.countries.length} destinations found within your budget.`
          : "No destinations found for that budget.",
      );
    } catch (error) {
      if (latestSearchRef.current !== searchId) return;
      setStatus(error.message);
    }
  }

  return (
    <main>
      <section className="hero">
        <div
          className="intro"
          ref={panelRef}
          style={
            panelPosition
              ? {
                  left: panelPosition.left,
                  top: panelPosition.top,
                  transform: "none",
                }
              : undefined
          }
        >
          <button
            className="panel-drag-handle"
            type="button"
            aria-label="Drag flight selection panel"
            onPointerDown={startPanelDrag}
          >
            ⠿
          </button>
          <p className="eyebrow">
            SKY SCOUT <span>✦</span> YOUR NEXT ESCAPE
          </p>
          <h1>
            Where will your
            <br />
            <em>budget</em> take you?
          </h1>
          <p className="lede">
            Tell us where you are and what you want to spend. We’ll surface
            countries worth your next stamp.
          </p>
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span className="field-label">Flying from</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or airport"
                required
              />
            </label>
            <label className="form-field">
              <span className="field-label">Total budget</span>
              <div className="budget-input">
                <span>€</span>
                <input
                  type="number"
                  min="1"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  required
                />
              </div>
            </label>
            <div className="date-field-row">
              <label className="form-field">
                <span className="field-label">Leave date</span>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(event) => {
                    const nextLeaveDate = event.target.value;
                    setLeaveDate(nextLeaveDate);
                    if (returnDate && returnDate < nextLeaveDate)
                      setReturnDate(nextLeaveDate);
                  }}
                  required
                />
              </label>
              <label className="form-field">
                <span className="field-label">Return date</span>
                <input
                  type="date"
                  min={leaveDate}
                  value={returnDate}
                  onChange={(event) => setReturnDate(event.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit">
              Scout destinations <span>→</span>
            </button>
          </form>
          {status && (
            <p className="status" role="status">
              {status}
            </p>
          )}
          {isDemo && (
            <p className="demo-note">
              Sample destination pricing is shown until an API endpoint is
              connected.
            </p>
          )}
        </div>
        <div className="map-wrap">
          <WorldMap
            countries={countries}
            location={location}
            leaveDate={leaveDate}
            returnDate={returnDate}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </div>
      </section>
    </main>
  );
}
