import { City, Country, State } from 'country-state-city';
import type { ICity } from 'country-state-city';

// Mobile asks for the country before the city, so searches only cover one country's cities.
// (The web version, front-end/src/utils/citySearch.ts, still searches worldwide.)

const citiesByCountry = new Map<string, ICity[]>();

const getCitiesOfCountry = (countryCode: string): ICity[] => {
  let cities = citiesByCountry.get(countryCode);
  if (!cities) {
    cities = City.getCitiesOfCountry(countryCode) ?? [];
    citiesByCountry.set(countryCode, cities);
  }
  return cities;
};

export type ResolvedCityLocation = {
  cityName: string;
  countryName: string;
  countryCode: string;
  provinceName: string;
};

/** Resolve a city from country-state-city into display + form values. */
export const resolveCityLocation = (city: ICity): ResolvedCityLocation | null => {
  const country = Country.getCountryByCode(city.countryCode);
  if (!country) return null;
  const state = State.getStateByCodeAndCountry(city.stateCode, city.countryCode);
  return {
    cityName: city.name,
    countryName: country.name,
    countryCode: country.isoCode,
    provinceName: state?.name ?? city.stateCode,
  };
};

/**
 * Search one country's cities by name; prefix matches rank before substring matches.
 * Returns nothing for a query under 2 letters or an unknown country.
 */
export const searchCities = (query: string, countryCode: string, limit: number): ICity[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || !countryCode) return [];

  const seen = new Set<string>();
  const scored: { city: ICity; score: number }[] = [];

  for (const city of getCitiesOfCountry(countryCode)) {
    const name = city.name.toLowerCase();
    if (!name.includes(q)) continue;
    const key = `${city.name}|${city.stateCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push({ city, score: name.startsWith(q) ? 0 : 1 });
  }

  scored.sort((a, b) => a.score - b.score || a.city.name.localeCompare(b.city.name));
  return scored.slice(0, limit).map((s) => s.city);
};

/** "Toronto, Ontario": the country is already chosen, so it isn't repeated. */
export const formatCityOptionLabel = (city: ICity): string => {
  const resolved = resolveCityLocation(city);
  if (!resolved) return city.name;
  return `${resolved.cityName}, ${resolved.provinceName}`;
};

/**
 * Provinces in which a city with exactly this name (case-insensitive) exists in the country,
 * e.g. "Toronto" → ["Ontario"], "Richmond" → ["British Columbia", "Ontario", "Quebec"].
 * Empty when the name isn't in the data (small towns), so any province is allowed.
 */
export const getCityProvinces = (cityName: string, countryCode: string): string[] => {
  const name = cityName.trim().toLowerCase();
  if (!name || !countryCode) return [];

  const provinces = new Set<string>();
  for (const city of getCitiesOfCountry(countryCode)) {
    if (city.name.toLowerCase() !== name) continue;
    const resolved = resolveCityLocation(city);
    if (resolved) provinces.add(resolved.provinceName);
  }
  return [...provinces].sort((a, b) => a.localeCompare(b));
};
