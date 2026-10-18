import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  authAPI,
  profileAPI,
  settingsAPI,
  setSessionEndedHandler,
  type SessionEndReason,
} from '../services/api';
import {
  registerWebPushForCurrentUser,
  unregisterWebPushForCurrentUser,
} from '../services/pushNotifications';
import type { User, RegisterPayload } from '../types';
import { getErrorMessage } from '../utils/error';
import { isAccountDeactivated } from '../utils/account';
import { AuthContext } from './auth-context';

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
  const [deactivatedEmail, setDeactivatedEmail] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = safeParse<User>(localStorage.getItem('user'));

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // The API rejected this device's session. Clearing it lets ProtectedRoute redirect:
  // to /reactivate when the account was deactivated (possibly on another device), which
  // asks for the password again, otherwise to /login.
  const handleSessionEnded = useCallback(
    (reason: SessionEndReason) => {
      if (reason === 'deactivated') {
        const endedUser = safeParse<User>(localStorage.getItem('user'));
        setDeactivatedEmail(endedUser?.email ?? null);
      }
      clearSession();
    },
    [clearSession],
  );

  useEffect(() => {
    setSessionEndedHandler(handleSessionEnded);
    return () => setSessionEndedHandler(null);
  }, [handleSessionEnded]);

  const dismissDeactivated = useCallback(() => setDeactivatedEmail(null), []);

  useEffect(() => {
    if (!user || !token || isAccountDeactivated(user)) return;
    void Promise.resolve(registerWebPushForCurrentUser()).catch((err) => {
      console.error('Web push registration failed:', err);
    });
  }, [user, token]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await authAPI.login(email, password);

      if (response.success) {
        const { token: newToken, user: newUser } = response;
        setToken(newToken);
        setUser(newUser);
        setDeactivatedEmail(null);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
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
      await unregisterWebPushForCurrentUser();
    } catch (error) {
      console.error('Push unregister failed:', error);
    }
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setDeactivatedEmail(null);
      clearSession();
    }
  };

  const refreshUser = async () => {
    try {
      const response = await profileAPI.getProfile();
      if (response.success && response.user) {
        const updated: User = {
          id: response.user._id,
          email: response.user.email,
          username: response.user.username,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          photo: response.user.photo,
          profileComplete: response.user.profileComplete,
          accountStatus: response.user.accountStatus,
        };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const reactivateAccount = async () => {
    const response = await settingsAPI.reactivateAccount();
    // Read the stored user, not `user` from this render: when called right after login()
    // in the same handler, the state update hasn't landed yet but storage has.
    const storedUser = safeParse<User>(localStorage.getItem('user'));
    if (!storedUser) return;
    const updated: User = { ...storedUser, accountStatus: response.accountStatus };
    setUser(updated);
    setDeactivatedEmail(null);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    reactivateAccount,
    deactivatedEmail,
    dismissDeactivated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

if (import.meta.hot) {
  import.meta.hot.accept();
}
