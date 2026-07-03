import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DeleteAccountModal from '../profile/DeleteAccountModal';
import { settingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';

interface SectionState {
  editing: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
}

const initialSection = (): SectionState => ({
  editing: false,
  loading: false,
  error: null,
  success: null,
});

const AccountSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Email section state
  const [emailSection, setEmailSection] = useState<SectionState>(initialSection);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Username section state
  const [usernameSection, setUsernameSection] = useState<SectionState>(initialSection);
  const [newUsername, setNewUsername] = useState('');

  // Password section state
  const [passwordSection, setPasswordSection] = useState<SectionState>(initialSection);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEmailEdit = () => {
    setNewEmail('');
    setEmailPassword('');
    setEmailSection({ ...initialSection(), editing: true });
  };

  const handleEmailCancel = () => {
    setEmailSection(initialSection());
    setNewEmail('');
    setEmailPassword('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSection((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await settingsAPI.changeEmail({ newEmail, currentPassword: emailPassword });
      await refreshUser();
      setEmailSection({ editing: false, loading: false, error: null, success: 'Email updated successfully.' });
      setNewEmail('');
      setEmailPassword('');
    } catch (err: unknown) {
      setEmailSection((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to update email'),
      }));
    }
  };

  const handleUsernameEdit = () => {
    setNewUsername(user?.username ?? '');
    setUsernameSection({ ...initialSection(), editing: true });
  };

  const handleUsernameCancel = () => {
    setUsernameSection(initialSection());
    setNewUsername('');
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSection((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await settingsAPI.changeUsername({ newUsername });
      await refreshUser();
      setUsernameSection({ editing: false, loading: false, error: null, success: 'Username updated successfully.' });
      setNewUsername('');
    } catch (err: unknown) {
      setUsernameSection((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to update username'),
      }));
    }
  };

  const handlePasswordEdit = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSection({ ...initialSection(), editing: true });
  };

  const handlePasswordCancel = () => {
    setPasswordSection(initialSection());
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordSection((prev) => ({ ...prev, error: 'New passwords do not match' }));
      return;
    }
    setPasswordSection((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await settingsAPI.changePassword({ currentPassword, newPassword });
      setPasswordSection({ editing: false, loading: false, error: null, success: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordSection((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to update password'),
      }));
    }
  };

  return (
    <>
      <div className="bg-kin-beige py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
            <div className="px-8 py-8">
              <Link
                to="/settings"
                className="inline-flex items-center gap-1 text-sm font-inter text-kin-teal hover:text-kin-teal-700 transition mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                aria-label="Back to Settings and Privacy"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Settings &amp; Privacy
              </Link>

              <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">Account</h1>
              <p className="text-kin-navy font-inter mb-8">
                Manage your account settings and permanently remove your KinMeet profile.
              </p>

              <div className="divide-y divide-kin-stone-200 mb-8">
                {/* Email Address section */}
                <section className="py-6" aria-labelledby="email-heading">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2
                        id="email-heading"
                        className="text-sm font-semibold font-inter text-kin-navy mb-1"
                      >
                        Email Address
                      </h2>
                      {!emailSection.editing && (
                        <p className="text-kin-navy font-inter text-sm truncate">
                          {user?.email ?? '—'}
                        </p>
                      )}
                      {emailSection.success && !emailSection.editing && (
                        <p role="status" className="text-green-600 text-sm mt-1 font-inter">
                          {emailSection.success}
                        </p>
                      )}
                    </div>
                    {!emailSection.editing && (
                      <button
                        type="button"
                        onClick={handleEmailEdit}
                        className="shrink-0 text-sm font-semibold font-inter text-kin-teal hover:text-kin-teal-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        aria-label="Edit email address"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {emailSection.editing && (
                    <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3" noValidate>
                      <div>
                        <label
                          htmlFor="new-email"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          New email address
                        </label>
                        <input
                          id="new-email"
                          type="email"
                          autoComplete="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email-current-password"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          Current password
                        </label>
                        <input
                          id="email-current-password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="Enter your current password"
                        />
                      </div>
                      {emailSection.error && (
                        <p role="alert" className="text-kin-coral text-sm font-inter">
                          {emailSection.error}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={emailSection.loading}
                          className="bg-kin-teal text-white px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat hover:bg-kin-teal-700 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          {emailSection.loading ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleEmailCancel}
                          disabled={emailSection.loading}
                          className="px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat text-kin-navy hover:bg-kin-stone-100 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>

                {/* Username section */}
                <section className="py-6" aria-labelledby="username-heading">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2
                        id="username-heading"
                        className="text-sm font-semibold font-inter text-kin-navy mb-1"
                      >
                        Username
                      </h2>
                      {!usernameSection.editing && (
                        <p className="text-kin-navy font-inter text-sm">
                          {user?.username ? `@${user.username}` : '—'}
                        </p>
                      )}
                      {usernameSection.success && !usernameSection.editing && (
                        <p role="status" className="text-green-600 text-sm mt-1 font-inter">
                          {usernameSection.success}
                        </p>
                      )}
                    </div>
                    {!usernameSection.editing && (
                      <button
                        type="button"
                        onClick={handleUsernameEdit}
                        className="shrink-0 text-sm font-semibold font-inter text-kin-teal hover:text-kin-teal-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        aria-label="Edit username"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {usernameSection.editing && (
                    <form onSubmit={handleUsernameSubmit} className="mt-4 space-y-3" noValidate>
                      <div>
                        <label
                          htmlFor="new-username"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          New username
                        </label>
                        <input
                          id="new-username"
                          type="text"
                          autoComplete="username"
                          required
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="3–30 characters: a–z, 0–9, _"
                        />
                      </div>
                      {usernameSection.error && (
                        <p role="alert" className="text-kin-coral text-sm font-inter">
                          {usernameSection.error}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={usernameSection.loading}
                          className="bg-kin-teal text-white px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat hover:bg-kin-teal-700 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          {usernameSection.loading ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleUsernameCancel}
                          disabled={usernameSection.loading}
                          className="px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat text-kin-navy hover:bg-kin-stone-100 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>

                {/* Change Password section */}
                <section className="py-6" aria-labelledby="password-heading">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2
                        id="password-heading"
                        className="text-sm font-semibold font-inter text-kin-navy mb-1"
                      >
                        Change Password
                      </h2>
                      {!passwordSection.editing && (
                        <p className="text-kin-navy font-inter text-sm">
                          Update the password for your KinMeet account.
                        </p>
                      )}
                      {passwordSection.success && !passwordSection.editing && (
                        <p role="status" className="text-green-600 text-sm mt-1 font-inter">
                          {passwordSection.success}
                        </p>
                      )}
                    </div>
                    {!passwordSection.editing && (
                      <button
                        type="button"
                        onClick={handlePasswordEdit}
                        className="shrink-0 text-sm font-semibold font-inter text-kin-teal hover:text-kin-teal-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        aria-label="Change password"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  {passwordSection.editing && (
                    <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3" noValidate>
                      <div>
                        <label
                          htmlFor="current-password"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          Current password
                        </label>
                        <input
                          id="current-password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="Enter your current password"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new-password"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          New password
                        </label>
                        <input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="8+ chars, upper, lower, number"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="confirm-password"
                          className="block text-sm font-inter text-kin-navy mb-1"
                        >
                          Confirm new password
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full border border-kin-stone-300 rounded-kin-sm px-3 py-2 text-sm font-inter text-kin-navy placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-kin-teal"
                          placeholder="Re-enter new password"
                        />
                      </div>
                      {passwordSection.error && (
                        <p role="alert" className="text-kin-coral text-sm font-inter">
                          {passwordSection.error}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={passwordSection.loading}
                          className="bg-kin-teal text-white px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat hover:bg-kin-teal-700 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          {passwordSection.loading ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handlePasswordCancel}
                          disabled={passwordSection.loading}
                          className="px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat text-kin-navy hover:bg-kin-stone-100 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </div>

              {/* Delete Account section */}
              <section aria-labelledby="delete-account-heading">
                <h2
                  id="delete-account-heading"
                  className="text-sm font-semibold font-inter text-kin-navy mb-3"
                >
                  Delete Account
                </h2>
                <p className="text-kin-navy font-inter mb-4">
                  Permanently delete your account, kins, and messages. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full sm:w-auto bg-kin-stone-200 text-kin-coral-700 px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                >
                  Delete Account
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default AccountSettings;
