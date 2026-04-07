import React from "react";
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
} from "../../constants/profileOptions";
import DynamicListField from "../common/DynamicListField";
import LookingForCheckboxes from "../common/LookingForCheckboxes";

interface SignupStep4Props {
  languages: string[];
  interests: string[];
  lookingFor: string[];
  onAddLanguage: () => void;
  onRemoveLanguage: (index: number) => void;
  onLanguageChange: (index: number, value: string) => void;
  onAddInterest: () => void;
  onRemoveInterest: (index: number) => void;
  onInterestChange: (index: number, value: string) => void;
  onLookingForChange: (updated: string[]) => void;
  isLoading: boolean;
  onBack: () => void;
  setError: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
}

const SignupStep4: React.FC<SignupStep4Props> = ({
  languages,
  interests,
  lookingFor,
  onAddLanguage,
  onRemoveLanguage,
  onLanguageChange,
  onAddInterest,
  onRemoveInterest,
  onInterestChange,
  onLookingForChange,
  isLoading,
  onBack,
  setError,
  onSubmit,
}) => {
  const validate = (): boolean => {
    const validLanguages = languages.filter((lang) => lang.trim() !== "");
    if (validLanguages.length === 0) {
      setError("At least one language is required");
      return false;
    }
    if (lookingFor.length === 0) {
      setError("Please select what you are looking for");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validate()) onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">
        Languages & Interests
      </h2>

      <DynamicListField
        label="Languages Spoken"
        items={languages}
        options={LANGUAGE_OPTIONS}
        onAdd={onAddLanguage}
        onRemove={onRemoveLanguage}
        onChange={onLanguageChange}
        idPrefix="language"
        required
        addLabel="+ Add Language"
        placeholder="Select a language"
      />

      <DynamicListField
        label="Personal Interests (Optional)"
        items={interests}
        options={INTEREST_OPTIONS}
        onAdd={onAddInterest}
        onRemove={onRemoveInterest}
        onChange={onInterestChange}
        idPrefix="interest"
        addLabel="+ Add Interest"
        placeholder="Select an interest"
      />

      <LookingForCheckboxes
        selected={lookingFor}
        onChange={onLookingForChange}
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
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-kin-coral text-white py-4 px-4 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating Account..." : "Complete Signup"}
        </button>
      </div>
    </form>
  );
};

export default SignupStep4;
