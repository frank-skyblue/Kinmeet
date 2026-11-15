import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import SearchableSelect from '../common/SearchableSelect';
import CountryFlag from '../common/CountryFlag';
import BirthdaySelect from '../common/BirthdaySelect';
import { ABOUT_MAX_LENGTH, validatePhotoFile } from '../../constants/validation';
import { getErrorMessage } from '../../utils/error';
import { dobIsoBoundsUtc } from '../../utils/age';
import {
  LANGUAGE_OPTIONS,
  COUNTRY_OPTIONS,
  INTEREST_OPTIONS,
  INDUSTRY_OPTIONS,
  SIGNUP_GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  getCountryCode,
  parseProvinceComposite,
} from '../../constants/profileOptions';
import type { ResolvedCityLocation } from '../../utils/citySearch';
import type { UserProfile } from '../../types';
import ProfilePhotoEditor from './ProfilePhotoEditor';
import ProfileLocationFields from './ProfileLocationFields';
import ProfileTagField from './ProfileTagField';
import ProfileLookingForField from './ProfileLookingForField';
import { primaryActionClass, surfaceCardClass, textFieldClass } from '../../constants/ui';

const TABS = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'about', label: 'About You' },
  { id: 'location', label: 'Home & Location' },
  { id: 'interests', label: 'Languages & Interests' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** A problem that blocks saving, and the tab where the user can fix it. */
type ValidationIssue = { message: string; tab: TabId };

const labelClass = 'block text-sm font-medium font-inter text-foreground mb-2';
const RequiredMark = () => <span className="ml-1 text-kin-coral">*</span>;

/** The form's values as loaded from the profile, to tell when something has changed. */
const valuesFromProfile = (profile: UserProfile) => ({
  firstName: profile.firstName,
  lastName: profile.lastName || '',
  about: profile.about || '',
  industry: profile.industry || '',
  educationLevel: profile.educationLevel || '',
  graduationYear: profile.graduationYear != null ? String(profile.graduationYear) : '',
  homeCountry: profile.homeCountry,
  currentCountry: profile.currentCountry,
  currentProvince: profile.currentProvince,
  currentCity: profile.currentCity ?? '',
  languages: profile.languages,
  interests: profile.interests,
  lookingFor: profile.lookingFor,
  gender: profile.gender ?? '',
  dateOfBirth:
    typeof profile.dateOfBirth === 'string' && profile.dateOfBirth.length >= 10
      ? profile.dateOfBirth.slice(0, 10)
      : '',
});

const SectionHeading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div>
    <h2 className="font-montserrat text-lg font-bold text-foreground">{title}</h2>
    <p className="mt-1 font-inter text-sm text-muted">{description}</p>
  </div>
);

interface ProfileEditFormProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onCancel: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ profile, onSave, onCancel }) => {
  const { refreshUser } = useAuth();

  const { minIsoUtc, todayIsoUtc } = dobIsoBoundsUtc();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [industry, setIndustry] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [currentCountryCode, setCurrentCountryCode] = useState('');
  const [currentProvince, setCurrentProvince] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [manualCountryMode, setManualCountryMode] = useState(false);
  const [languages, setLanguages] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
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

  const initialValues = useMemo(() => valuesFromProfile(profile), [profile]);

  useEffect(() => {
    setFirstName(initialValues.firstName);
    setLastName(initialValues.lastName);
    setAbout(initialValues.about);
    setIndustry(initialValues.industry);
    setEducationLevel(initialValues.educationLevel);
    setGraduationYear(initialValues.graduationYear);
    setHomeCountry(initialValues.homeCountry);
    setCurrentCountry(initialValues.currentCountry);
    setCurrentCountryCode(getCountryCode(initialValues.currentCountry));
    setCurrentProvince(initialValues.currentProvince);
    setCurrentCity(initialValues.currentCity);
    setManualCountryMode(false);
    setLanguages(initialValues.languages);
    setInterests(initialValues.interests);
    setLookingFor(initialValues.lookingFor);
    setGender(initialValues.gender);
    setDateOfBirth(initialValues.dateOfBirth);
    revokePendingBlob();
    setPhotoPreview(null);
    setPendingPhotoFile(null);
    setPendingPhotoRemoval(false);
  }, [initialValues, revokePendingBlob]);

