const DEFAULT_BASE_URL = 'https://sky-scout-2lr6.onrender.com'

const DESTINATIONS = [
  { name: 'Portugal', code: 'PRT', color: '#ffb15c', airport: 'LIS', note: 'Sunlit cities & Atlantic coast' },
  { name: 'Morocco', code: 'MAR', color: '#ea6a47', airport: 'RAK', note: 'Markets, mountains & mint tea' },
  { name: 'Croatia', code: 'HRV', color: '#83d3bd', airport: 'SPU', note: 'Island-hopping on the Adriatic' },
  { name: 'Greece', code: 'GRC', color: '#8374f2', airport: 'ATH', note: 'Ancient ruins & island sunsets' },
  { name: 'Spain', code: 'ESP', color: '#f2789f', airport: 'MAD', note: 'Tapas trails & Balearic beaches' },
  { name: 'Italy', code: 'ITA', color: '#5fb0e8', airport: 'FCO', note: 'Trattorias & Tuscan hillsides' },
  { name: 'France', code: 'FRA', color: '#f2c14e', airport: 'CDG', note: 'Alpine peaks & Riviera coastlines' },
]

// Fallback sample data, used only if the live backend can't be reached at all.
const budgetTiers = [
  { max: 100, countries: [
    { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 79, note: 'Marrakech medinas on a shoestring' },
    { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 95, note: "Porto's budget river views" },
  ] },
  { max: 200, countries: [
    { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
    { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
  ] },
  { max: 300, countries: [
    { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
    { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
    { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
  ] },
  { max: 400, countries: [
    { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
    { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
    { name: 'Spain', code: 'ESP', color: '#f2789f', fromPrice: 265, note: 'Tapas trails & Balearic beaches' },
    { name: 'Italy', code: 'ITA', color: '#5fb0e8', fromPrice: 320, note: 'Trattorias & Tuscan hillsides' },
  ] },
  { max: 500, countries: [
    { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
    { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
    { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
    { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
  ] },
  { max: 600, countries: [
    { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
    { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
    { name: 'Spain', code: 'ESP', color: '#f2789f', fromPrice: 265, note: 'Tapas trails & Balearic beaches' },
    { name: 'Italy', code: 'ITA', color: '#5fb0e8', fromPrice: 320, note: 'Trattorias & Tuscan hillsides' },
    { name: 'France', code: 'FRA', color: '#f2c14e', fromPrice: 340, note: 'Alpine peaks & Riviera coastlines' },
  ] },
]

export function demoCountriesForBudget(budget) {
  const amount = Number(budget)
  if (!Number.isFinite(amount)) return []
  const tier = [...budgetTiers].reverse().find((item) => amount >= item.max)
  return tier ? tier.countries : []
}

// Common departure cities mapped to their main IATA airport code.
const CITY_TO_IATA = {
  dublin: 'DUB', london: 'LHR', paris: 'CDG', berlin: 'BER', munich: 'MUC',
  madrid: 'MAD', barcelona: 'BCN', rome: 'FCO', milan: 'MXP', amsterdam: 'AMS',
  brussels: 'BRU', vienna: 'VIE', zurich: 'ZRH', lisbon: 'LIS', copenhagen: 'CPH',
  stockholm: 'ARN', oslo: 'OSL', warsaw: 'WAW', prague: 'PRG', budapest: 'BUD',
  athens: 'ATH', edinburgh: 'EDI', manchester: 'MAN', frankfurt: 'FRA',
  'new york': 'JFK',
}

export function resolveOriginCode(location) {
  const trimmed = location.trim()
  if (/^[a-zA-Z]{3}$/.test(trimmed)) return trimmed.toUpperCase()
  const city = trimmed.split(',')[0].trim().toLowerCase()
  return CITY_TO_IATA[city] ?? null
}

async function searchDestination({ baseUrl, origin, destination, departureDate, budget }) {
  const response = await fetch(`${baseUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination: destination.airport,
      departure_date: departureDate,
      flex_days: 2,
      passengers: 1,
      ...(budget ? { max_budget_eur: Number(budget) } : {}),
    }),
  })
  if (!response.ok) return null
  const data = await response.json()
  const cheapest = data.itineraries?.[0]
  if (!cheapest) return null
  return {
    name: destination.name,
    code: destination.code,
    color: destination.color,
    note: destination.note,
    fromPrice: cheapest.price,
    budgetStatus: data.budget_status,
    source: data.source,
  }
}

export async function getRecommendations({ location, budget, departureDate }) {
  const baseUrl = import.meta.env.VITE_RECOMMENDATIONS_API_URL || DEFAULT_BASE_URL

  const origin = resolveOriginCode(location)
  if (!origin) {
    throw new Error(`We don't recognize "${location}" as a departure city yet — try a major city name or a 3-letter airport code.`)
  }

  const settled = await Promise.allSettled(
    DESTINATIONS.filter((destination) => destination.airport !== origin).map((destination) =>
      searchDestination({ baseUrl, origin, destination, departureDate, budget })
    )
  )

  const found = settled.filter((result) => result.status === 'fulfilled' && result.value).map((result) => result.value)

  if (!found.length) {
    return {
      countries: demoCountriesForBudget(budget),
      isDemo: true,
      sourceNote: 'Backend unavailable — showing sample destinations.',
    }
  }

  const countries = found
    .filter((entry) => entry.budgetStatus !== 'exceeded')
    .sort((a, b) => a.fromPrice - b.fromPrice)

  const usedDemoFallback = found.some((entry) => entry.source === 'demo_fallback')

  return {
    countries,
    isDemo: usedDemoFallback,
    sourceNote: usedDemoFallback ? 'Some prices are demo estimates — live pricing is temporarily unavailable.' : null,
  }
}
