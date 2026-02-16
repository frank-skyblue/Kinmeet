import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SearchableSelect from '../common/SearchableSelect';
import {
  LOOKING_FOR_OPTIONS,
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
  INTEREST_OPTIONS,
  getProvinceOptions,
  getCountryCode,
} from '../../constants/profileOptions';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [currentProvince, setCurrentProvince] = useState('');
  const [languages, setLanguages] = useState<string[]>(['']);
  const [interests, setInterests] = useState<string[]>(['']);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile && isEditing) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setHomeCountry(profile.homeCountry);
      setCurrentCountry(profile.currentCountry);
      setCurrentCountryCode(getCountryCode(profile.currentCountry));
      setCurrentProvince(profile.currentProvince);
      setLanguages(profile.languages.length > 0 ? profile.languages : ['']);
      setInterests(profile.interests.length > 0 ? profile.interests : ['']);
      setLookingFor(profile.lookingFor);
    }
  }, [profile, isEditing]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await profileAPI.getProfile();
      if (response.success) {
        setProfile(response.user);
      }
    } catch (err: unknown) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

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
      setLookingFor(lookingFor.filter((item) => item !== option));
    } else {
      setLookingFor([...lookingFor, option]);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const validateEditForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return false;
    }
    if (!homeCountry || !currentCountry || !currentProvince) {
      setError('Location fields are required');
      return false;
    }
    const validLanguages = languages.filter((lang) => lang.trim() !== '');
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEditForm()) return;

    setIsSaving(true);
    try {
      const validLanguages = languages.filter((lang) => lang.trim() !== '');
      const validInterests = interests.filter((int) => int.trim() !== '');

      const response = await profileAPI.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        homeCountry,
        currentCountry,
        currentProvince,
        languages: validLanguages,
        interests: validInterests,
        lookingFor,
      });

      if (response.success) {
        setProfile(response.user);
        setIsEditing(false);
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
          (err as { message?: string })?.message ||
          'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await profileAPI.deleteProfile();
      if (response.success) {
        await logout();
        navigate('/');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
          (err as { message?: string })?.message ||
          'Failed to delete account'
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const handleOpenDeleteConfirm = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
    setError('');
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <p className="text-kin-coral-700 font-inter">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-kin-beige py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-kin-xl shadow-kin-strong p-8">
            <h1 className="text-2xl font-bold font-montserrat text-kin-navy mb-6">Edit Profile</h1>

            {error && (
              <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
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
                  <p className="text-xs text-kin-teal font-inter mt-1">Hidden until connection is accepted</p>
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
                helperText="Your current province/state of residence"
              />

              <div>
                <label className="block text-sm font-medium font-inter text-kin-navy mb-2">Languages Spoken *</label>
                {languages.map((lang, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                      <SearchableSelect
                        id={`language-${index}`}
                        label="Language"
                        options={LANGUAGE_OPTIONS.filter(
                          (opt) =>
                            opt.value === lang || !languages.some((l, i) => i !== index && l === opt.value)
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

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-bold font-montserrat hover:bg-kin-stone-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-kin-coral text-white py-3 rounded-kin-sm font-bold font-montserrat hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          <div className="bg-gradient-to-br from-kin-coral to-kin-teal h-32"></div>

          <div className="px-8 pb-8">
            <div className="-mt-16 mb-6">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-kin-medium"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-5xl font-bold font-montserrat shadow-kin-medium">
                  {profile.firstName.charAt(0)}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-kin-teal font-inter">{profile.email}</p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Home Country</h3>
                <p className="text-lg text-kin-navy font-montserrat">{profile.homeCountry}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-2">Current Location</h3>
                <p className="text-lg text-kin-navy font-montserrat">
                  {profile.currentProvince}, {profile.currentCountry}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.languages.map((lang, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-kin-teal-100 text-kin-teal-700 rounded-kin-sm font-medium font-inter"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              {profile.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-kin-teal-200 text-kin-teal-800 rounded-kin-sm font-medium font-inter"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold font-inter text-kin-navy mb-3">Looking For</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.lookingFor.map((item, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-kin-coral-100 text-kin-coral-700 rounded-kin-sm font-medium font-inter"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full bg-kin-teal text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-teal-600 shadow-kin-soft hover:shadow-kin-medium transition"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleOpenDeleteConfirm}
                className="w-full bg-kin-stone-200 text-kin-coral-700 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-kin-lg shadow-kin-medium p-6">
          <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-4">Community Guidelines</h2>
          <div className="space-y-3 text-kin-navy font-inter">
            <p>• Treat all members with respect and kindness</p>
            <p>• Celebrate cultural diversity and inclusivity</p>
            <p>• Be mindful of cultural sensitivities</p>
            <p>• Report inappropriate behavior or content</p>
            <p>• Last names are only visible to accepted connections</p>
            <p>• City-level details are not shared for privacy</p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-kin-xl shadow-kin-strong max-w-md w-full p-6">
            <h2 className="text-xl font-bold font-montserrat text-kin-navy mb-2">Delete Account</h2>
            <p className="text-kin-navy font-inter mb-4">
              This action cannot be undone. All your data, connections, and messages will be permanently deleted.
            </p>
            <p className="text-kin-navy font-inter mb-2">
              Type <strong>delete</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm font-inter mb-4 focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none"
              aria-label="Type delete to confirm"
            />
            {error && (
              <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-2 rounded-kin font-inter mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete'}
                className="flex-1 bg-kin-coral-700 text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
