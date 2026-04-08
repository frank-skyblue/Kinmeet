import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { User } from '../../types';

interface MockAuthValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (...args: unknown[]) => Promise<void>;
  register: (...args: unknown[]) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface MockSocketValue {
  socket: unknown;
  isConnected: boolean;
}

const defaultUser: User = {
  id: 'user-1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  profileComplete: true,
};

const defaultAuth: MockAuthValue = {
  user: defaultUser,
  token: 'mock-token',
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
};

const defaultSocket: MockSocketValue = {
  socket: null,
  isConnected: false,
};

import { vi } from 'vitest';

vi.mock('../../contexts/AuthContext', async () => {
  const React = await import('react');
  let authValue = { ...defaultAuth };
  return {
    useAuth: () => authValue,
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    __setMockAuth: (value: Partial<MockAuthValue>) => {
      authValue = { ...defaultAuth, ...value };
    },
    __resetMockAuth: () => {
      authValue = { ...defaultAuth };
    },
  };
});

vi.mock('../../contexts/SocketContext', async () => {
  const React = await import('react');
  let socketValue = { ...defaultSocket };
  return {
    useSocket: () => socketValue,
    SocketProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    __setMockSocket: (value: Partial<MockSocketValue>) => {
      socketValue = { ...defaultSocket, ...value };
    },
    __resetMockSocket: () => {
      socketValue = { ...defaultSocket };
    },
  };
});

interface RenderOptions {
  route?: string;
  auth?: Partial<MockAuthValue>;
  socket?: Partial<MockSocketValue>;
}

export const renderWithProviders = (ui: React.ReactElement, options: RenderOptions = {}) => {
  const { route = '/', auth, socket } = options;

  const authModule = require('../../contexts/AuthContext') as {
    __setMockAuth: (v: Partial<MockAuthValue>) => void;
    __resetMockAuth: () => void;
  };

  const socketModule = require('../../contexts/SocketContext') as {
    __setMockSocket: (v: Partial<MockSocketValue>) => void;
    __resetMockSocket: () => void;
  };

  authModule.__resetMockAuth();
  socketModule.__resetMockSocket();

  if (auth) authModule.__setMockAuth(auth);
  if (socket) socketModule.__setMockSocket(socket);

  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>,
  );
};

export { defaultUser };
