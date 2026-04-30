import { describe, expect, it } from 'vitest';
import {
  findProvinceCompositeValue,
  parseProvinceComposite,
} from '../profileOptions';

describe('global province helpers', () => {
  it('parseProvinceComposite parses state row', () => {
    const p = parseProvinceComposite('CA|ON');
    expect(p).not.toBeNull();
    expect(p!.countryCode).toBe('CA');
    expect(p!.countryName).toBe('Canada');
    expect(p!.provinceName).toBe('Ontario');
  });

  it('parseProvinceComposite parses no-subdivision sentinel', () => {
    const p = parseProvinceComposite('MC|__NONE__');
    expect(p).not.toBeNull();
    expect(p!.countryCode).toBe('MC');
    expect(p!.provinceName).toBe('N/A');
  });

  it('findProvinceCompositeValue round-trips Ontario', () => {
    const composite = findProvinceCompositeValue('CA', 'Ontario');
    expect(composite).toBe('CA|ON');
    expect(parseProvinceComposite(composite)?.provinceName).toBe('Ontario');
  });
});
