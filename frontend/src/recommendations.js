const budgetTiers = [
  {
    max: 100,
    countries: [
      { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 79, note: 'Marrakech medinas on a shoestring' },
      { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 95, note: "Porto's budget river views" },
    ],
  },
  {
    max: 200,
    countries: [
      { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
      { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
    ],
  },
  {
    max: 300,
    countries: [
      { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
      { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
      { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
    ],
  },
  {
    max: 400,
    countries: [
      { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
      { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
      { name: 'Spain', code: 'ESP', color: '#f2789f', fromPrice: 265, note: 'Tapas trails & Balearic beaches' },
      { name: 'Italy', code: 'ITA', color: '#5fb0e8', fromPrice: 320, note: 'Trattorias & Tuscan hillsides' },
    ],
  },
  {
    max: 500,
    countries: [
      { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
      { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
      { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
      { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
    ],
  },
  {
    max: 600,
    countries: [
      { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
      { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
      { name: 'Spain', code: 'ESP', color: '#f2789f', fromPrice: 265, note: 'Tapas trails & Balearic beaches' },
      { name: 'Italy', code: 'ITA', color: '#5fb0e8', fromPrice: 320, note: 'Trattorias & Tuscan hillsides' },
      { name: 'France', code: 'FRA', color: '#f2c14e', fromPrice: 340, note: 'Alpine peaks & Riviera coastlines' },
    ],
  },
]

export function demoCountriesForBudget(budget) {
  const amount = Number(budget)
  if (!Number.isFinite(amount)) return []
  const tier = [...budgetTiers].reverse().find((item) => amount >= item.max)
  return tier ? tier.countries : []
}

export async function getRecommendations({ location, budget }) {
  const endpoint = import.meta.env.VITE_RECOMMENDATIONS_API_URL

  if (!endpoint) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { countries: demoCountriesForBudget(budget), isDemo: true }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, budget: Number(budget) }),
  })

  if (!response.ok) throw new Error('Could not find destinations right now.')
  const data = await response.json()
  return { countries: data.countries ?? [], isDemo: false }
}
