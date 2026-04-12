import { Country, State } from 'country-state-city';
import ISO6391 from 'iso-639-1';
import type { SearchableSelectOption } from '../types';

export const LOOKING_FOR_OPTIONS = ['Friendship', 'Networking', 'Support'];

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
