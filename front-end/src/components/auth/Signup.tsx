import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCountryCode } from "../../constants/profileOptions";
import { validatePhotoFile } from "../../constants/validation";
import { useAuth } from '../../contexts/useAuth';
import { profileAPI } from "../../services/api";
import Logo from "../common/Logo";
import SignupStep1 from "./SignupStep1";
import SignupStep2 from "./SignupStep2";
import SignupStep3 from "./SignupStep3";
import SignupStep4 from "./SignupStep4";

const TOTAL_STEPS = 4;

const GRADUATION_YEARS = Array.from(
  { length: new Date().getFullYear() - 1950 + 5 },
  (_, i) => new Date().getFullYear() + 4 - i,
);

const Signup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [currentCountryCode, setCurrentCountryCode] = useState("");
  const [currentProvince, setCurrentProvince] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [institution, setInstitution] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [languages, setLanguages] = useState<string[]>([""]);
  const [interests, setInterests] = useState<string[]>([""]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddLanguage = () => {
    setLanguages([...languages, ""]);
  };

  const handleRemoveLanguage = (index: number) => {
    const newLanguages = languages.filter((_, i) => i !== index);
    setLanguages(newLanguages.length > 0 ? newLanguages : [""]);
  };

  const handleLanguageChange = (index: number, value: string) => {
    const newLanguages = [...languages];
    newLanguages[index] = value;
    setLanguages(newLanguages);
  };

  const handleAddInterest = () => {
    setInterests([...interests, ""]);
  };

  const handleRemoveInterest = (index: number) => {
    const newInterests = interests.filter((_, i) => i !== index);
    setInterests(newInterests.length > 0 ? newInterests : [""]);
  };

  const handleInterestChange = (index: number, value: string) => {
    const newInterests = [...interests];
    newInterests[index] = value;
    setInterests(newInterests);
  };

  const handleCurrentCountryChange = (countryName: string) => {
    setCurrentCountry(countryName);
    setCurrentCountryCode(getCountryCode(countryName));
    setCurrentProvince("");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const validLanguages = languages.filter((lang) => lang.trim() !== "");
      const validInterests = interests.filter((int) => int.trim() !== "");

      await register({
        email,
        password,
        firstName,
        lastName,
        about: about.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        institution: institution.trim() || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        homeCountry,
        currentLocation: {
          province: currentProvince,
          country: currentCountry,
        },
        languages: validLanguages,
        interests: validInterests,
        lookingFor,
        dateOfBirth: dateOfBirth.trim(),
        gender: gender.trim(),
      });

      if (photoFile) {
        try {
          await profileAPI.uploadPhoto(photoFile);
        } catch {
          // non-critical — user can upload later from profile
        }
      }

      navigate("/discover");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage || "Registration failed. Please try again.");
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
          <h1 className="text-4xl font-bold font-montserrat text-kin-navy mb-2">
            Join KinMeet
          </h1>
          <p className="text-kin-teal font-inter">
            Connect with people from your homeland living abroad
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold font-montserrat shadow-kin-soft transition ${
                  step >= s
                    ? "bg-kin-coral text-white"
                    : "bg-kin-stone-200 text-kin-stone-500"
                }`}
              >
                {s}
              </div>
              {s < TOTAL_STEPS && (
                <div
                  className={`w-12 h-1 rounded-full transition ${
                    step > s ? "bg-kin-coral" : "bg-kin-stone-200"
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

        {step === 1 && (
          <SignupStep1
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onNext={() => setStep(2)}
            setError={setError}
          />
        )}

        {step === 2 && (
          <SignupStep2
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            about={about}
            setAbout={setAbout}
            homeCountry={homeCountry}
            setHomeCountry={setHomeCountry}
            currentCountry={currentCountry}
            currentCountryCode={currentCountryCode}
            currentProvince={currentProvince}
            setCurrentProvince={setCurrentProvince}
            photoPreview={photoPreview}
            fileInputRef={fileInputRef}
            onCurrentCountryChange={handleCurrentCountryChange}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={handleRemovePhoto}
            dateOfBirth={dateOfBirth}
            setDateOfBirth={setDateOfBirth}
            gender={gender}
            setGender={setGender}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            setError={setError}
          />
        )}

        {step === 3 && (
          <SignupStep3
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            company={company}
            setCompany={setCompany}
            institution={institution}
            setInstitution={setInstitution}
            graduationYear={graduationYear}
            setGraduationYear={setGraduationYear}
            graduationYears={GRADUATION_YEARS}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <SignupStep4
            languages={languages}
            interests={interests}
            lookingFor={lookingFor}
            onAddLanguage={handleAddLanguage}
            onRemoveLanguage={handleRemoveLanguage}
            onLanguageChange={handleLanguageChange}
            onAddInterest={handleAddInterest}
            onRemoveInterest={handleRemoveInterest}
            onInterestChange={handleInterestChange}
            onLookingForChange={setLookingFor}
            isLoading={isLoading}
            onBack={() => setStep(3)}
            setError={setError}
            onSubmit={handleSubmit}
          />
        )}

        <div className="mt-6 text-center">
          <p className="text-kin-navy font-inter">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-kin-coral font-semibold hover:text-kin-coral-600 transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
