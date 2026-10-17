import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import Logo from '../common/Logo';
import { primaryActionClass, surfaceCardClass, textFieldClass } from '../../constants/ui';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await authAPI.forgotPassword(email);
      setSuccessMessage(result.message ?? 'Password reset link sent. Please check your email.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className={`${surfaceCardClass} max-w-md w-full rounded-kin-xl p-8`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground mb-2">Forgot Password?</h1>
          <p className="text-muted font-inter text-sm">
            Enter your registered email and we'll send you a reset link.
          </p>
        </div>

        {successMessage ? (
          <div className="space-y-6">
            <div
              role="status"
              aria-live="polite"
              className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-kin font-inter text-sm"
            >
              {successMessage}
            </div>
            <Link
              to="/login"
              className={`${primaryActionClass} block w-full text-center py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg focus:ring-4 focus:ring-ring shadow-kin-medium hover:shadow-kin-strong transition-all duration-200`}
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter text-sm"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium font-inter text-foreground mb-2"
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${textFieldClass} w-full px-4 py-3 rounded-kin-sm transition`}
                placeholder="you@example.com"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`${primaryActionClass} w-full py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg focus:ring-4 focus:ring-ring shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-muted font-inter text-sm hover:text-foreground transition"
            aria-label="Go back to sign in page"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
