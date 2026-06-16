import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCountryCode,
  parseProvinceComposite,
} from "../../constants/profileOptions";
import { validatePhotoFile } from "../../constants/validation";
import { useAuth } from '../../contexts/useAuth';
import { profileAPI } from "../../services/api";
import Logo from "../common/Logo";
import SignupStep1 from "./SignupStep1";
import SignupStep2 from "./SignupStep2";
import SignupStep3 from "./SignupStep3";
import SignupStep4 from "./SignupStep4";
import type { ResolvedCityLocation } from "../../utils/citySearch";

const TOTAL_STEPS = 4;

const DUPLICATE_EMAIL_MESSAGE =
  "This email is already registered. Please log in instead.";

const isDuplicateEmailMessage = (message: string): boolean =>
  message === DUPLICATE_EMAIL_MESSAGE || message === "User already exists";

const GRADUATION_YEARS = Array.from(
  { length: new Date().getFullYear() - 1950 + 5 },
  (_, i) => new Date().getFullYear() + 4 - i,
);

const Signup: React.FC = () => {
  const [step, setStep] = useState(1);
  const [maxReachedStep, setMaxReachedStep] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [currentCountryCode, setCurrentCountryCode] = useState("");
  const [currentProvince, setCurrentProvince] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [manualCountryMode, setManualCountryMode] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [languages, setLanguages] = useState<string[]>([""]);
  const [interests, setInterests] = useState<string[]>([""]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMaxReachedStep((m) => Math.max(m, step));
  }, [step]);

  const handleClearResolvedLocation = () => {
    setCurrentCountry("");
    setCurrentCountryCode("");
    setCurrentProvince("");
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

    const now = new Date();
    const todayIsoUtc = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    const maxDobUtc = new Date(
      Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0),
    );
    const minIsoUtc = `${maxDobUtc.getUTCFullYear()}-${String(maxDobUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(maxDobUtc.getUTCDate()).padStart(2, '0')}`;
    const dob = dateOfBirth.trim();
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
      (dob > todayIsoUtc || dob < minIsoUtc)
    ) {
      setError("Invalid date of birth");
      setIsLoading(false);
      return;
    }

    try {
      const validLanguages = languages.filter((lang) => lang.trim() !== "");
      const validInterests = interests.filter((int) => int.trim() !== "");

      await register({
        email,
        username: username.trim() || undefined,
        password,
        firstName,
        lastName,
        about: about.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        educationLevel: educationLevel.trim() || undefined,
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        homeCountry,
        currentLocation: {
          province: currentProvince,
          country: currentCountry,
          city: currentCity.trim(),
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
      setError(
        isDuplicateEmailMessage(errorMessage)
          ? DUPLICATE_EMAIL_MESSAGE
          : errorMessage || "Registration failed. Please try again.",
      );
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
              <button
                type="button"
                disabled={s > maxReachedStep}
                onClick={() => {
                  if (s <= maxReachedStep) setStep(s);
                }}
                aria-label={`Go to signup step ${s}`}
                aria-current={step === s ? "step" : undefined}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold font-montserrat shadow-kin-soft transition focus:outline-none focus:ring-2 focus:ring-kin-coral focus:ring-offset-2 ${
                  step >= s
                    ? "bg-kin-coral text-white"
                    : "bg-kin-stone-200 text-kin-stone-500"
                } ${
                  s <= maxReachedStep
                    ? "cursor-pointer hover:opacity-90"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                {s}
              </button>
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
            username={username}
            setUsername={setUsername}
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
            currentCity={currentCity}
            setCurrentCity={setCurrentCity}
            manualCountryMode={manualCountryMode}
            setManualCountryMode={setManualCountryMode}
            onPickCityResolved={handlePickCityResolved}
            onClearResolvedLocation={handleClearResolvedLocation}
            applyProvinceFromComposite={applyProvinceFromComposite}
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
            educationLevel={educationLevel}
            setEducationLevel={setEducationLevel}
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
