import React from "react";
import SearchableSelect from "../common/SearchableSelect";
import {
  HOME_COUNTRY_OPTIONS,
  COUNTRY_OPTIONS,
  getProvinceOptions,
} from "../../constants/profileOptions";

interface SignupStep2Props {
  firstName: string;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  lastName: string;
  setLastName: React.Dispatch<React.SetStateAction<string>>;
  about: string;
  setAbout: React.Dispatch<React.SetStateAction<string>>;
  homeCountry: string;
  setHomeCountry: React.Dispatch<React.SetStateAction<string>>;
  currentCountry: string;
  currentCountryCode: string;
  currentProvince: string;
  setCurrentProvince: React.Dispatch<React.SetStateAction<string>>;
  photoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCurrentCountryChange: (countryName: string) => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onNext: () => void;
  onBack: () => void;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

const SignupStep2: React.FC<SignupStep2Props> = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  about,
  setAbout,
  homeCountry,
  setHomeCountry,
  currentCountry,
  currentCountryCode,
  currentProvince,
  setCurrentProvince,
  photoPreview,
  fileInputRef,
  onCurrentCountryChange,
  onPhotoSelect,
  onRemovePhoto,
  onNext,
  onBack,
  setError,
}) => {
  const validate = (): boolean => {
    if (
      !firstName ||
      !lastName ||
      !homeCountry ||
      !currentCountry ||
      !currentProvince
    ) {
      setError("Please fill in all required fields");
      return false;
    }
    if (about && about.length > 500) {
      setError("About section must be 500 characters or fewer");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (validate()) onNext();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">
        Profile Information
      </h2>

      {/* Profile Photo */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Profile preview"
              className="w-24 h-24 rounded-full object-cover border-4 border-kin-stone-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-kin-stone-300 bg-kin-stone-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-kin-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-semibold font-inter text-kin-teal border border-kin-teal rounded-kin-sm hover:bg-kin-teal hover:text-white transition"
            aria-label="Upload profile photo"
          >
            {photoPreview ? "Change Photo" : "Add Photo"}
          </button>
          {photoPreview && (
            <button
              type="button"
              onClick={onRemovePhoto}
              className="px-4 py-2 text-sm font-semibold font-inter text-kin-coral-700 border border-kin-coral-200 rounded-kin-sm hover:bg-kin-coral-50 transition"
              aria-label="Remove photo"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onPhotoSelect}
          className="hidden"
          aria-hidden="true"
        />
        <p className="text-xs text-kin-teal font-inter">
          Optional. JPEG, PNG, WebP, or GIF. Max 5 MB.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            First Name *
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
          <label
            htmlFor="lastName"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            Last Name *
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

      <div>
        <label
          htmlFor="about"
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
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

      <SearchableSelect
        id="homeCountry"
        label="Your Home Country"
        options={HOME_COUNTRY_OPTIONS}
        value={homeCountry}
        onChange={setHomeCountry}
        placeholder="e.g., Nigeria"
        required
        searchable="typeahead"
        helperText="The country where you were born or raised"
      />

      <SearchableSelect
        id="currentCountry"
        label="Where You Live Now (Country)"
        options={COUNTRY_OPTIONS}
        value={currentCountry}
        onChange={onCurrentCountryChange}
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
          onClick={onBack}
          className="flex-1 bg-kin-stone-200 text-kin-navy py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-stone-300 transition-all duration-200 shadow-kin-soft hover:shadow-kin-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 bg-kin-coral text-white py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SignupStep2;
