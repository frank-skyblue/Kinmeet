import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../email';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  New@Example.com  ')).toBe('new@example.com');
  });

  it('removes zero-width spaces', () => {
    expect(normalizeEmail('new@example.com\u200B')).toBe('new@example.com');
  });

  it('canonicalizes unicode equivalent forms', () => {
    expect(normalizeEmail('caf\u00E9@example.com')).toBe('café@example.com');
    expect(normalizeEmail('cafe\u0301@example.com')).toBe('café@example.com');
  });
});
