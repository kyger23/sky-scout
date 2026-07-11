const demoCountries = [
  { name: 'Portugal', code: 'PRT', color: '#ffb15c', fromPrice: 175, note: 'Sunlit cities & Atlantic coast' },
  { name: 'Morocco', code: 'MAR', color: '#ea6a47', fromPrice: 198, note: 'Markets, mountains & mint tea' },
  { name: 'Croatia', code: 'HRV', color: '#83d3bd', fromPrice: 215, note: 'Island-hopping on the Adriatic' },
  { name: 'Greece', code: 'GRC', color: '#8374f2', fromPrice: 230, note: 'Ancient ruins & island sunsets' },
]

export async function getRecommendations({ location, budget }) {
  const endpoint = import.meta.env.VITE_RECOMMENDATIONS_API_URL

  if (!endpoint) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { countries: demoCountries, isDemo: true }
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
