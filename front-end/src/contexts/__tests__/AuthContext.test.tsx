import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
  profileAPI: {
    getProfile: vi.fn(),
  },
}));

vi.mock('../../utils/error', () => ({
  getErrorMessage: (err: unknown) => err instanceof Error ? err.message : 'Unknown error',
}));

import { authAPI, profileAPI } from '../../services/api';
import { AuthProvider, useAuth } from '../AuthContext';

const TestConsumer = () => {
  const { user, token, isLoading, login, logout, refreshUser } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.firstName : 'null'}</span>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => login('test@test.com', 'pass')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => refreshUser()}>Refresh</button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no user and isLoading false after mount', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('hydrates from localStorage', async () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', firstName: 'Stored', email: 'a@b.com', lastName: 'X', profileComplete: true }));

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Stored');
      expect(screen.getByTestId('token').textContent).toBe('stored-token');
    });
  });

  it('login sets user and token', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      success: true,
      token: 'new-token',
      user: { id: '1', email: 'test@test.com', firstName: 'Jane', lastName: 'Doe', profileComplete: true },
    });

    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Jane');
      expect(screen.getByTestId('token').textContent).toBe('new-token');
    });
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('logout clears user and token', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      success: true,
      token: 'tok',
      user: { id: '1', email: 'a@b.com', firstName: 'X', lastName: 'Y', profileComplete: true },
    });
    vi.mocked(authAPI.logout).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('X'));

    await user.click(screen.getByText('Logout'));
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('refreshUser updates user from API', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', JSON.stringify({ id: '1', firstName: 'Old', email: 'a@b.com', lastName: 'X', profileComplete: true }));

    vi.mocked(profileAPI.getProfile).mockResolvedValue({
      success: true,
      user: { _id: '1', email: 'a@b.com', firstName: 'Refreshed', lastName: 'X', profileComplete: true },
    });

    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Old'));

    await user.click(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Refreshed');
    });
  });
});
