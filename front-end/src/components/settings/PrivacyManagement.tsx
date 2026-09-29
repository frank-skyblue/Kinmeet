import React from 'react';
import { Link } from 'react-router-dom';
import { surfaceCardClass } from '../../constants/ui';

const privacySections = [
  {
    path: '/settings/privacy/blocked-accounts',
    title: 'Blocked Accounts',
    description: 'View and unblock the people you’ve blocked',
  },
] as const;

const PrivacyManagement: React.FC = () => {
  return (
    <div className="bg-canvas py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className={`${surfaceCardClass} rounded-kin-xl overflow-hidden`}>
          <div className="px-8 py-8">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-sm font-inter text-muted hover:text-kin-teal-700 transition mb-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

            <h1 className="text-3xl font-bold font-montserrat text-foreground mb-2">
              Privacy
            </h1>
            <p className="text-foreground font-inter mb-8">
              Control your privacy setting on KinMeet.
            </p>

            <nav aria-label="Privacy sections">
              <ul className="divide-y divide-border border border-border rounded-kin-lg overflow-hidden">
                {privacySections.map((section) => (
                  <li key={section.path}>
                    <Link
                      to={section.path}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-muted transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label={`${section.title}: ${section.description}`}
                    >
                      <span>
                        <span className="block text-lg font-semibold font-montserrat text-foreground">
                          {section.title}
                        </span>
                        <span className="block text-sm font-inter text-foreground/80 mt-1">
                          {section.description}
                        </span>
                      </span>
                      <svg
                        className="h-5 w-5 shrink-0 text-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyManagement;
