export const EUROPEAN_COUNTRY_CODES = new Set([
  "ALB",
  "AND",
  "AUT",
  "BEL",
  "BIH",
  "BGR",
  "BLR",
  "CHE",
  "CYP",
  "CZE",
  "DEU",
  "DNK",
  "ESP",
  "EST",
  "FIN",
  "FRA",
  "GBR",
  "GRC",
  "HRV",
  "HUN",
  "IRL",
  "ISL",
  "ITA",
  "LIE",
  "LTU",
  "LUX",
  "LVA",
  "MDA",
  "MKD",
  "MLT",
  "MNE",
  "NLD",
  "NOR",
  "POL",
  "PRT",
  "ROU",
  "SRB",
  "SVK",
  "SVN",
  "SWE",
  "UKR",
  "SMR",
  "MCO",
  "VAT",
  "XKX",
]);

const demoCountries = [
  {
    name: "Portugal",
    code: "PRT",
    color: "#ffb15c",
    fromPrice: 175,
    note: "Sunlit cities & Atlantic coast",
  },
  {
    name: "Italy",
    code: "ITA",
    color: "#ea6a47",
    fromPrice: 198,
    note: "Historic cities & Mediterranean coasts",
  },
  {
    name: "Croatia",
    code: "HRV",
    color: "#83d3bd",
    fromPrice: 215,
    note: "Island-hopping on the Adriatic",
  },
  {
    name: "Greece",
    code: "GRC",
    color: "#8374f2",
    fromPrice: 230,
    note: "Ancient ruins & island sunsets",
  },
];

function filterEuropeanCountries(countries) {
  return (countries ?? []).filter((country) => {
    const code = String(country.code ?? "").toUpperCase();
    return EUROPEAN_COUNTRY_CODES.has(code);
  });
}

export async function getRecommendations({ location, budget }) {
  const endpoint = import.meta.env.VITE_RECOMMENDATIONS_API_URL;

  if (!endpoint) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const affordable = demoCountries.filter(
      (country) => country.fromPrice <= Number(budget),
    );
    return { countries: filterEuropeanCountries(affordable), isDemo: true };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location, budget: Number(budget) }),
  });

  if (!response.ok) throw new Error("Could not find destinations right now.");
  const data = await response.json();
  return { countries: filterEuropeanCountries(data.countries), isDemo: false };
}
