import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateAgeFromDateOfBirth, dobIsoBoundsUtc } from '../age';

describe('calculateAgeFromDateOfBirth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for missing or invalid values', () => {
    expect(calculateAgeFromDateOfBirth(undefined)).toBeNull();
    expect(calculateAgeFromDateOfBirth('')).toBeNull();
    expect(calculateAgeFromDateOfBirth('not-a-date')).toBeNull();
    expect(calculateAgeFromDateOfBirth('1990-13-01')).toBeNull();
  });

  it('calculates age when birthday has already occurred this year', () => {
    expect(calculateAgeFromDateOfBirth('1990-06-15')).toBe(36);
    expect(calculateAgeFromDateOfBirth('1990-01-15')).toBe(36);
  });

  it('calculates age when birthday has not occurred yet this year', () => {
    expect(calculateAgeFromDateOfBirth('1990-12-31')).toBe(35);
  });

  it('parses ISO datetime strings using UTC calendar date', () => {
    expect(calculateAgeFromDateOfBirth('1990-06-15T23:59:59.000Z')).toBe(36);
  });
});

describe('dobIsoBoundsUtc', () => {
  it('returns today and 120 years earlier as UTC ISO dates', () => {
    const { minIsoUtc, todayIsoUtc } = dobIsoBoundsUtc(new Date('2026-06-15T12:00:00.000Z'));
    expect(todayIsoUtc).toBe('2026-06-15');
    expect(minIsoUtc).toBe('1906-06-15');
  });
});
