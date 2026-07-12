import React from "react";
import SearchableSelect from "../common/SearchableSelect";
import { EDUCATION_LEVEL_OPTIONS, INDUSTRY_OPTIONS } from "../../constants/profileOptions";

interface SignupStep3Props {
  industry: string;
  setIndustry: React.Dispatch<React.SetStateAction<string>>;
  educationLevel: string;
  setEducationLevel: React.Dispatch<React.SetStateAction<string>>;
  graduationYear: string;
  setGraduationYear: React.Dispatch<React.SetStateAction<string>>;
  graduationYears: number[];
  onNext: () => void;
  onBack: () => void;
}

const SignupStep3: React.FC<SignupStep3Props> = ({
  industry,
  setIndustry,
  educationLevel,
  setEducationLevel,
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

        <SearchableSelect
          id="industry"
          label="Industry or Field of Work"
          options={INDUSTRY_OPTIONS}
          value={industry}
          onChange={setIndustry}
          placeholder="Select your industry"
          searchable={true}
        />
      </fieldset>

      {/* Education Section */}
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold font-montserrat text-kin-navy">
          Education
        </legend>

        <SearchableSelect
          id="educationLevel"
          label="Education Level"
          options={EDUCATION_LEVEL_OPTIONS}
          value={educationLevel}
          onChange={setEducationLevel}
          placeholder="Select education level"
        />

        {/*
          FE-030: Graduation Year UI hidden for now.
          To show again:
            1. Uncomment graduationYearOptions + SearchableSelect below.
            2. Add graduationYear, setGraduationYear back to the destructured props above.
            3. Uncomment graduation-year test in SignupStep3.test.tsx and e2e/auth.spec.ts if needed.

          const graduationYearOptions = graduationYears.map((year) => ({
            value: String(year),
            label: String(year),
          }));

        <SearchableSelect
          id="graduationYear"
          label="Graduation Year"
          options={graduationYearOptions}
          value={graduationYear}
          onChange={setGraduationYear}
          placeholder="Select year"
        />
        */}
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
