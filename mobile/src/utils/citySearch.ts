import { City, Country, State } from 'country-state-city';
import type { ICity } from 'country-state-city';

let citiesCache: ICity[] | null = null;

const getCitiesCache = (): ICity[] => {
  if (!citiesCache) {
    citiesCache = City.getAllCities(['name', 'countryCode', 'stateCode']);
  }
  return citiesCache;
};

export type ResolvedCityLocation = {
  cityName: string;
  countryName: string;
  countryCode: string;
  provinceName: string;
};

/**
 * Resolve a city from country-state-city into display + form values.
 */
export const resolveCityLocation = (city: ICity): ResolvedCityLocation | null => {
  const country = Country.getCountryByCode(city.countryCode);
  if (!country) return null;
  const state = State.getStateByCodeAndCountry(city.stateCode, city.countryCode);
  const provinceName = state?.name ?? city.stateCode;
  return {
    cityName: city.name,
    countryName: country.name,
    countryCode: country.isoCode,
    provinceName,
  };
};

const cityKey = (c: ICity): string => `${c.name}|${c.countryCode}|${c.stateCode}`;

/**
 * Search cities by name; prefix matches rank before substring matches.
 * Full scan of the library list (debounce at the UI layer).
 */
export const searchCities = (query: string, limit: number): ICity[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const cities = getCitiesCache();
  const seen = new Set<string>();
  const scored: { city: ICity; score: number }[] = [];

  for (const c of cities) {
    const nl = c.name.toLowerCase();
    if (!nl.includes(q)) continue;
    const key = cityKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = nl.startsWith(q) ? 0 : 1;
    scored.push({ city: c, score });
  }

  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.city.name.localeCompare(b.city.name) ||
      a.city.countryCode.localeCompare(b.city.countryCode),
  );
  return scored.slice(0, limit).map((s) => s.city);
};

export const formatCityOptionLabel = (city: ICity): string => {
  const resolved = resolveCityLocation(city);
  if (!resolved) return city.name;
  return `${resolved.cityName}, ${resolved.provinceName}, ${resolved.countryName}`;
};
