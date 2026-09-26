import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { blockAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import type { BlockedAccount, BlockedAccountUser } from '../../types';

const formatBlockedDate = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatLocation = (user: BlockedAccountUser): string =>
  [user.currentProvince, user.currentCountry].filter(Boolean).join(', ');

const BlockedAccounts: React.FC = () => {
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  useEffect(() => {
    void loadBlockedAccounts();
  }, []);

  const loadBlockedAccounts = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await blockAPI.getBlockedUsers();
      if (response.success) {
        setBlockedAccounts(response.blockedUsers ?? []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to load blocked accounts'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId: string, firstName: string) => {
    setUnblockingUserId(userId);
    setError('');
    setSuccessMessage('');
    try {
      await blockAPI.unblockUser(userId);
      setBlockedAccounts((prev) => prev.filter((row) => row.blocked?._id !== userId));
      setSuccessMessage(`${firstName} has been unblocked.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Unable to unblock ${firstName}`));
    } finally {
      setUnblockingUserId(null);
    }
  };

  const visibleAccounts = blockedAccounts.filter((row) => row.blocked !== null);

  return (
    <div className="bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          <div className="px-8 py-8">
            <Link
              to="/settings/privacy"
              className="inline-flex items-center gap-1 text-sm font-inter text-kin-teal hover:text-kin-teal-700 transition mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
              aria-label="Back to Privacy"
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
              Privacy
            </Link>

            <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
              Blocked Accounts
            </h1>
            <p className="text-kin-navy font-inter mb-8">
              Blocked people can’t message you or see you in Discover. Unblocking someone does not
              restore a previous connection — you’ll both need to send a new Meet request.
            </p>

            <section>
              {!isLoading && visibleAccounts.length > 0 && (
                <p className="text-xs font-inter text-kin-navy/60 mb-3">
                  {visibleAccounts.length} {visibleAccounts.length === 1 ? 'account' : 'accounts'}
                </p>
              )}

              {successMessage && (
                <p role="status" className="text-green-600 text-sm font-inter mb-4">
                  {successMessage}
                </p>
              )}

              {error && (
                <p role="alert" className="text-kin-coral text-sm font-inter mb-4">
                  {error}
                </p>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-3 h-12 w-12 animate-spin rounded-full border-b-2 border-kin-coral" />
                  <p className="font-inter text-sm text-kin-navy">Loading blocked accounts…</p>
                </div>
              ) : visibleAccounts.length === 0 ? (
                <div className="rounded-kin-lg border border-kin-stone-200 bg-kin-stone-50 px-5 py-8 text-center">
                  <p className="font-inter text-kin-navy">You haven’t blocked anyone.</p>
                  <p className="mt-1 text-sm font-inter text-kin-navy/60">
                    You can block someone from their profile or from the menu beside them in My
                    Kins.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-kin-stone-200" aria-label="Blocked accounts">
                  {visibleAccounts.map((row) => {
                    const blockedUser = row.blocked!;
                    const location = formatLocation(blockedUser);
                    const blockedOn = formatBlockedDate(row.createdAt);
                    const isUnblocking = unblockingUserId === blockedUser._id;

                    return (
                      <li key={row._id} className="flex items-center gap-4 py-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-kin-coral to-kin-teal text-lg font-bold font-montserrat text-white shadow-kin-soft"
                          aria-hidden
                        >
                          {blockedUser.firstName.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold font-inter text-kin-navy">
                            {blockedUser.firstName}
                          </p>
                          {location && (
                            <p className="truncate text-sm font-inter text-kin-teal">{location}</p>
                          )}
                          {blockedOn && (
                            <p className="mt-0.5 text-xs font-inter text-kin-navy/60">
                              Blocked on {blockedOn}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleUnblock(blockedUser._id, blockedUser.firstName)}
                          disabled={isUnblocking}
                          className="shrink-0 text-sm font-semibold font-inter text-kin-teal hover:text-kin-teal-700 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                          aria-label={`Unblock ${blockedUser.firstName}`}
                        >
                          {isUnblocking ? 'Unblocking…' : 'Unblock'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockedAccounts;
