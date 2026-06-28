import { getCountryCode as getIsoFromCountryName } from '../constants/profileOptions';

const LEGACY_COUNTRY_ALIASES: Record<string, string> = {
  usa: 'us',
  us: 'us',
  'u.s.a.': 'us',
  'u.s.': 'us',
  uk: 'gb',
  'u.k.': 'gb',
  'united kingdom': 'gb',
  'great britain': 'gb',
  'south korea': 'kr',
  korea: 'kr',
  'republic of korea': 'kr',
  'north korea': 'kp',
  "democratic people's republic of korea": 'kp',
  china: 'cn',
  "people's republic of china": 'cn',
  russia: 'ru',
  'russian federation': 'ru',
};

export function getCountryCode(country?: string): string | null {
  if (!country?.trim()) return null;

  const trimmed = country.trim();
  const fromList = getIsoFromCountryName(trimmed);
  if (fromList) return fromList.toLowerCase();

  const alias = LEGACY_COUNTRY_ALIASES[trimmed.toLowerCase()];
  return alias ?? null;
}
