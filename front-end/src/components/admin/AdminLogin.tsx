import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/error';
import Logo from '../common/Logo';
import { primaryActionClass, surfaceCardClass, textFieldClass } from '../../constants/ui';

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
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className={`${surfaceCardClass} max-w-md w-full rounded-kin-xl p-8`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-4xl font-bold font-montserrat text-foreground mb-2">KinMeet Admin</h1>
          <p className="text-muted font-inter">Sign in to review feedback</p>
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
            <label htmlFor="admin-password" className="block text-sm font-medium font-inter text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${textFieldClass} w-full px-4 py-3 rounded-kin-sm transition`}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`${primaryActionClass} w-full py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg focus:ring-4 focus:ring-ring shadow-kin-medium hover:shadow-kin-strong transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8 mb-4`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
