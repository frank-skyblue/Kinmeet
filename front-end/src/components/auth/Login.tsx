import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-kin-beige px-4">
      <div className="max-w-md w-full bg-white rounded-kin-xl shadow-kin-strong p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-montserrat text-kin-navy mb-2">KinMeet</h1>
          <p className="text-kin-teal font-inter">Connect with your homeland community abroad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium font-inter text-kin-navy mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium font-inter text-kin-navy mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              placeholder="••••••••"
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

        <div className="mt-8 text-center">
          <p className="text-kin-navy font-inter">
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

