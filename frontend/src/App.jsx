import React, { useState } from 'react'
import WorldMap from './WorldMap'
import { getRecommendations, demoCountriesForBudget } from './recommendations'

const initialBudget = '500'
const initialResults = demoCountriesForBudget(initialBudget)

export default function App() {
  const [location, setLocation] = useState('Dublin, Ireland')
  const [budget, setBudget] = useState(initialBudget)
  const [countries, setCountries] = useState(initialResults)
  const [selectedCountry, setSelectedCountry] = useState(initialResults[0] ?? null)
  const [status, setStatus] = useState('')
  const [isDemo, setIsDemo] = useState(true)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('Searching the skies…')
    try {
      const result = await getRecommendations({ location, budget })
      setCountries(result.countries)
      setSelectedCountry(result.countries[0] ?? null)
      setIsDemo(result.isDemo)
      setStatus(result.countries.length ? '' : 'No destinations found for that budget.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="map-wrap"><WorldMap countries={countries} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} /></div>
        <div className="intro">
          <p className="eyebrow">SKY SCOUT <span>✦</span> YOUR NEXT ESCAPE</p>
          <h1>Where will your<br /><em>budget</em> take you?</h1>
          <p className="lede">Tell us where you are and what you want to spend. We’ll surface countries worth your next stamp.</p>
          <form onSubmit={handleSubmit}>
            <label>Flying from<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or airport" required /></label>
            <label>Your total budget<div className="budget-input"><span>€</span><input type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} required /></div></label>
            <button type="submit">Scout destinations <span>→</span></button>
          </form>
          {status && <p className="status" role="status">{status}</p>}
          {isDemo && <p className="demo-note">Showing sample destinations — connect your API endpoint when ready.</p>}
        </div>
      </section>
    </main>
  )
}
