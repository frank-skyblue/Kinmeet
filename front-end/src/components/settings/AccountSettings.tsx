import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import DeleteAccountModal from '../profile/DeleteAccountModal';
import DeactivateAccountModal from './DeactivateAccountModal';
import AccountEmailSection from './AccountEmailSection';
import AccountUsernameSection from './AccountUsernameSection';
import AccountPasswordSection from './AccountPasswordSection';

const AccountSettings: React.FC = () => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

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
                Manage your account settings, take a break, or permanently remove your KinMeet
                profile.
              </p>

              <div className="divide-y divide-kin-stone-200 mb-8">
                <AccountEmailSection />
                <AccountUsernameSection />
                <AccountPasswordSection />
              </div>

              <section aria-labelledby="deactivate-account-heading" className="mb-8">
                <h2
                  id="deactivate-account-heading"
                  className="text-sm font-semibold font-inter text-kin-navy mb-3"
                >
                  Deactivate Account
                </h2>
                <p className="text-kin-navy font-inter mb-4">
                  Temporarily hide your profile and pause notifications. Your kins, messages, and
                  profile are saved, and you can reactivate by signing in.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeactivateConfirm(true)}
                  className="w-full sm:w-auto bg-kin-stone-200 text-kin-navy px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                >
                  Deactivate Account
                </button>
              </section>

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
                  className="w-full sm:w-auto bg-kin-stone-200 text-kin-coral-700 px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-stone-300 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral"
                >
                  Delete Account
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>

      <DeactivateAccountModal
        isOpen={showDeactivateConfirm}
        onClose={() => setShowDeactivateConfirm(false)}
      />

      <DeleteAccountModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default AccountSettings;
