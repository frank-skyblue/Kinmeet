import React, { useState } from 'react';
import { settingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';

type SectionState = {
  editing: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
};

const initialSection = (): SectionState => ({
  editing: false,
  loading: false,
  error: null,
  success: null,
});

const AccountEmailSection: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [section, setSection] = useState<SectionState>(initialSection);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  const handleEdit = () => {
    setNewEmail('');
    setEmailPassword('');
    setSection({ ...initialSection(), editing: true });
  };

  const handleCancel = () => {
    setSection(initialSection());
    setNewEmail('');
    setEmailPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSection((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await settingsAPI.changeEmail({ newEmail, currentPassword: emailPassword });
      await refreshUser();
      setSection({ editing: false, loading: false, error: null, success: 'Email updated successfully.' });
      setNewEmail('');
      setEmailPassword('');
    } catch (err: unknown) {
      setSection((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to update email'),
      }));
    }
  };

  return (
    <section className="py-6" aria-labelledby="email-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2
            id="email-heading"
            className="text-sm font-semibold font-inter text-foreground mb-1"
          >
            Email Address
          </h2>
          {!section.editing && (
            <p className="text-foreground font-inter text-sm truncate">
              {user?.email ?? '—'}
            </p>
          )}
          {section.success && !section.editing && (
            <p role="status" className="text-green-600 text-sm mt-1 font-inter">
              {section.success}
            </p>
          )}
        </div>
        {!section.editing && (
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 text-sm font-semibold font-inter text-muted hover:text-kin-teal-700 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Edit email address"
          >
            Edit
          </button>
        )}
      </div>

      {section.editing && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <div>
            <label
              htmlFor="new-email"
              className="block text-sm font-inter text-foreground mb-1"
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
              className="w-full border border-border rounded-kin-sm px-3 py-2 text-sm font-inter text-foreground placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="email-current-password"
              className="block text-sm font-inter text-foreground mb-1"
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
              className="w-full border border-border rounded-kin-sm px-3 py-2 text-sm font-inter text-foreground placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter your current password"
            />
          </div>
          {section.error && (
            <p role="alert" className="text-kin-coral text-sm font-inter">
              {section.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={section.loading}
              className="bg-kin-teal text-white px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat hover:bg-kin-teal-700 cursor-pointer transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {section.loading ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={section.loading}
              className="px-4 py-2 rounded-kin-sm text-sm font-semibold font-montserrat text-foreground hover:bg-surface-muted cursor-pointer transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AccountEmailSection;
