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

export const INDUSTRY_OPTIONS: SearchableSelectOption[] = [
  'Accounting',
  'Airlines/Aviation',
  'Alternative Dispute Resolution',
  'Alternative Medicine',
  'Animation',
  'Apparel & Fashion',
  'Architecture & Planning',
  'Arts & Crafts',
  'Automotive',
  'Aviation & Aerospace',
  'Banking',
  'Biotechnology',
  'Broadcast Media',
  'Building Materials',
  'Business Supplies & Equipment',
  'Capital Markets',
  'Chemicals',
  'Civic & Social Organization',
  'Civil Engineering',
  'Commercial Real Estate',
  'Computer & Network Security',
  'Computer Games',
  'Computer Hardware',
  'Computer Networking',
  'Computer Software',
  'Construction',
  'Consumer Electronics',
  'Consumer Goods',
  'Consumer Services',
  'Cosmetics',
  'Dairy',
  'Defense & Space',
  'Design',
  'E-Learning',
  'Education Management',
  'Electrical/Electronic Manufacturing',
  'Entertainment',
  'Environmental Services',
  'Events Services',
  'Executive Office',
  'Facilities Services',
  'Farming',
  'Financial Services',
  'Fine Art',
  'Fishery',
  'Food & Beverages',
  'Food Production',
  'Fund-Raising',
  'Furniture',
  'Gambling & Casinos',
  'Glass, Ceramics & Concrete',
  'Government Administration',
  'Government Relations',
  'Graphic Design',
  'Health, Wellness & Fitness',
  'Higher Education',
  'Hospital & Health Care',
  'Hospitality',
  'Human Resources',
  'Import & Export',
  'Individual & Family Services',
  'Industrial Automation',
  'Information Services',
  'Information Technology & Services',
  'Insurance',
  'International Affairs',
  'International Trade & Development',
  'Internet',
  'Investment Banking',
  'Investment Management',
  'Judiciary',
  'Law Enforcement',
  'Law Practice',
  'Legal Services',
  'Legislative Office',
  'Leisure, Travel & Tourism',
  'Libraries',
  'Logistics & Supply Chain',
  'Luxury Goods & Jewelry',
  'Machinery',
  'Management Consulting',
  'Maritime',
  'Market Research',
  'Marketing & Advertising',
  'Mechanical or Industrial Engineering',
  'Media Production',
  'Medical Devices',
  'Medical Practice',
  'Mental Health Care',
  'Military',
  'Mining & Metals',
  'Motion Pictures & Film',
  'Museums & Institutions',
  'Music',
  'Nanotechnology',
  'Newspapers',
  'Non-Profit Organization Management',
  'Oil & Energy',
  'Online Media',
  'Outsourcing/Offshoring',
  'Package/Freight Delivery',
  'Packaging & Containers',
  'Paper & Forest Products',
  'Performing Arts',
  'Pharmaceuticals',
  'Philanthropy',
  'Photography',
  'Plastics',
  'Political Organization',
  'Primary/Secondary Education',
  'Printing',
  'Professional Training & Coaching',
  'Program Development',
  'Public Policy',
  'Public Relations & Communications',
  'Public Safety',
  'Publishing',
  'Railroad Manufacture',
  'Ranching',
  'Real Estate',
  'Recreational Facilities & Services',
  'Religious Institutions',
  'Renewables & Environment',
  'Research',
  'Restaurants',
  'Retail',
  'Security & Investigations',
  'Semiconductors',
  'Shipbuilding',
  'Sporting Goods',
  'Sports',
  'Staffing & Recruiting',
  'Supermarkets',
  'Telecommunications',
  'Textiles',
  'Think Tanks',
  'Tobacco',
  'Translation & Localization',
  'Transportation/Trucking/Railroad',
  'Utilities',
  'Venture Capital & Private Equity',
  'Veterinary',
  'Warehousing',
  'Wholesale',
  'Wine & Spirits',
  'Wireless',
  'Writing & Editing',
]
  .sort((a, b) => a.localeCompare(b))
  .map((name) => ({ value: name, label: name }));

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
