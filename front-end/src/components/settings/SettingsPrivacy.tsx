import React from 'react';
import { Link } from 'react-router-dom';

const settingsSections = [
  {
    path: '/settings/account',
    title: 'Account',
    description: 'Manage your account and delete your profile',
  },
  {
    path: '/settings/community-safety',
    title: 'Community & Safety',
    description: 'Community guidelines and safety information',
  },
] as const;

const SettingsPrivacy: React.FC = () => {
  return (
    <div className="bg-kin-beige py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-kin-xl shadow-kin-strong overflow-hidden">
          <div className="px-8 py-8">
            <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
              Settings &amp; Privacy
            </h1>
            <p className="text-kin-navy font-inter mb-8">
              Manage your account preferences and privacy options.
            </p>

            <nav aria-label="Settings sections">
              <ul className="divide-y divide-kin-stone-200 border border-kin-stone-200 rounded-kin-lg overflow-hidden">
                {settingsSections.map((section) => (
                  <li key={section.path}>
                    <Link
                      to={section.path}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-kin-beige transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                      aria-label={`${section.title}: ${section.description}`}
                    >
                      <span>
                        <span className="block text-lg font-semibold font-montserrat text-kin-navy">
                          {section.title}
                        </span>
                        <span className="block text-sm font-inter text-kin-navy/80 mt-1">
                          {section.description}
                        </span>
                      </span>
                      <svg
                        className="h-5 w-5 shrink-0 text-kin-navy"
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

export default SettingsPrivacy;
