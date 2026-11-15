import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, USER_KEY } from '../constants/storage';
import { authAPI } from '../services/api';
import type { RegisterPayload, User } from '../types';
import { getErrorMessage } from '../utils/error';
import { AuthContext } from './auth-context';

type AuthProviderProps = {
  children: ReactNode;
};

const safeParse = <T,>(json: string | null): T | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = safeParse<User>(await SecureStore.getItemAsync(USER_KEY));
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error: unknown) {
        console.error('Failed to read stored session:', getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void hydrate();
  }, []);

  const persistSession = async (nextToken: string, nextUser: User) => {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      if (!response.success || !response.token || !response.user) {
        throw new Error(response.message ?? 'Login failed');
      }
      await persistSession(response.token, response.user);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (data: RegisterPayload) => {
    try {
      const response = await authAPI.register(data);
      if (!response.success || !response.token || !response.user) {
        throw new Error(response.message ?? 'Registration failed');
      }
      await persistSession(response.token, response.user);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error: unknown) {
      console.error('Logout API call failed:', getErrorMessage(error));
    } finally {
      setUser(null);
      setToken(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
