import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LOOKING_FOR_OPTIONS,
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
  INTEREST_OPTIONS,
  getProvinceOptions,
  getCountryCode,
} from '../../constants/profileOptions';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';
import SearchableSelect from '../common/SearchableSelect';

const Signup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [currentProvince, setCurrentProvince] = useState('');
  const [languages, setLanguages] = useState<string[]>(['']);
  const [interests, setInterests] = useState<string[]>(['']);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  const handleAddLanguage = () => {
    setLanguages([...languages, '']);
  };

  const handleRemoveLanguage = (index: number) => {
    const newLanguages = languages.filter((_, i) => i !== index);
    setLanguages(newLanguages.length > 0 ? newLanguages : ['']);
  };

  const handleLanguageChange = (index: number, value: string) => {
    const newLanguages = [...languages];
    newLanguages[index] = value;
    setLanguages(newLanguages);
  };

  const handleAddInterest = () => {
    setInterests([...interests, '']);
  };

  const handleRemoveInterest = (index: number) => {
    const newInterests = interests.filter((_, i) => i !== index);
    setInterests(newInterests.length > 0 ? newInterests : ['']);
  };

  const handleInterestChange = (index: number, value: string) => {
    const newInterests = [...interests];
    newInterests[index] = value;
    setInterests(newInterests);
  };

  const handleCurrentCountryChange = (countryName: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(getCountryCode(countryName));
    setCurrentProvince('');
  };

  const handleLookingForToggle = (option: string) => {
    if (lookingFor.includes(option)) {
      setLookingFor(lookingFor.filter(item => item !== option));
    } else {
      setLookingFor([...lookingFor, option]);
    }
  };

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!firstName || !lastName || !homeCountry || !currentCountry || !currentProvince) {
      setError('All fields are required');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const validLanguages = languages.filter(lang => lang.trim() !== '');
    if (validLanguages.length === 0) {
      setError('At least one language is required');
      return false;
    }
    if (lookingFor.length === 0) {
      setError('Please select what you are looking for');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep3()) return;

    setIsLoading(true);

    try {
      const validLanguages = languages.filter(lang => lang.trim() !== '');
      const validInterests = interests.filter(int => int.trim() !== '');

      await register({
        email,
        password,
        firstName,
        lastName,
        homeCountry,
        currentLocation: {
          province: currentProvince,
          country: currentCountry,
        },
        languages: validLanguages,
        interests: validInterests,
        lookingFor,
      });

      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-kin-xl shadow-kin-strong p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-4xl font-bold font-montserrat text-kin-navy mb-2">Join KinMeet</h1>
          <p className="text-kin-teal font-inter">Connect with people from your homeland living abroad</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold font-montserrat shadow-kin-soft transition ${
                  step >= s ? 'bg-kin-coral text-white' : 'bg-kin-stone-200 text-kin-stone-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 rounded-full transition ${
                    step > s ? 'bg-kin-coral' : 'bg-kin-stone-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">Create Account</h2>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-kin-teal font-inter mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="w-full bg-kin-coral text-white py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 mt-4"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Profile Info */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">Profile Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                  required
                />
                <p className="text-xs text-kin-teal font-inter mt-1">
                  Hidden until connection is accepted
                </p>
              </div>
            </div>

            <SearchableSelect
              id="homeCountry"
              label="Your Home Country"
              options={COUNTRY_OPTIONS}
              value={homeCountry}
              onChange={setHomeCountry}
              placeholder="e.g., Canada"
              required
              searchable="typeahead"
              helperText="The country where you were born or raised"
            />

            <SearchableSelect
              id="currentCountry"
              label="Where You Live Now (Country)"
              options={COUNTRY_OPTIONS}
              value={currentCountry}
              onChange={handleCurrentCountryChange}
              placeholder="e.g., Canada"
              required
              searchable="typeahead"
            />

            <SearchableSelect
              id="currentProvince"
              label="Province/State"
              options={getProvinceOptions(currentCountryCode)}
              value={currentProvince}
              onChange={setCurrentProvince}
              placeholder="e.g., Ontario"
              disabled={!currentCountry}
              required
              searchable="typeahead"
              helperText="Your current province/state of residence abroad"
            />

            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-stone-300 transition-all duration-200 shadow-kin-soft hover:shadow-kin-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 bg-kin-coral text-white py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Languages & Interests */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">Languages & Interests</h2>
            
            <div>
              <label className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Languages Spoken *
              </label>
              {languages.map((lang, index) => (
                <div key={index} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <SearchableSelect
                      id={`language-${index}`}
                      label="Language"
                      options={LANGUAGE_OPTIONS.filter(
                        (opt) =>
                          opt.value === lang ||
                          !languages.some((l, i) => i !== index && l === opt.value)
                      )}
                      value={lang}
                      onChange={(value) => handleLanguageChange(index, value)}
                      placeholder="Select a language"
                      required={index === 0}
                      hideLabel
                      searchable="typeahead"
                    />
                  </div>
                  {languages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(index)}
                      className="px-4 py-3 bg-kin-coral-100 text-kin-coral-700 rounded-kin-sm font-inter font-medium hover:bg-kin-coral-200 transition shrink-0"
                      aria-label="Remove language"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddLanguage}
                className="text-kin-teal font-semibold font-inter hover:text-kin-teal-600 transition"
              >
                + Add Language
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Personal Interests (Optional)
              </label>
              {interests.map((interest, index) => (
                <div key={index} className="flex gap-2 mb-2 items-end">
                  <div className="flex-1">
                    <SearchableSelect
                      id={`interest-${index}`}
                      label="Interest"
                      options={INTEREST_OPTIONS.filter(
                        (opt) =>
                          opt.value === interest ||
                          !interests.some((int, i) => i !== index && int === opt.value)
                      )}
                      value={interest}
                      onChange={(value) => handleInterestChange(index, value)}
                      placeholder="Select an interest"
                      hideLabel
                      searchable="typeahead"
                    />
                  </div>
                  {interests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(index)}
                      className="px-4 py-3 bg-kin-coral-100 text-kin-coral-700 rounded-kin-sm font-inter font-medium hover:bg-kin-coral-200 transition shrink-0"
                      aria-label="Remove interest"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddInterest}
                className="text-kin-teal font-semibold font-inter hover:text-kin-teal-600 transition"
              >
                + Add Interest
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium font-inter text-kin-navy mb-2">
                Looking For * (Select all that apply)
              </label>
              <div className="space-y-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-3 border border-kin-stone-300 rounded-kin-sm cursor-pointer hover:bg-kin-beige hover:border-kin-coral transition"
                    tabIndex={0}
                    aria-label={`Select ${option}`}
                  >
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(option)}
                      onChange={() => handleLookingForToggle(option)}
                      className="w-5 h-5 text-kin-coral rounded focus:ring-kin-coral"
                    />
                    <span className="ml-3 text-kin-navy font-inter">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-stone-300 transition-all duration-200 shadow-kin-soft hover:shadow-kin-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-kin-coral text-white py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Complete Signup'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-kin-navy font-inter">
            Already have an account?{' '}
            <Link to="/login" className="text-kin-coral font-semibold hover:text-kin-coral-600 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

