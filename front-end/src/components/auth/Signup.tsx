import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LOOKING_FOR_OPTIONS = ['Friendship', 'Networking', 'Support'];

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">Join KinMeet</h1>
          <p className="text-gray-600">Connect with people from your homeland living abroad</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${
                    step > s ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create Account</h2>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleNextStep}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Profile Info */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Hidden until connection is accepted
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="homeCountry" className="block text-sm font-medium text-gray-700 mb-2">
                Your Home Country
              </label>
              <input
                type="text"
                id="homeCountry"
                value={homeCountry}
                onChange={(e) => setHomeCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="e.g., France"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The country where you were born or raised
              </p>
            </div>

            <div>
              <label htmlFor="currentCountry" className="block text-sm font-medium text-gray-700 mb-2">
                Where You Live Now (Country)
              </label>
              <input
                type="text"
                id="currentCountry"
                value={currentCountry}
                onChange={(e) => setCurrentCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="e.g., Canada"
                required
              />
            </div>

            <div>
              <label htmlFor="currentProvince" className="block text-sm font-medium text-gray-700 mb-2">
                Province/State
              </label>
              <input
                type="text"
                id="currentProvince"
                value={currentProvince}
                onChange={(e) => setCurrentProvince(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="e.g., Ontario"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Your current province/state of residence abroad
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Languages & Interests */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Languages & Interests</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Spoken *
              </label>
              {languages.map((lang, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={lang}
                    onChange={(e) => handleLanguageChange(index, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="e.g., French"
                  />
                  {languages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLanguage(index)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddLanguage}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                + Add Language
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Interests (Optional)
              </label>
              {interests.map((interest, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={interest}
                    onChange={(e) => handleInterestChange(index, e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="e.g., Cooking, Hiking"
                  />
                  {interests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(index)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddInterest}
                className="text-indigo-600 font-semibold hover:text-indigo-700"
              >
                + Add Interest
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Looking For * (Select all that apply)
              </label>
              <div className="space-y-2">
                {LOOKING_FOR_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(option)}
                      onChange={() => handleLookingForToggle(option)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Complete Signup'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

