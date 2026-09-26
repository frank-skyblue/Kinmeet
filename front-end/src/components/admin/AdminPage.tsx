import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { adminAPI } from '../../services/api';
import AdminLogin from './AdminLogin';
import AdminLayout, { type AdminSection } from './AdminLayout';
import AdminFeedback from './AdminFeedback';
import AdminReports from './AdminReports';

type AdminView = 'checking' | 'network_error' | 'unauthenticated' | 'authenticated' | 'logging_out' | 'logout_unconfirmed';

export type { AdminSection };

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

export default AdminPage;
