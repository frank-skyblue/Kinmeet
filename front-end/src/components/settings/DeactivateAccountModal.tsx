import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';

export const ACCOUNT_DEACTIVATED_MESSAGE =
  "Your account has been deactivated. Sign in whenever you're ready to reactivate it.";

interface DeactivateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeactivateAccountModal: React.FC<DeactivateAccountModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || isDeactivating) return;

    setIsDeactivating(true);
    setError('');
    try {
      await settingsAPI.deactivateAccount(currentPassword);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to deactivate account'));
      setIsDeactivating(false);
      return;
    }

    // Navigate first: this device's token is already revoked, so logout's requests end the
    // session, and doing that on a protected page would redirect to /reactivate.
    navigate('/login', { replace: true, state: { flash: ACCOUNT_DEACTIVATED_MESSAGE } });
    await logout();
  };

  const handleClose = () => {
    setCurrentPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-account-title"
        className="bg-white rounded-kin-xl shadow-kin-strong max-w-md w-full p-6"
      >
        <h2
          id="deactivate-account-title"
          className="text-xl font-bold font-montserrat text-kin-navy mb-2"
        >
          Deactivate Account
        </h2>
        <p className="text-kin-navy font-inter mb-3">
          Taking a break? Deactivating your account hides your profile and pauses notifications.
          Your information will be saved, and you can reactivate your account whenever you're ready.
        </p>
        <p className="text-kin-navy font-inter text-sm mb-4">
          Deactivation is temporary and is not the same as deleting your account. Your kins,
          messages, and profile stay saved. To permanently remove your data, use Delete Account
          instead.
        </p>

        <form onSubmit={handleDeactivate} noValidate>
          <label
            htmlFor="deactivate-current-password"
            className="block text-sm font-inter text-kin-navy mb-1"
          >
            Current password
          </label>
          <input
            id="deactivate-current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm font-inter mb-4 focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none"
          />
          {error && (
            <div
              role="alert"
              className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-2 rounded-kin font-inter mb-4"
            >
              {error}
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeactivating}
              className="flex-1 bg-kin-stone-200 text-kin-navy py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 cursor-pointer transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeactivating || !currentPassword}
              className="flex-1 bg-kin-coral text-white py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivateAccountModal;
