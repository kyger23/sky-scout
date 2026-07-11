import React, { useState } from 'react'
import WorldMap from './WorldMap'
import { getRecommendations } from './recommendations'

const initialResults = [
  { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
  { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
  { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
  { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
]

export default function App() {
  const [location, setLocation] = useState('Dublin, Ireland')
  const [budget, setBudget] = useState('500')
  const [countries, setCountries] = useState(initialResults)
  const [selectedCountry, setSelectedCountry] = useState(initialResults[0])
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
        <div className="map-wrap"><WorldMap countries={countries} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} /></div>
      </section>

      <section className="results" aria-label="Recommended destinations">
        <div className="result-heading"><p className="eyebrow">YOUR SHORTLIST</p><h2>Made for your map</h2></div>
        <div className="destination-grid">
          {countries.map((country, index) => <button className={`destination ${selectedCountry?.code === country.code ? 'active' : ''}`} key={country.code} onClick={() => setSelectedCountry(country)}>
            <span className="number">0{index + 1}</span><span className="swatch" style={{ background: country.color }} />
            <span className="destination-copy"><strong>{country.name}</strong><small>{country.note}</small></span><span className="price">from €{country.fromPrice}</span>
          </button>)}
        </div>
      </section>
    </main>
  )
}
