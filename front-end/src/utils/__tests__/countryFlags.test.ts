import { describe, it, expect } from 'vitest';
import { getCountryCode } from '../countryFlags';

describe('getCountryCode', () => {
  it('returns lowercase ISO code for standard country names', () => {
    expect(getCountryCode('Canada')).toBe('ca');
    expect(getCountryCode('United States')).toBe('us');
    expect(getCountryCode('France')).toBe('fr');
  });

  it('returns lowercase ISO code for legacy aliases', () => {
    expect(getCountryCode('USA')).toBe('us');
    expect(getCountryCode('US')).toBe('us');
    expect(getCountryCode('UK')).toBe('gb');
    expect(getCountryCode('United Kingdom')).toBe('gb');
    expect(getCountryCode('South Korea')).toBe('kr');
  });

  it('returns null for empty or unknown values', () => {
    expect(getCountryCode(undefined)).toBeNull();
    expect(getCountryCode('')).toBeNull();
    expect(getCountryCode('   ')).toBeNull();
    expect(getCountryCode('Not A Real Country')).toBeNull();
  });
});
