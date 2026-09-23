import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import type {
  AdminFeedbackItem,
  AdminFeedbackPagination,
  AdminReportItem,
  AdminReportPagination,
  AdminReportStatus,
} from '../../types';
import { getErrorMessage } from '../../utils/error';
import {
  categoryTagClassName,
  contactLabel,
  contactTagClassName,
  emailInitial,
  feedbackRangeLabel,
  formatAdminStatus,
  formatAdminSubmittedParts,
  screenshotCountLabel,
  statusTagClassName,
} from '../../utils/adminFeedback';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';
import { REPORT_STATUS_OPTIONS, reasonTagClassName, reportRangeLabel } from '../../utils/adminReports';
import AdminFeedbackDetails from './AdminFeedbackDetails';
import AdminReportDetails from './AdminReportDetails';

// Session gate and logout state.
type AdminView = 'checking' | 'network_error' | 'unauthenticated' | 'authenticated' | 'logging_out' | 'logout_unconfirmed';

export type AdminSection = 'feedback' | 'reports';

type AdminPageProps = {
  section?: AdminSection;
};

const AdminPage: React.FC<AdminPageProps> = ({ section = 'feedback' }) => {
  const [view, setView] = useState<AdminView>('checking');
  const [sessionError, setSessionError] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);

  const handleCheckSession = async () => {
    setView('checking');
    setSessionError('');
    try {
      const session = await adminAPI.getSession();
      setView(session.authenticated ? 'authenticated' : 'unauthenticated');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setView('unauthenticated');
        return;
      }
      setSessionError(
        axios.isAxiosError(err) && !err.response
          ? 'Unable to reach the admin service.'
          : 'Unable to verify the admin session.',
      );
      setView('network_error');
    }
  };

  useEffect(() => {
    void handleCheckSession();
  }, []);

  const handleAuthenticated = () => {
    setView('authenticated');
  };

  const handleSessionExpired = () => {
    setView('unauthenticated');
  };

  const handleLogout = async () => {
    setView((current) => (current === 'authenticated' ? 'logging_out' : current));
    setLogoutBusy(true);
    try {
      await adminAPI.logout();
      setView('unauthenticated');
    } catch {
      setView('logout_unconfirmed');
    } finally {
      setLogoutBusy(false);
    }
  };

  if (view === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div role="status" className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4" aria-hidden></div>
          <p className="text-kin-navy font-inter">Loading...</p>
        </div>
      </div>
    );
  }

  if (view === 'network_error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
        <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8 text-center">
          <p role="alert" className="text-kin-navy font-inter mb-6">
            {sessionError}
          </p>
          <button
            type="button"
            onClick={() => {
              void handleCheckSession();
            }}
            className="bg-kin-coral text-white py-3 px-6 rounded-kin-sm font-bold font-montserrat hover:bg-kin-coral-600 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (view === 'unauthenticated') {
    return <AdminLogin onAuthenticated={handleAuthenticated} />;
  }

  return (
    <AdminLayout
      section={section}
      onLogout={() => {
        void handleLogout();
      }}
      logoutUnconfirmed={view === 'logout_unconfirmed'}
      logoutBusy={logoutBusy}
    >
      {view === 'authenticated' ? (
        section === 'reports' ? (
          <AdminReports onSessionExpired={handleSessionExpired} />
        ) : (
          <AdminFeedback onSessionExpired={handleSessionExpired} />
        )
      ) : null}
    </AdminLayout>
  );
};

// Shared-password login.
type AdminLoginProps = {
  onAuthenticated: () => void;
};

const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await adminAPI.login(password);
      onAuthenticated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
      <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl font-bold font-montserrat text-kin-navy mb-2">KinMeet Admin</h1>
          <p className="text-kin-teal font-inter">Sign in to review feedback</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              role="alert"
              className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium font-inter text-kin-navy mb-2">
              Password
            </label>
            <input
              type="password"
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-kin-coral text-white py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg hover:bg-kin-coral-600 focus:ring-4 focus:ring-kin-coral-300 shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8 mb-4"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Independent admin shell.
type AdminLayoutProps = {
  children: React.ReactNode;
  section?: AdminSection;
  onLogout: () => void;
  logoutUnconfirmed: boolean;
  logoutBusy: boolean;
};

const FEEDBACK_ICON_PATH =
  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';

const SHIELD_ICON_PATH =
  'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';

const shellClassName = 'max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-10';

