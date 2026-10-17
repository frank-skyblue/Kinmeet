import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
  profileAPI: {
    getProfile: vi.fn(),
  },
  settingsAPI: {
    reactivateAccount: vi.fn(),
  },
  setSessionEndedHandler: vi.fn(),
}));

vi.mock('../../utils/error', () => ({
  getErrorMessage: (err: unknown) => err instanceof Error ? err.message : 'Unknown error',
}));

vi.mock('../../services/pushNotifications', () => ({
  registerWebPushForCurrentUser: vi.fn(() => Promise.resolve()),
  unregisterWebPushForCurrentUser: vi.fn(() => Promise.resolve()),
}));

import { act } from '@testing-library/react';
import { authAPI, profileAPI, settingsAPI, setSessionEndedHandler } from '../../services/api';
import { AuthProvider } from '../AuthContext';
import { useAuth } from '../useAuth';

const TestConsumer = () => {
  const { user, token, isLoading, login, logout, refreshUser, reactivateAccount, deactivatedEmail } =
    useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.firstName : 'null'}</span>
      <span data-testid="token">{token ?? 'null'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="status">{user?.accountStatus ?? 'none'}</span>
      <span data-testid="deactivated-email">{deactivatedEmail ?? 'null'}</span>
      <button onClick={() => login('test@test.com', 'pass')}>Login</button>
      <button
        onClick={async () => {
          await login('test@test.com', 'pass');
          await reactivateAccount();
        }}
      >
        Login and reactivate
      </button>
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

  const getSessionEndedHandler = () => {
    const handler = vi.mocked(setSessionEndedHandler).mock.calls.at(-1)?.[0];
    expect(handler).toBeTypeOf('function');
    return handler!;
  };

  const renderSignedIn = async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', firstName: 'Stored', email: 'a@b.com', lastName: 'X', profileComplete: true }));
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Stored'));
  };

  it('clears the session when the API reports an invalid token', async () => {
    await renderSignedIn();

    act(() => getSessionEndedHandler()('invalid'));

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });
    expect(screen.getByTestId('deactivated-email').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('remembers the email when the session ended because the account was deactivated', async () => {
    await renderSignedIn();

    act(() => getSessionEndedHandler()('deactivated'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('null'));
    expect(screen.getByTestId('deactivated-email').textContent).toBe('a@b.com');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('reactivates right after signing in, within the same handler', async () => {
    vi.mocked(authAPI.login).mockResolvedValue({
      success: true,
      token: 'fresh-token',
      user: { id: '1', email: 'test@test.com', firstName: 'Jane', lastName: 'Doe', profileComplete: true, accountStatus: 'deactivated' },
    });
    vi.mocked(settingsAPI.reactivateAccount).mockResolvedValue({ success: true, message: '', accountStatus: 'active' });

    const user = userEvent.setup();
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await user.click(screen.getByText('Login and reactivate'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('active'));
    expect(JSON.parse(localStorage.getItem('user')!).accountStatus).toBe('active');
  });
});
