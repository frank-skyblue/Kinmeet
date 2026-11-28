import type { LocalPhoto } from '../../services/api';

/** Everything the four sign-up steps collect; owned by SignupScreen so it survives moving between steps. */
export type SignupForm = {
  // Step 1
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  // Step 2
  photo: LocalPhoto | null;
  firstName: string;
  lastName: string;
  about: string;
  homeCountry: string;
  /** Asked first: the city search and province list only cover this country. */
  currentCountry: string;
  currentCountryCode: string;
  currentCity: string;
  currentProvince: string;
  dateOfBirth: string;
  gender: string;
  // Step 3
  industry: string;
  educationLevel: string;
  // Step 4
  languages: string[];
  interests: string[];
  lookingFor: string[];
};

export const INITIAL_SIGNUP_FORM: SignupForm = {
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  photo: null,
  firstName: '',
  lastName: '',
  about: '',
  homeCountry: '',
  currentCountry: '',
  currentCountryCode: '',
  currentCity: '',
  currentProvince: '',
  dateOfBirth: '',
  gender: '',
  industry: '',
  educationLevel: '',
  languages: [''],
  interests: [''],
  lookingFor: [],
};

/** Merges the given fields into the form, e.g. onChange({ email: 'a@b.c' }). */
export type SignupFormChange = (changes: Partial<SignupForm>) => void;

export type SignupStepProps = {
  form: SignupForm;
  onChange: SignupFormChange;
  setError: (message: string) => void;
};
