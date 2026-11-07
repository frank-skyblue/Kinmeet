import React, { useState } from 'react';
import { settingsAPI } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { handleLowercaseInput } from '../../utils/username';

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

const AccountUsernameSection: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [section, setSection] = useState<SectionState>(initialSection);
  const [newUsername, setNewUsername] = useState('');
  // Only checks while editing; the user's current username is recognised as their own.
  const availability = useUsernameAvailability(section.editing ? newUsername : '', user?.username);
  const canSave = availability.status === 'available' && !section.loading;

  const handleEdit = () => {
    setNewUsername(user?.username ?? '');
    setSection({ ...initialSection(), editing: true });
  };

  const handleCancel = () => {
    setSection(initialSection());
    setNewUsername('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSection((prev) => ({ ...prev, loading: true, error: null, success: null }));
    try {
      await settingsAPI.changeUsername({ newUsername });
      await refreshUser();
      setSection({ editing: false, loading: false, error: null, success: 'Username updated successfully.' });
      setNewUsername('');
    } catch (err: unknown) {
      setSection((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to update username'),
      }));
    }
  };

  return (
    <section className="py-6" aria-labelledby="username-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2
            id="username-heading"
            className="text-sm font-semibold font-inter text-foreground mb-1"
          >
            Username
          </h2>
          {!section.editing && (
            <p className="text-foreground font-inter text-sm">
              {user?.username ? `@${user.username}` : '—'}
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
            aria-label="Edit username"
          >
            Edit
          </button>
        )}
      </div>

      {section.editing && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <div>
            <label
              htmlFor="new-username"
              className="block text-sm font-inter text-foreground mb-1"
            >
              New username
            </label>
            <input
              id="new-username"
              type="text"
              autoComplete="username"
              required
              value={newUsername}
              onChange={(e) => handleLowercaseInput(e, setNewUsername)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
              className="w-full border border-border rounded-kin-sm px-3 py-2 text-sm font-inter text-foreground placeholder-kin-stone-400 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="3–30 characters: a–z, 0–9, _"
            />
            {availability.message && (
              <p
                aria-live="polite"
                data-testid="username-status"
                className={`text-sm font-inter mt-1 ${
                  availability.status === 'available'
                    ? 'text-green-600'
                    : availability.status === 'checking' || availability.status === 'current'
                      ? 'text-muted'
                      : 'text-kin-coral'
                }`}
              >
                {availability.message}
              </p>
            )}
          </div>
          {section.error && (
            <p role="alert" className="text-kin-coral text-sm font-inter">
              {section.error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!canSave}
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

export default AccountUsernameSection;