const REPORTS_ICON_PATH =
  'M3 3v18h18M7 16V9m5 7V5m5 11v-4';

const navLinkClassName = (active: boolean) =>
  active
    ? 'inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium font-inter rounded-kin-sm text-kin-coral bg-kin-coral-50 shadow-kin-soft'
    : 'inline-flex items-center gap-2 px-5 py-2.5 text-base font-medium font-inter rounded-kin-sm text-kin-navy hover:bg-kin-beige transition';

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  section = 'feedback',
  onLogout,
  logoutUnconfirmed,
  logoutBusy,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-kin-beige">
      <header className="shrink-0 bg-white shadow-kin-soft border-b border-kin-stone-200">
        <div className={shellClassName}>
          <div className="flex min-h-18 flex-wrap items-center gap-x-6 gap-y-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Logo size="md" className="shrink-0" />
              <span className="truncate text-xl font-bold font-montserrat text-kin-navy sm:text-2xl">
                KinMeet
              </span>
            </div>

            <nav aria-label="Admin" className="order-3 flex w-full flex-wrap items-center gap-2 sm:order-none sm:w-auto">
              <Link
                to="/admin"
                aria-current={section === 'feedback' ? 'page' : undefined}
                className={navLinkClassName(section === 'feedback')}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={FEEDBACK_ICON_PATH} />
                </svg>
                Feedback
              </Link>
              <Link
                to="/admin/reports"
                aria-current={section === 'reports' ? 'page' : undefined}
                className={navLinkClassName(section === 'reports')}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={REPORTS_ICON_PATH} />
                </svg>
                Reports
              </Link>
            </nav>

            <div className="ml-auto flex items-center justify-end gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium font-inter text-kin-navy">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={SHIELD_ICON_PATH} />
                </svg>
                Admin
              </span>
              <span className="h-5 w-px shrink-0 bg-kin-stone-300" aria-hidden />
              <button
                type="button"
                onClick={onLogout}
                disabled={logoutBusy}
                className="text-sm font-semibold font-montserrat text-kin-navy hover:text-kin-coral cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      {logoutUnconfirmed && (
        <div role="alert" className={`${shellClassName} pt-6`}>
          <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p>We couldn’t confirm that you were logged out. Your admin session may still be active.</p>
            <button
              type="button"
              onClick={onLogout}
              disabled={logoutBusy}
              className="self-start sm:self-auto bg-kin-coral text-white px-4 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 transition disabled:opacity-50 cursor-pointer"
            >
              Retry log out
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 ${shellClassName} py-8`}>
        {children}
      </main>
    </div>
  );
};

// Feedback list and local pagination.
type AdminPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  ariaLabel: string;
};

const AdminPagination: React.FC<AdminPaginationProps> = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  ariaLabel,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex shrink-0 items-center justify-center gap-5 text-sm font-inter text-kin-navy/70"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="text-kin-teal underline-offset-2 transition hover:text-kin-navy hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline cursor-pointer"
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="tabular-nums text-kin-navy/60" aria-live="polite">
        {currentPage}/{totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="text-kin-teal underline-offset-2 transition hover:text-kin-navy hover:underline disabled:pointer-events-none disabled:opacity-35 disabled:no-underline cursor-pointer"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
};

const VIEW_ARROW_PATH = 'M9 5l7 7-7 7';

const viewButtonClassName =
  'inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-kin-sm px-2 text-kin-coral font-semibold hover:bg-kin-coral-50 cursor-pointer hover:text-kin-coral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral';

const AdminSubmittedStamp: React.FC<{ value: string }> = ({ value }) => {
  const { date, time } = formatAdminSubmittedParts(value);
  return (
    <span className="flex flex-col leading-snug">
      <span>{date}</span>
      {time ? <span className="text-xs text-kin-navy/60">{time}</span> : null}
    </span>
  );
};

const AdminViewButton: React.FC<{ email: string; onClick: () => void }> = ({ email, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={viewButtonClassName}
    aria-label={`View details for ${email || 'this submission'}`}
  >
    View
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={VIEW_ARROW_PATH} />
    </svg>
  </button>
);

type AdminFeedbackProps = {
  onSessionExpired: () => void;
};

const AdminFeedback: React.FC<AdminFeedbackProps> = ({ onSessionExpired }) => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [pagination, setPagination] = useState<AdminFeedbackPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminFeedbackItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    let cancelled = false;

    const loadFeedback = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminAPI.listFeedback(page);
        if (cancelled) return;
        setItems(response.feedback);
        setPagination(response.pagination);
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          onSessionExpiredRef.current();
          return;
        }
        setError(getErrorMessage(err, 'Unable to load feedback.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFeedback();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const handleRetry = () => {
    setReloadToken((current) => current + 1);
  };

  const handlePrevious = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const handleNext = () => {
    setPage((current) => current + 1);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const totalPages = pagination?.totalPages ?? 0;
  const showEmpty = !isLoading && !error && items.length === 0;
  const showList = !isLoading && !error && items.length > 0;
  const rangeLabel =
    showList && pagination ? feedbackRangeLabel(pagination) : null;

  return (
    <section aria-labelledby="admin-feedback-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-feedback-heading" className="text-3xl font-bold font-montserrat text-kin-navy sm:text-4xl">
          Feedback
        </h1>
        <p className="mt-2 text-base font-inter text-kin-teal">
          Review feedback submitted by KinMeet users.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="self-start sm:self-auto bg-kin-coral text-white px-4 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {(isLoading || showEmpty || showList) && (
      <div className="bg-white rounded-kin-xl border border-kin-stone-200 shadow-kin-medium overflow-hidden">
        {isLoading && (
          <div role="status" className="px-6 py-16 text-center text-kin-navy font-inter">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4" aria-hidden />
            <p>Loading feedback...</p>
          </div>
        )}
        {showEmpty && (
          <div className="px-6 py-16 text-center font-inter">
            <p className="text-lg font-semibold font-montserrat text-kin-navy cursor-pointer">No feedback yet.</p>
            <p className="mt-2 text-sm text-kin-teal">New submissions will appear here.</p>
          </div>
        )}
        {showList && (
          <>
          <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left font-inter text-base text-kin-navy">
            <caption className="sr-only">Submitted feedback</caption>
            <thead className="bg-kin-beige-300 border-b border-kin-stone-200">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">User</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">Category</th>
                <th scope="col" className="px-5 py-3 font-semibold">Feedback</th>
                <th scope="col" className="px-5 py-3 font-semibold">Contact</th>
                <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="w-24 px-3 py-3 font-semibold">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-kin-stone-200">
                  <td className="w-[24%] max-w-xs px-5 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                        aria-hidden
                      >
                        {emailInitial(item.email)}
                      </div>
                      <span className="min-w-0 truncate font-medium" title={item.email || undefined}>
                        {item.email || 'Email unavailable'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={categoryTagClassName(item.category)}>{item.category}</span>
                  </td>
                  <td className="min-w-0 px-5 py-3 align-middle">
                    <p className="line-clamp-2 break-words leading-snug">{item.message}</p>
                    {item.screenshots?.length > 0 && (
                      <p className="mt-0.5 text-xs leading-tight text-kin-navy/60">
                        {screenshotCountLabel(item.screenshots.length)}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={contactTagClassName(item.followUp)}>{contactLabel(item.followUp)}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle text-sm text-kin-navy/80">
                    <AdminSubmittedStamp value={item.createdAt} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={statusTagClassName(item.status)}>{formatAdminStatus(item.status)}</span>
                  </td>
                  <td className="w-24 px-3 py-3 align-middle">
                    <AdminViewButton email={item.email} onClick={() => setSelectedItem(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="lg:hidden divide-y divide-kin-stone-200">
          {items.map((item) => (
            <li key={item.id} className="p-5 space-y-3 font-inter text-base text-kin-navy">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                  aria-hidden
                >
                  {emailInitial(item.email)}
                </div>
                <p className="min-w-0 font-semibold font-montserrat [overflow-wrap:anywhere] cursor-pointer">{item.email || 'Email unavailable'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={categoryTagClassName(item.category)}>{item.category}</span>
                <span className={contactTagClassName(item.followUp)}>{contactLabel(item.followUp)}</span>
                <span className={statusTagClassName(item.status)}>{formatAdminStatus(item.status)}</span>
              </div>
              <p className="line-clamp-2 break-words leading-snug">{item.message}</p>
              {item.screenshots?.length > 0 && (
                <p className="text-xs leading-tight text-kin-navy/60">{screenshotCountLabel(item.screenshots.length)}</p>
              )}
              <p className="text-sm text-kin-navy/70">
                <AdminSubmittedStamp value={item.createdAt} />
              </p>
              <AdminViewButton email={item.email} onClick={() => setSelectedItem(item)} />
            </li>
          ))}
        </ul>

        {(rangeLabel || totalPages > 1) && (
          <div className="flex flex-col gap-3 border-t border-kin-stone-200 bg-kin-beige/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            {rangeLabel && (
              <p className="text-sm font-inter text-kin-navy/70">{rangeLabel}</p>
            )}
            <AdminPagination
              currentPage={pagination?.page ?? page}
              totalPages={totalPages}
              onPrevious={handlePrevious}
              onNext={handleNext}
              ariaLabel="Feedback pagination"
            />
          </div>
        )}
          </>
        )}
      </div>
      )}

      {selectedItem && (
        <AdminFeedbackDetails item={selectedItem} onClose={handleCloseDetails} />
      )}
    </section>
  );
};

// Moderation status control. Mirrors the read-only status tag used elsewhere,
// but lets an admin move a report through new -> reviewing -> resolved.
type AdminReportStatusSelectProps = {
  reportId: string;
  value: AdminReportStatus;
  busy: boolean;
  onChange: (status: AdminReportStatus) => void;
};

const AdminReportStatusSelect: React.FC<AdminReportStatusSelectProps> = ({
  reportId,
  value,
  busy,
  onChange,
}) => (
  <label className="inline-flex items-center gap-2">
    <span className="sr-only">Status for report {reportId}</span>
    <select
      value={value}
      disabled={busy}
      onChange={(event) => onChange(event.target.value as AdminReportStatus)}
      className="rounded-kin-sm border border-kin-stone-300 bg-white px-2 py-1 text-sm font-inter text-kin-navy cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-kin-coral disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {REPORT_STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {formatAdminStatus(option)}
        </option>
      ))}
    </select>
  </label>
);

// Reports list — mirrors AdminFeedback.
type AdminReportsProps = {
  onSessionExpired: () => void;
};

const AdminReports: React.FC<AdminReportsProps> = ({ onSessionExpired }) => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [pagination, setPagination] = useState<AdminReportPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminReportItem | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminAPI.listReports(page);
        if (cancelled) return;
        setItems(response.reports);
        setPagination(response.pagination);
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          onSessionExpiredRef.current();
          return;
        }
        setError(getErrorMessage(err, 'Unable to load reports.'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  const handleStatusChange = async (reportId: string, status: AdminReportStatus) => {
    setStatusBusyId(reportId);
    setStatusError('');
    try {
      const response = await adminAPI.updateReportStatus(reportId, status);
      setItems((current) =>
        current.map((item) => (item.id === reportId ? response.report : item)),
      );
      setSelectedItem((current) =>
        current && current.id === reportId ? response.report : current,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        onSessionExpiredRef.current();
        return;
      }
      setStatusError(getErrorMessage(err, 'Unable to update report status.'));
    } finally {
      setStatusBusyId(null);
    }
  };

  const handleRetry = () => setReloadToken((current) => current + 1);
  const handlePrevious = () => setPage((current) => Math.max(1, current - 1));
  const handleNext = () => setPage((current) => current + 1);
  const handleCloseDetails = () => setSelectedItem(null);

  const totalPages = pagination?.totalPages ?? 0;
  const showEmpty = !isLoading && !error && items.length === 0;
  const showList = !isLoading && !error && items.length > 0;
  const rangeLabel = showList && pagination ? reportRangeLabel(pagination) : null;

  return (
    <section aria-labelledby="admin-reports-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-reports-heading" className="text-3xl font-bold font-montserrat text-kin-navy sm:text-4xl">
          Reports
        </h1>
        <p className="mt-2 text-base font-inter text-kin-teal">
          Review reports submitted by KinMeet users.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="self-start sm:self-auto bg-kin-coral text-white px-4 py-2 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {statusError && (
        <p role="alert" className="text-kin-coral-700 font-inter text-sm">
          {statusError}
        </p>
      )}

      {(isLoading || showEmpty || showList) && (
      <div className="bg-white rounded-kin-xl border border-kin-stone-200 shadow-kin-medium overflow-hidden">
        {isLoading && (
          <div role="status" className="px-6 py-16 text-center text-kin-navy font-inter">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4" aria-hidden />
            <p>Loading reports...</p>
          </div>
        )}
        {showEmpty && (
          <div className="px-6 py-16 text-center font-inter">
            <p className="text-lg font-semibold font-montserrat text-kin-navy cursor-pointer">No reports yet.</p>
            <p className="mt-2 text-sm text-kin-teal">New reports will appear here.</p>
          </div>
        )}
        {showList && (
          <>
          <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left font-inter text-base text-kin-navy">
            <caption className="sr-only">Submitted reports</caption>
            <thead className="bg-kin-beige-300 border-b border-kin-stone-200">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Reported user</th>
                <th scope="col" className="px-5 py-3 font-semibold">Reported by</th>
                <th scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">Reason</th>
                <th scope="col" className="px-5 py-3 font-semibold">Details</th>
                <th scope="col" className="px-5 py-3 font-semibold">Date</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                <th scope="col" className="w-24 px-3 py-3 font-semibold">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-kin-stone-200">
                  <td className="w-[22%] max-w-xs px-5 py-3 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                        aria-hidden
                      >
                        {emailInitial(item.reportedEmail)}
                      </div>
                      <span className="min-w-0 truncate font-medium" title={item.reportedEmail || undefined}>
                        {item.reportedEmail || 'Email unavailable'}
                      </span>
                    </div>
                  </td>
                  <td className="w-[20%] max-w-xs px-5 py-3 align-middle">
                    <span className="block min-w-0 truncate" title={item.reporterEmail || undefined}>
                      {item.reporterEmail || 'Email unavailable'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <span className={reasonTagClassName(item.reason)}>{item.reason}</span>
                  </td>
                  <td className="min-w-0 px-5 py-3 align-middle">
                    <p className="line-clamp-2 break-words leading-snug">
                      {item.details && item.details.trim().length > 0 ? item.details : (
                        <span className="text-kin-navy/50">No additional details</span>
                      )}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle text-sm text-kin-navy/80">
                    <AdminSubmittedStamp value={item.createdAt} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 align-middle">
                    <AdminReportStatusSelect
                      reportId={item.id}
                      value={item.status}
                      busy={statusBusyId === item.id}
                      onChange={(status) => void handleStatusChange(item.id, status)}
                    />
                  </td>
                  <td className="w-24 px-3 py-3 align-middle">
                    <AdminViewButton email={item.reportedEmail} onClick={() => setSelectedItem(item)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="lg:hidden divide-y divide-kin-stone-200">
          {items.map((item) => (
            <li key={item.id} className="p-5 space-y-3 font-inter text-base text-kin-navy">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kin-coral to-kin-teal text-sm font-bold font-montserrat text-white shadow-kin-soft"
                  aria-hidden
                >
                  {emailInitial(item.reportedEmail)}
                </div>
                <div className="min-w-0">
                  <p className="min-w-0 font-semibold font-montserrat [overflow-wrap:anywhere] cursor-pointer">
                    {item.reportedEmail || 'Email unavailable'}
                  </p>
                  <p className="text-sm text-kin-navy/70 [overflow-wrap:anywhere]">
                    Reported by {item.reporterEmail || 'unknown'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={reasonTagClassName(item.reason)}>{item.reason}</span>
                <AdminReportStatusSelect
                  reportId={item.id}
                  value={item.status}
                  busy={statusBusyId === item.id}
                  onChange={(status) => void handleStatusChange(item.id, status)}
                />
              </div>
              <p className="line-clamp-2 break-words leading-snug">
                {item.details && item.details.trim().length > 0 ? item.details : (
                  <span className="text-kin-navy/50">No additional details</span>
                )}
              </p>
              <p className="text-sm text-kin-navy/70">
                <AdminSubmittedStamp value={item.createdAt} />
              </p>
              <AdminViewButton email={item.reportedEmail} onClick={() => setSelectedItem(item)} />
            </li>
          ))}
        </ul>

        {(rangeLabel || totalPages > 1) && (
          <div className="flex flex-col gap-3 border-t border-kin-stone-200 bg-kin-beige/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            {rangeLabel && (
              <p className="text-sm font-inter text-kin-navy/70">{rangeLabel}</p>
            )}
            <AdminPagination
              currentPage={pagination?.page ?? page}
              totalPages={totalPages}
              onPrevious={handlePrevious}
              onNext={handleNext}
              ariaLabel="Reports pagination"
            />
          </div>
        )}
          </>
        )}
      </div>
      )}

      {selectedItem && (
        <AdminReportDetails item={selectedItem} onClose={handleCloseDetails} />
      )}
    </section>
  );
};

export default AdminPage;
