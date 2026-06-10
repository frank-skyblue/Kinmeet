import React from "react";
import { EDUCATION_LEVEL_OPTIONS } from "../../constants/profileOptions";

interface SignupStep3Props {
  jobTitle: string;
  setJobTitle: React.Dispatch<React.SetStateAction<string>>;
  company: string;
  setCompany: React.Dispatch<React.SetStateAction<string>>;
  educationLevel: string;
  setEducationLevel: React.Dispatch<React.SetStateAction<string>>;
  graduationYear: string;
  setGraduationYear: React.Dispatch<React.SetStateAction<string>>;
  graduationYears: number[];
  onNext: () => void;
  onBack: () => void;
}

const SignupStep3: React.FC<SignupStep3Props> = ({
  jobTitle,
  setJobTitle,
  company,
  setCompany,
  educationLevel,
  setEducationLevel,
  graduationYear,
  setGraduationYear,
  graduationYears,
  onNext,
  onBack,
}) => {
  const handleNext = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">
        Work & Education
      </h2>
      <p className="text-sm text-kin-teal font-inter -mt-2 mb-2">
        These fields are optional but help others get to know you better.
      </p>

      {/* Work Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold font-montserrat text-kin-navy">
          Work
        </legend>

        <div>
          <label
            htmlFor="jobTitle"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            Job Title
          </label>
          <input
            type="text"
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
            placeholder="e.g., Software Engineer"
            aria-label="Job title"
          />
        </div>

        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            Company
          </label>
          <input
            type="text"
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
            placeholder="e.g., Google"
            aria-label="Company name"
          />
        </div>
      </fieldset>

      {/* Education Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold font-montserrat text-kin-navy">
          Education
        </legend>

        <div>
          <label
            htmlFor="educationLevel"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            Education Level
          </label>
          <select
            id="educationLevel"
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
            className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter bg-white"
            aria-label="Education level"
          >
            <option value="">Select education level</option>
            {EDUCATION_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="graduationYear"
            className="block text-sm font-medium font-inter text-kin-navy mb-2"
          >
            Graduation Year
          </label>
          <select
            id="graduationYear"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter bg-white"
            aria-label="Graduation year"
          >
            <option value="">Select year</option>
            {graduationYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

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

export default SignupStep3;
