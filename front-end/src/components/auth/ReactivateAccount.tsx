import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';
import { isAccountDeactivated } from '../../utils/account';
import Logo from '../common/Logo';

const ReactivateAccount: React.FC = () => {
  const { user, isLoading, reactivateAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAccountDeactivated(user)) return <Navigate to="/discover" replace />;

  const handleReactivate = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await reactivateAccount();
      navigate('/discover', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reactivate account. Please try again.'));
      setIsSubmitting(false);
    }
  };

  const handleStayDeactivated = async () => {
    setIsSubmitting(true);
    await logout();
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
            Welcome back, {user.firstName}
          </h1>
          <p className="text-kin-navy font-inter">
            Your account is currently deactivated. Would you like to reactivate it?
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-6"
          >
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleReactivate}
            disabled={isSubmitting}
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
      </div>
    </div>
  );
};

export default ReactivateAccount;
