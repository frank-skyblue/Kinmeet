import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { getErrorMessage } from '../../utils/error';
import Logo from '../common/Logo';
import { primaryActionClass, surfaceCardClass, textFieldClass } from '../../constants/ui';
import PasswordInputField from '../common/PasswordInputField';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const flashMessage = (location.state as { flash?: string } | null)?.flash ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/discover');
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
          <h1 className="text-4xl font-bold font-montserrat text-foreground mb-2">KinMeet</h1>
          <p className="text-muted font-inter">Connect with your homeland community abroad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {flashMessage && (
            <div
              role="status"
              aria-live="polite"
              className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-kin font-inter text-sm"
            >
              {flashMessage}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium font-inter text-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${textFieldClass} w-full px-4 py-3 rounded-kin-sm transition`}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium font-inter text-foreground">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-inter text-kin-coral hover:text-kin-coral-600 transition"
              >
                Forgot password?
              </Link>
            </div>

						<PasswordInputField id="password" value={password} setPassword={setPassword} />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`${primaryActionClass} w-full py-4 px-6 rounded-kin-sm font-bold font-montserrat text-lg focus:ring-4 focus:ring-ring shadow-kin-medium hover:shadow-kin-strong cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8 mb-4`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-foreground font-inter">
            Don't have an account?{' '}
            <Link to="/signup" className="text-kin-coral font-semibold hover:text-kin-coral-600 transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

