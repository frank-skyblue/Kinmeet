import { Country, State } from 'country-state-city';
import ISO6391 from 'iso-639-1';
import type { SearchableSelectOption } from '../types';

export const LOOKING_FOR_OPTIONS = ['Friendship', 'Networking', 'Support'];

export const EDUCATION_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'High School', label: 'High School' },
  { value: 'Some College/University', label: 'Some College/University' },
  { value: 'College Diploma', label: 'College Diploma' },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: 'Doctorate / PhD', label: 'Doctorate / PhD' },
  { value: 'Trade School', label: 'Trade School' },
  { value: 'Other', label: 'Other' },
];

export const LANGUAGE_OPTIONS: SearchableSelectOption[] = ISO6391.getAllNames()
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({ value: name, label: name }));

export const HOME_COUNTRY_OPTIONS: SearchableSelectOption[] = Country.getAllCountries()
  .map((c) => ({ value: c.name, label: c.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const COUNTRY_OPTIONS: SearchableSelectOption[] = Country.getAllCountries()
  .map((c) => ({ value: c.name, label: c.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const SIGNUP_GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export const INTEREST_OPTIONS: SearchableSelectOption[] = [
  'Arts & Culture', 'Baking', 'Bird Watching', 'Blogging', 'Board Games',
  'Book Club', 'Camping', 'Chess', 'Cooking', 'Crafting', 'Creative Writing',
  'Cycling', 'Dancing', 'DIY Projects', 'Drawing', 'Embroidery', 'Fashion',
  'Fishing', 'Fitness', 'Gardening', 'Gaming', 'Hiking', 'History',
  'Home Decor', 'Journaling', 'Kayaking', 'Knitting', 'Language Learning',
  'Meditation', 'Movies', 'Museum Visits', 'Music', 'Outdoor Activities',
  'Painting', 'Pet Care', 'Photography', 'Pilates', 'Playing Instruments',
  'Podcasts', 'Politics', 'Pottery', 'Reading', 'Rock Climbing', 'Running',
  'Science', 'Singing', 'Skiing', 'Snowboarding', 'Sports', 'Swimming',
  'Technology', 'Tennis', 'Theatre', 'Travel', 'Vegetarian Cooking',
  'Video Games', 'Volunteering', 'Wine Tasting', 'Yoga',
]
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({ value: name, label: name }));

export const getCountryCode = (countryName: string): string => {
  const country = Country.getAllCountries().find((c) => c.name === countryName);
  return country?.isoCode ?? '';
};

export const getProvinceOptions = (countryCode: string): SearchableSelectOption[] => {
  if (!countryCode) return [];
  const states = State.getStatesOfCountry(countryCode);
  if (states.length > 0) {
    return states.map((s) => ({ value: s.name, label: s.name }));
  }
  const country = Country.getAllCountries().find((c) => c.isoCode === countryCode);
  return [{ value: 'N/A', label: `${country?.name ?? 'This country'} (no subdivision)` }];
};

const PROVINCE_COMPOSITE_NONE = '__NONE__';

let globalProvinceOptionsCache: SearchableSelectOption[] | null = null;

/** All states worldwide for signup: value `countryIso|stateIso`, label `State, Country`. */
export const getGlobalProvinceOptions = (): SearchableSelectOption[] => {
  if (globalProvinceOptionsCache) return globalProvinceOptionsCache;
  const options: SearchableSelectOption[] = [];
  for (const c of Country.getAllCountries()) {
    const states = State.getStatesOfCountry(c.isoCode);
    if (states.length > 0) {
      for (const s of states) {
        options.push({
          value: `${c.isoCode}|${s.isoCode}`,
          label: `${s.name}, ${c.name}`,
        });
      }
    } else {
      options.push({
        value: `${c.isoCode}|${PROVINCE_COMPOSITE_NONE}`,
        label: `${c.name} (no subdivision)`,
      });
    }
  }
  options.sort((a, b) => a.label.localeCompare(b.label));
  globalProvinceOptionsCache = options;
  return globalProvinceOptionsCache;
};

export type ParsedProvinceComposite = {
  countryCode: string;
  countryName: string;
  provinceName: string;
};

/** Parse SearchableSelect value from getGlobalProvinceOptions. */
export const parseProvinceComposite = (composite: string): ParsedProvinceComposite | null => {
  const pipe = composite.indexOf('|');
  if (pipe <= 0) return null;
  const countryCode = composite.slice(0, pipe);
  const statePart = composite.slice(pipe + 1);
  const country = Country.getCountryByCode(countryCode);
  if (!country) return null;
  if (statePart === PROVINCE_COMPOSITE_NONE) {
    return { countryCode, countryName: country.name, provinceName: 'N/A' };
  }
  const state = State.getStateByCodeAndCountry(statePart, countryCode);
  if (!state) return null;
  return { countryCode, countryName: country.name, provinceName: state.name };
};

/** Value for SearchableSelect given stored country code + province display name. */
export const findProvinceCompositeValue = (
  countryCode: string,
  provinceName: string,
): string => {
  if (!countryCode) return '';
  if (provinceName === 'N/A') {
    return `${countryCode}|${PROVINCE_COMPOSITE_NONE}`;
  }
  const states = State.getStatesOfCountry(countryCode);
  const s = states.find((x) => x.name === provinceName);
  if (!s) return '';
  return `${countryCode}|${s.isoCode}`;
};
