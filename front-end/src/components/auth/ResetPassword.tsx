import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import Logo from '../common/Logo';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
const PASSWORD_HINT =
  'At least 8 characters, with uppercase, lowercase, and a number.';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError(PASSWORD_HINT);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword(token, newPassword);
      navigate('/login', {
        state: { flash: 'Password reset successful. You can now sign in with your new password.' },
        replace: true,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
        <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-2xl font-bold font-montserrat text-kin-navy mb-3">Invalid Link</h1>
          <p className="text-kin-stone-600 font-inter text-sm mb-6">
            This password reset link is missing or malformed.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block bg-kin-coral text-white py-3 px-6 rounded-kin-sm font-bold font-montserrat hover:bg-kin-coral-600 transition"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
      <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">Create New Password</h1>
          <p className="text-kin-teal font-inter text-sm">{PASSWORD_HINT}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter text-sm"
            >
              {error}{' '}
              {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) && (
                <Link to="/forgot-password" className="underline font-semibold">
                  Request a new link
                </Link>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium font-inter text-kin-navy mb-2"
            >
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={handleNewPasswordChange}
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              placeholder="••••••••"
              required
              aria-required="true"
              aria-describedby={passwordError ? 'password-error' : undefined}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium font-inter text-kin-navy mb-2"
            >
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              placeholder="••••••••"
              required
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          {passwordError && (
            <p id="password-error" role="alert" className="text-kin-coral-700 font-inter text-sm -mt-2">
              {passwordError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-kin-coral text-white py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? 'Saving…' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-kin-teal font-inter text-sm hover:text-kin-navy transition"
            aria-label="Go back to sign in page"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
