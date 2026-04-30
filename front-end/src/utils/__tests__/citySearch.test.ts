import { describe, expect, it } from 'vitest';
import { City } from 'country-state-city';
import {
  formatCityOptionLabel,
  resolveCityLocation,
  searchCities,
} from '../citySearch';

describe('citySearch', () => {
  it('searchCities returns empty for short query', () => {
    expect(searchCities('t', 10)).toEqual([]);
    expect(searchCities('', 10)).toEqual([]);
  });

  it('searchCities orders all prefix matches before any substring-only match', () => {
    // "ton" is a prefix of cities like "Tonbridge" and a non-prefix substring of "Boston" (…ton).
    const q = 'ton';
    const results = searchCities(q, 120);
    expect(results.length).toBeGreaterThan(1);

    const firstNonPrefix = results.findIndex(
      (c) => !c.name.toLowerCase().startsWith(q),
    );
    expect(firstNonPrefix).toBeGreaterThan(0);
    expect(
      results.slice(0, firstNonPrefix).every((c) => c.name.toLowerCase().startsWith(q)),
    ).toBe(true);
    expect(results[firstNonPrefix].name.toLowerCase().includes(q)).toBe(true);
    expect(results[0].name.toLowerCase().startsWith(q)).toBe(true);
  });

  it('resolveCityLocation returns country and province names', () => {
    const toronto = City.getCitiesOfState('CA', 'ON')?.find((c) => c.name === 'Toronto');
    expect(toronto).toBeDefined();
    const resolved = resolveCityLocation(toronto!);
    expect(resolved).not.toBeNull();
    expect(resolved!.cityName).toBe('Toronto');
    expect(resolved!.countryCode).toBe('CA');
    expect(resolved!.countryName).toBe('Canada');
    expect(resolved!.provinceName).toBe('Ontario');
  });

  it('formatCityOptionLabel includes city province country', () => {
    const toronto = City.getCitiesOfState('CA', 'ON')?.find((c) => c.name === 'Toronto');
    expect(toronto).toBeDefined();
    const label = formatCityOptionLabel(toronto!);
    expect(label).toContain('Toronto');
    expect(label).toContain('Ontario');
    expect(label).toContain('Canada');
  });
});
