import React from 'react';
import { Link } from 'react-router-dom';

const guidelines = [
  'Treat all members with respect and kindness',
  'Celebrate cultural diversity and inclusivity',
  'Be mindful of cultural sensitivities',
  'Report inappropriate behavior or content',
  'Last names are only visible to accepted kins',
  'City-level details are not shared for privacy',
];

const CommunitySafety: React.FC = () => {
  return (
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

            <h1 className="text-3xl font-bold font-montserrat text-kin-navy mb-2">
              Community &amp; Safety
            </h1>
            <p className="text-kin-navy font-inter mb-8">
              Learn how KinMeet keeps our community respectful, safe, and inclusive.
            </p>

            <section aria-labelledby="community-guidelines-heading">
              <h2
                id="community-guidelines-heading"
                className="text-sm font-semibold font-inter text-kin-navy mb-3"
              >
                Community Guidelines
              </h2>
              <ul className="space-y-3 text-kin-navy font-inter" aria-label="Community guidelines list">
                {guidelines.map((guideline) => (
                  <li key={guideline} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1 shrink-0 text-kin-teal">•</span>
                    <span>{guideline}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunitySafety;
