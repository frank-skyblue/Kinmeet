import React from "react";
import { authAPI } from "../../services/api";
import { getErrorMessage } from "../../utils/error";

const DUPLICATE_EMAIL_MESSAGE =
  "This email is already registered. Please log in instead.";

interface SignupStep1Props {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SignupStep1: React.FC<SignupStep1Props> = ({
  email,
  setEmail,
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onNext,
  setError,
}) => {
  const validate = (): boolean => {
    if (!email || !password || !confirmPassword) {
      setError("All fields are required");
      return false;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }
    const trimmedUsername = username.trim();
    if (trimmedUsername !== "" && !USERNAME_PATTERN.test(trimmedUsername.toLowerCase())) {
      setError(
        "Username must be 3-30 characters using lowercase letters, numbers, or underscores",
      );
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    setError("");
    if (!validate()) return;

    try {
      const result = await authAPI.checkEmail(email);
      if (!result.success || result.available === undefined) {
        setError("Unable to verify email. Please try again.");
        return;
      }
      if (!result.available) {
        setError(DUPLICATE_EMAIL_MESSAGE);
        return;
      }
      onNext();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to verify email. Please try again."));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-montserrat text-kin-navy mb-4">
        Create Account
      </h2>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
          Username
        </label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
          placeholder="e.g., jane_doe"
          autoComplete="username"
          maxLength={30}
        />
        <p className="text-xs text-kin-teal font-inter mt-1">
          Optional. 3-30 lowercase letters, numbers, or underscores. We'll
          create one for you if you leave this blank.
        </p>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
          placeholder="••••••••"
          required
        />
        <p className="text-xs text-kin-teal font-inter mt-1">
          Must be at least 8 characters with uppercase, lowercase, and
          number
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium font-inter text-kin-navy mb-2"
        >
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
          placeholder="••••••••"
          required
        />
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full bg-kin-coral text-white py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 mt-4"
      >
        Next
      </button>
    </div>
  );
};

export default SignupStep1;
