import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

export type AdminSection = 'feedback' | 'reports';

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

export default AdminLayout;
