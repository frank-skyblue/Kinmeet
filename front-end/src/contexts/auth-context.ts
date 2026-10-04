import { createContext } from 'react';
import type { RegisterPayload, User } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  reactivateAccount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
