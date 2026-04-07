import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI, profileAPI } from '../services/api';
import type { User, RegisterPayload } from '../types';
import { getErrorMessage } from '../utils/error';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const safeParse = <T,>(json: string | null): T | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = safeParse<User>(localStorage.getItem('user'));

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);

      if (response.success) {
        const { token: newToken, user: newUser } = response;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (data: RegisterPayload) => {
    try {
      const response = await authAPI.register(data);

      if (response.success) {
        const { token: newToken, user: newUser } = response;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await profileAPI.getProfile();
      if (response.success && response.user) {
        const updated: User = {
          id: response.user._id,
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          photo: response.user.photo,
          profileComplete: response.user.profileComplete,
        };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
