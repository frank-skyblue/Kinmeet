import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';
import { isAccountDeactivated } from '../../utils/account';
import Logo from '../common/Logo';

/**
 * Shown in two cases:
 * - Signed in to a deactivated account (after login): reactivate with the current session.
 * - This device's session ended because the account was deactivated, possibly on another
 *   device. That session's token is revoked, so the password is required to sign in again
 *   before reactivating.
 */
const ReactivateAccount: React.FC = () => {
  const {
    user,
    isLoading,
    deactivatedEmail,
    login,
    reactivateAccount,
    logout,
    dismissDeactivated,
  } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return null;
  if (!user && !deactivatedEmail) return <Navigate to="/login" replace />;
  if (user && !isAccountDeactivated(user)) return <Navigate to="/discover" replace />;

  const needsPassword = !user && deactivatedEmail !== null;

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (needsPassword) {
        const signedInUser = await login(deactivatedEmail, password);
        // Already reactivated elsewhere in the meantime.
        if (!isAccountDeactivated(signedInUser)) {
          navigate('/discover', { replace: true });
          return;
        }
      }
      await reactivateAccount();
      navigate('/discover', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reactivate account. Please try again.'));
      setIsSubmitting(false);
    }
  };

  const handleStayDeactivated = async () => {
    setIsSubmitting(true);
    if (needsPassword) {
      dismissDeactivated();
    } else {
      await logout();
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
      <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-3">
            {user ? `Welcome back, ${user.firstName}` : 'Welcome back'}
          </h1>
          <p className="text-kin-navy font-inter">
            Your account is currently deactivated. Would you like to reactivate it?
          </p>
        </div>

        <form onSubmit={handleReactivate} className="space-y-6" noValidate>
          {error && (
            <div
              role="alert"
              className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter"
            >
              {error}
            </div>
          )}

          {needsPassword && (
            <div>
              <p className="text-sm text-kin-navy font-inter mb-3">
                For your security, enter the password for <strong>{deactivatedEmail}</strong>{' '}
                to continue.
              </p>
              <label
                htmlFor="reactivate-password"
                className="block text-sm font-medium font-inter text-kin-navy mb-2"
              >
                Password
              </label>
              <input
                id="reactivate-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
                placeholder="••••••••"
              />
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting || (needsPassword && !password)}
              className="w-full bg-kin-coral text-white py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reactivate Account
            </button>
            <button
              type="button"
              onClick={handleStayDeactivated}
              disabled={isSubmitting}
              className="w-full bg-kin-stone-200 text-kin-navy py-3 px-6 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stay Deactivated
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReactivateAccount;