  const hasUnsavedChanges =
    Boolean(pendingPhotoFile) ||
    pendingPhotoRemoval ||
    JSON.stringify(initialValues) !==
      JSON.stringify({
        firstName,
        lastName,
        about,
        industry,
        educationLevel,
        graduationYear,
        homeCountry,
        currentCountry,
        currentProvince,
        currentCity,
        languages,
        interests,
        lookingFor,
        gender,
        dateOfBirth,
      });

  // Arrow keys, Home and End move between tabs, as in other tab lists.
  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    const tab = TABS[next].id;
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  };

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

  const validate = (): ValidationIssue | null => {
    if (!firstName.trim() || !lastName.trim()) {
      return { message: 'First name and last name are required', tab: 'basic' };
    }
    if (!dateOfBirth.trim()) {
      return { message: 'Birthday is required', tab: 'basic' };
    }
    const dob = dateOfBirth.trim();
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
      (dob > todayIsoUtc || dob < minIsoUtc)
    ) {
      return { message: 'Invalid date of birth', tab: 'basic' };
    }
    if (!gender.trim()) {
      return { message: 'Gender is required', tab: 'basic' };
    }
    if (about && about.length > ABOUT_MAX_LENGTH) {
      return { message: `About section must be ${ABOUT_MAX_LENGTH} characters or fewer`, tab: 'about' };
    }
    if (graduationYear.trim() !== '') {
      const y = parseInt(graduationYear.trim(), 10);
      if (Number.isNaN(y) || y < 1950 || y > 2100) {
        return { message: 'Graduation year must be a number between 1950 and 2100', tab: 'about' };
      }
    }
    if (!homeCountry || !currentCountry || !currentProvince) {
      return { message: 'Location fields are required', tab: 'location' };
    }
    if (languages.filter((lang) => lang.trim() !== '').length === 0) {
      return { message: 'At least one language is required', tab: 'interests' };
    }
    if (lookingFor.length === 0) {
      return { message: 'Please select what you are looking for', tab: 'interests' };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const issue = validate();
    if (issue) {
      // The problem may be on another tab: open it so the user can see the field.
      setError(issue.message);
      setActiveTab(issue.tab);
      return;
    }

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
        industry: industry.trim() || undefined,
        educationLevel: educationLevel.trim() || undefined,
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
    <div className="bg-canvas px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className={`${surfaceCardClass} rounded-kin-xl p-5 sm:p-8`}>
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-kin-sm border border-border text-foreground transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Back to profile"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6-6-6 6 6 6" />
              </svg>
            </button>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-foreground">Edit Profile</h1>
              <p className="mt-1 font-inter text-sm text-muted">
                Make it feel like you. <span className="text-kin-coral">*</span> Required
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Profile sections"
            className="mt-6 grid grid-cols-2 gap-1 rounded-kin-lg bg-surface-muted p-1 sm:grid-cols-4"
          >
            {TABS.map((tab, index) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(element) => {
                    tabRefs.current[tab.id] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`profile-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={selected ? 'profile-tab-panel' : undefined}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`cursor-pointer rounded-kin-sm px-2 py-2.5 font-inter text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    selected
                      ? 'bg-surface font-semibold text-foreground shadow-kin-soft'
                      : 'font-medium text-muted hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
            <section
              role="tabpanel"
              id="profile-tab-panel"
              aria-labelledby={`profile-tab-${activeTab}`}
              className="space-y-6 rounded-kin-xl border border-border p-5 sm:p-6"
            >
              {activeTab === 'basic' && (
                <>
                  <SectionHeading title="The Essentials" description="A familiar face and a little about you." />
                  <ProfilePhotoEditor
                    initials={`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || profile.firstName.charAt(0)}
                    existingPhoto={profile.photo}
                    photoPreview={photoPreview}
                    pendingPhotoFile={pendingPhotoFile}
                    pendingPhotoRemoval={pendingPhotoRemoval}
                    isSaving={isSaving}
                    fileInputRef={fileInputRef}
                    onPhotoSelect={handlePhotoSelect}
                    onRemovePhoto={handleRemovePhoto}
                  />
                  <div className="space-y-5 border-t border-border pt-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="firstName" className={labelClass}>
                          First Name<RequiredMark />
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`${textFieldClass} w-full rounded-kin-sm bg-transparent px-4 py-3 text-foreground transition`}
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className={labelClass}>
                          Last Name<RequiredMark />
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          aria-describedby="lastName-help"
                          className={`${textFieldClass} w-full rounded-kin-sm bg-transparent px-4 py-3 text-foreground transition`}
                          required
                        />
                        <p id="lastName-help" className="mt-1 font-inter text-xs text-muted">
                          Hidden until your kin request is accepted.
                        </p>
                      </div>
                    </div>

                    <div>
                      <BirthdaySelect
                        idPrefix="dateOfBirth"
                        label="Date of Birth"
                        value={dateOfBirth}
                        minIsoDate={minIsoUtc}
                        maxIsoDate={todayIsoUtc}
                        onChange={setDateOfBirth}
                        required
                      />
                      <p className="mt-1 font-inter text-xs text-muted">Only your age is shown on your profile.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SearchableSelect
                        id="gender"
                        label="Gender"
                        options={SIGNUP_GENDER_OPTIONS}
                        value={gender}
                        onChange={setGender}
                        placeholder="Select gender"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'about' && (
                <>
                  <SectionHeading title="Your Story" description="Give your people something to connect with." />
                  <div>
                    <label htmlFor="about" className={labelClass}>
                      About You
                    </label>
                    <textarea
                      id="about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className={`${textFieldClass} w-full resize-y rounded-kin-sm bg-transparent px-4 py-3 text-foreground transition`}
                      placeholder="Tell others a bit about yourself..."
                      rows={4}
                      maxLength={ABOUT_MAX_LENGTH}
                      aria-describedby="about-count"
                    />
                    <p id="about-count" className="mt-1 font-inter text-xs text-muted">
                      {about.length}/{ABOUT_MAX_LENGTH} characters
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SearchableSelect
                      id="industry"
                      label="Industry or Field of Work"
                      options={INDUSTRY_OPTIONS}
                      value={industry}
                      onChange={setIndustry}
                      placeholder="Select your industry"
                      searchable={true}
                    />
                    <SearchableSelect
                      id="educationLevel"
                      label="Education Level"
                      options={EDUCATION_LEVEL_OPTIONS}
                      value={educationLevel}
                      onChange={setEducationLevel}
                      placeholder="Select education level"
                    />
                  </div>
                </>
              )}

              {activeTab === 'location' && (
                <>
                  <SectionHeading title="Home, Wherever You Are" description="Help us connect you with your community nearby." />
                  <SearchableSelect
                    id="homeCountry"
                    label="Home Country"
                    options={COUNTRY_OPTIONS}
                    value={homeCountry}
                    onChange={setHomeCountry}
                    placeholder="e.g., Canada"
                    required
                    searchable="typeahead"
                    helperText="The country where you were born or raised."
                    leadingContent={<CountryFlag country={homeCountry} />}
                  />
                  <div className="border-t border-border pt-6">
                    <ProfileLocationFields
                      currentCity={currentCity}
                      setCurrentCity={setCurrentCity}
                      currentCountry={currentCountry}
                      currentCountryCode={currentCountryCode}
                      currentProvince={currentProvince}
                      setCurrentProvince={setCurrentProvince}
                      manualCountryMode={manualCountryMode}
                      setManualCountryMode={setManualCountryMode}
                      onPickCityResolved={handlePickCityResolved}
                      onCurrentCountryChange={handleCurrentCountryChange}
                      applyProvinceFromComposite={applyProvinceFromComposite}
                    />
                  </div>
                </>
              )}

              {activeTab === 'interests' && (
                <>
                  <SectionHeading
                    title="Find Common Ground"
                    description="The things you share can start a great conversation."
                  />
                  <ProfileTagField
                    id="languages"
                    label="Languages Spoken"
                    values={languages}
                    options={LANGUAGE_OPTIONS}
                    onChange={setLanguages}
                    placeholder="Search a language to add"
                    required
                  />
                  <ProfileTagField
                    id="interests"
                    label="Interests (Optional)"
                    values={interests}
                    options={INTEREST_OPTIONS}
                    onChange={setInterests}
                    placeholder="Search an interest to add"
                  />
                  <ProfileLookingForField selected={lookingFor} onChange={setLookingFor} />
                </>
              )}
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-4 py-3 font-inter text-kin-coral-700"
              >
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-kin-xl border border-border px-4 py-3 sm:px-5">
              <p role="status" className="font-inter text-sm text-muted">
                {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Unsaved changes' : 'No unsaved changes'}
              </p>
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="cursor-pointer rounded-kin-sm px-3 py-2.5 font-inter font-medium text-muted transition hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`${primaryActionClass} cursor-pointer rounded-kin-sm px-5 py-2.5 font-montserrat font-bold shadow-kin-soft transition-all hover:shadow-kin-medium focus:ring-4 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditForm;
