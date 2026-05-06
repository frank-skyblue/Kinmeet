import React, { useEffect, useState, useRef, useCallback } from 'react';
import { profileAPI, getPhotoUrl } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import SearchableSelect from '../common/SearchableSelect';
import CitySearchInput from '../common/CitySearchInput';
import DynamicListField from '../common/DynamicListField';
import LookingForCheckboxes from '../common/LookingForCheckboxes';
import { validatePhotoFile } from '../../constants/validation';
import { getErrorMessage } from '../../utils/error';
import {
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
  INTEREST_OPTIONS,
  SIGNUP_GENDER_OPTIONS,
  getGlobalProvinceOptions,
  getProvinceOptions,
  getCountryCode,
  findProvinceCompositeValue,
  parseProvinceComposite,
} from '../../constants/profileOptions';
import type { ResolvedCityLocation } from '../../utils/citySearch';
import type { UserProfile } from '../../types';

interface ProfileEditFormProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onCancel: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ profile, onSave, onCancel }) => {
  const { refreshUser } = useAuth();

  const now = new Date();
  const todayIsoUtc = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  const maxDobUtc = new Date(
    Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0),
  );
  const minIsoUtc = `${maxDobUtc.getUTCFullYear()}-${String(maxDobUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(maxDobUtc.getUTCDate()).padStart(2, '0')}`;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [institution, setInstitution] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [currentProvince, setCurrentProvince] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [manualCountryMode, setManualCountryMode] = useState(false);
  const [languages, setLanguages] = useState<string[]>(['']);
  const [interests, setInterests] = useState<string[]>(['']);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPhotoRemoval, setPendingPhotoRemoval] = useState(false);
  const pendingBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokePendingBlob = useCallback(() => {
    if (pendingBlobUrlRef.current) {
      URL.revokeObjectURL(pendingBlobUrlRef.current);
      pendingBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingBlobUrlRef.current) {
        URL.revokeObjectURL(pendingBlobUrlRef.current);
        pendingBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName || '');
    setAbout(profile.about || '');
    setJobTitle(profile.jobTitle || '');
    setCompany(profile.company || '');
    setInstitution(profile.institution || '');
    setGraduationYear(profile.graduationYear != null ? String(profile.graduationYear) : '');
    setHomeCountry(profile.homeCountry);
    setCurrentCountry(profile.currentCountry);
    setCurrentCountryCode(getCountryCode(profile.currentCountry));
    setCurrentProvince(profile.currentProvince);
    setCurrentCity(profile.currentCity ?? '');
    setManualCountryMode(false);
    setLanguages(profile.languages.length > 0 ? profile.languages : ['']);
    setInterests(profile.interests.length > 0 ? profile.interests : ['']);
    setLookingFor(profile.lookingFor);
    setGender(profile.gender ?? '');
    const dob = profile.dateOfBirth;
    setDateOfBirth(
      typeof dob === 'string' && dob.length >= 10 ? dob.slice(0, 10) : '',
    );
    revokePendingBlob();
    setPhotoPreview(null);
    setPendingPhotoFile(null);
    setPendingPhotoRemoval(false);
  }, [profile, revokePendingBlob]);

  const handleCurrentCountryChange = (countryName: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(getCountryCode(countryName));
    setCurrentProvince('');
  };

  const handlePickCityResolved = (r: ResolvedCityLocation) => {
    setCurrentCity(r.cityName);
    setCurrentCountry(r.countryName);
    setCurrentCountryCode(r.countryCode);
    setCurrentProvince(r.provinceName);
    setManualCountryMode(false);
  };

  const applyProvinceFromComposite = (composite: string) => {
    const p = parseProvinceComposite(composite);
    if (!p) return;
    setCurrentCountry(p.countryName);
    setCurrentCountryCode(p.countryCode);
    setCurrentProvince(p.provinceName);
  };

  const provinceOptions = manualCountryMode
    ? getProvinceOptions(currentCountryCode)
    : getGlobalProvinceOptions();

  const provinceSelectValue = manualCountryMode
    ? currentProvince
    : findProvinceCompositeValue(currentCountryCode, currentProvince);

  const handleProvinceChange = (val: string) => {
    if (manualCountryMode) {
      setCurrentProvince(val);
      return;
    }
    applyProvinceFromComposite(val);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    revokePendingBlob();
    const url = URL.createObjectURL(file);
    pendingBlobUrlRef.current = url;
    setPhotoPreview(url);
    setPendingPhotoFile(file);
    setPendingPhotoRemoval(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    setError('');
    revokePendingBlob();
    setPhotoPreview(null);
    setPendingPhotoFile(null);
    if (profile.photo) {
      setPendingPhotoRemoval(true);
    }
  };

  const validate = (): boolean => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return false;
    }
    if (!gender.trim()) {
      setError('Gender is required');
      return false;
    }
    if (!dateOfBirth.trim()) {
      setError('Birthday is required');
      return false;
    }
    const dob = dateOfBirth.trim();
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
      (dob > todayIsoUtc || dob < minIsoUtc)
    ) {
      setError('Invalid date of birth');
      return false;
    }
    if (about && about.length > 500) {
      setError('About section must be 500 characters or fewer');
      return false;
    }
    if (graduationYear.trim() !== '') {
      const y = parseInt(graduationYear.trim(), 10);
      if (Number.isNaN(y) || y < 1950 || y > 2100) {
        setError('Graduation year must be a number between 1950 and 2100');
        return false;
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (pendingPhotoRemoval && !pendingPhotoFile) {
        const del = await profileAPI.deletePhoto();
        if (!del.success) {
          setError('Failed to remove photo');
          return;
        }
      }

      let uploadedPhotoUrl: string | undefined;
      if (pendingPhotoFile) {
        const up = await profileAPI.uploadPhoto(pendingPhotoFile);
        if (!up.success || !up.photo) {
          setError('Failed to upload photo');
          return;
        }
        uploadedPhotoUrl = up.photo;
      }

      const validLanguages = languages.filter((lang) => lang.trim() !== '');
      const validInterests = interests.filter((int) => int.trim() !== '');

      const gy = graduationYear.trim();
      const response = await profileAPI.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        about: about.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        institution: institution.trim() || undefined,
        graduationYear: gy ? parseInt(gy, 10) : undefined,
        homeCountry,
        currentCountry,
        currentProvince,
        currentCity: currentCity.trim() || undefined,
        languages: validLanguages,
        interests: validInterests,
        lookingFor,
        gender: gender.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });

      if (response.success) {
        let photoOut = response.user.photo;
        if (uploadedPhotoUrl !== undefined) {
          photoOut = uploadedPhotoUrl;
        } else if (pendingPhotoRemoval && !pendingPhotoFile) {
          photoOut = undefined;
        }

        await refreshUser();
        onSave({ ...response.user, photo: photoOut });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-kin-beige py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong p-8">
          <h1 className="text-2xl font-bold font-montserrat text-kin-navy mb-6">Edit Profile</h1>

          {error && (
            <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {photoPreview || (!pendingPhotoRemoval && profile.photo) ? (
                  <img
                    src={
                      photoPreview ||
                      (!pendingPhotoRemoval && profile.photo ? getPhotoUrl(profile.photo) : '')
                    }
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover border-4 border-kin-stone-200"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-kin-stone-200 bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-4xl font-bold font-montserrat">
                    {profile.firstName.charAt(0)}
                  </div>
                )}
                {isSaving && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold font-inter text-kin-teal border border-kin-teal rounded-kin-sm hover:bg-kin-teal hover:text-white transition disabled:opacity-50"
                  aria-label="Upload profile photo"
                >
                  {photoPreview || (!pendingPhotoRemoval && profile.photo) ? 'Change Photo' : 'Upload Photo'}
                </button>
                {(pendingPhotoFile || (profile.photo && !pendingPhotoRemoval)) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-semibold font-inter text-kin-coral-700 border border-kin-coral-200 rounded-kin-sm hover:bg-kin-coral-50 transition disabled:opacity-50"
                    aria-label="Remove profile photo"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                className="hidden"
                aria-hidden="true"
              />
              <p className="text-xs text-kin-teal font-inter text-center">
                JPEG, PNG, WebP, or GIF. Max 5 MB. Photo updates apply when you save.
              </p>
            </div>

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
                <p className="text-xs text-kin-teal font-inter mt-1">Hidden until kin request is accepted</p>
              </div>
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium font-inter text-kin-navy mb-2"
              >
                Birthday
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={dateOfBirth}
                min={minIsoUtc}
                max={todayIsoUtc}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                required
                aria-label="Birthday"
              />
            </div>

            <SearchableSelect
              id="gender"
              label="Gender"
              options={SIGNUP_GENDER_OPTIONS}
              value={gender}
              onChange={setGender}
              placeholder="Select gender"
              required
            />

            <div>
              <label htmlFor="about" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                About You
              </label>
              <textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter resize-none"
                placeholder="Tell others a bit about yourself..."
                rows={3}
                maxLength={500}
                aria-label="About you"
              />
              <p className="text-xs text-kin-teal font-inter mt-1">
                {about.length}/500 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="institution" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  School / Institution
                </label>
                <input
                  type="text"
                  id="institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                />
              </div>
              <div>
                <label htmlFor="graduationYear" className="block text-sm font-medium font-inter text-kin-navy mb-2">
                  Graduation Year
                </label>
                <input
                  type="number"
                  id="graduationYear"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                  min={1950}
                  max={2100}
                />
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

            <div className="space-y-4 border-t border-kin-stone-200 pt-4">
              <p className="text-sm font-semibold font-montserrat text-kin-navy">
                Where you live now
              </p>
              <CitySearchInput
                id="profileCurrentCity"
                label="City or town (optional)"
                currentCity={currentCity}
                setCurrentCity={setCurrentCity}
                onPickCity={handlePickCityResolved}
                helperText="Type a few letters and choose a match to fill country and province"
              />
              <SearchableSelect
                id="currentProvince"
                label={
                  manualCountryMode
                    ? 'Province/State'
                    : 'Province/State (search worldwide)'
                }
                options={provinceOptions}
                value={provinceSelectValue}
                onChange={handleProvinceChange}
                placeholder={manualCountryMode ? 'e.g., Ontario' : 'e.g., Ontario, Canada'}
                disabled={manualCountryMode && !currentCountryCode}
                required
                searchable="typeahead"
                helperText={
                  manualCountryMode
                    ? 'Pick your country first if needed, then province'
                    : 'Choosing a row sets your country and province together'
                }
              />
              {!manualCountryMode ? (
                <div className="rounded-kin-sm border border-kin-stone-200 bg-kin-stone-50 px-4 py-3">
                  <p className="text-sm font-medium font-inter text-kin-navy mb-1">Country</p>
                  <p className="text-kin-navy font-inter">{currentCountry || '—'}</p>
                  <button
                    type="button"
                    onClick={() => setManualCountryMode(true)}
                    className="mt-2 text-sm font-semibold text-kin-teal hover:text-kin-teal-700 underline"
                    aria-label="Pick country and province manually"
                  >
                    Change country or province manually
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
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
                  <button
                    type="button"
                    onClick={() => setManualCountryMode(false)}
                    className="text-sm font-semibold text-kin-teal hover:text-kin-teal-700 underline"
                    aria-label="Use worldwide province list instead"
                  >
                    Use worldwide province list instead
                  </button>
                </div>
              )}
            </div>

            <DynamicListField
              label="Languages Spoken"
              items={languages}
              options={LANGUAGE_OPTIONS}
              onAdd={() => setLanguages([...languages, ''])}
              onRemove={(index) => {
                const next = languages.filter((_, i) => i !== index);
                setLanguages(next.length > 0 ? next : ['']);
              }}
              onChange={(index, value) => {
                const next = [...languages];
                next[index] = value;
                setLanguages(next);
              }}
              idPrefix="language"
              required
              addLabel="+ Add Language"
              placeholder="Select a language"
            />

            <DynamicListField
              label="Personal Interests (Optional)"
              items={interests}
              options={INTEREST_OPTIONS}
              onAdd={() => setInterests([...interests, ''])}
              onRemove={(index) => {
                const next = interests.filter((_, i) => i !== index);
                setInterests(next.length > 0 ? next : ['']);
              }}
              onChange={(index, value) => {
                const next = [...interests];
                next[index] = value;
                setInterests(next);
              }}
              idPrefix="interest"
              addLabel="+ Add Interest"
              placeholder="Select an interest"
            />

            <LookingForCheckboxes
              selected={lookingFor}
              onChange={setLookingFor}
            />

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
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
};

export default ProfileEditForm;
