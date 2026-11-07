import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReactivateAccount from '../ReactivateAccount';
import type { User } from '../../../types';

const mockReactivateAccount = vi.fn();
const mockLogout = vi.fn();
const mockLogin = vi.fn();
const mockDismissDeactivated = vi.fn();
let mockUser: User | null = null;
let mockDeactivatedEmail: string | null = null;

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    deactivatedEmail: mockDeactivatedEmail,
    login: mockLogin,
    reactivateAccount: mockReactivateAccount,
    logout: mockLogout,
    dismissDeactivated: mockDismissDeactivated,
  }),
}));

const deactivatedUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  profileComplete: true,
  accountStatus: 'deactivated',
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/reactivate']}>
      <Routes>
        <Route path="/reactivate" element={<ReactivateAccount />} />
        <Route path="/discover" element={<div>Discover Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ReactivateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = deactivatedUser;
    mockDeactivatedEmail = null;
    mockReactivateAccount.mockResolvedValue(undefined);
    mockLogin.mockResolvedValue(deactivatedUser);
    mockLogout.mockResolvedValue(undefined);
  });

  it('asks a deactivated user whether to reactivate', () => {
    renderPage();
    expect(
      screen.getByText('Your account is currently deactivated. Would you like to reactivate it?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivate Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay Deactivated' })).toBeInTheDocument();
  });

  it('reactivates and continues to Discover', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Reactivate Account' }));

    await waitFor(() => expect(screen.getByText('Discover Page')).toBeInTheDocument());
    expect(mockReactivateAccount).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('signs out without reactivating when the user stays deactivated', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Stay Deactivated' }));

    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReactivateAccount).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the prompt when reactivation fails', async () => {
    mockReactivateAccount.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Reactivate Account' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/network error/i));
    expect(screen.getByRole('button', { name: 'Reactivate Account' })).toBeEnabled();
  });

  it('sends an active user straight to Discover', () => {
    mockUser = { ...deactivatedUser, accountStatus: 'active' };
    renderPage();
    expect(screen.getByText('Discover Page')).toBeInTheDocument();
  });

  it('sends a signed-out visitor to login', () => {
    mockUser = null;
    renderPage();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('does not ask for a password when already signed in', () => {
    renderPage();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  describe('after the session ended because the account was deactivated', () => {
    beforeEach(() => {
      mockUser = null;
      mockDeactivatedEmail = 'alice@example.com';
    });

    it('shows the prompt and asks for the password', async () => {
      const user = userEvent.setup();
      renderPage();

      expect(
        screen.getByText('Your account is currently deactivated. Would you like to reactivate it?'),
      ).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      const reactivate = screen.getByRole('button', { name: 'Reactivate Account' });
      expect(reactivate).toBeDisabled();

      await user.type(screen.getByLabelText('Password'), 'TestPass123');
      expect(reactivate).toBeEnabled();
    });

    it('signs in with the password, then reactivates', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Password'), 'TestPass123');
      await user.click(screen.getByRole('button', { name: 'Reactivate Account' }));

      await waitFor(() => expect(screen.getByText('Discover Page')).toBeInTheDocument());
      expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'TestPass123');
      expect(mockReactivateAccount).toHaveBeenCalledTimes(1);
      expect(mockLogin.mock.invocationCallOrder[0]).toBeLessThan(
        mockReactivateAccount.mock.invocationCallOrder[0],
      );
    });

    it('shows the error and does not reactivate when the password is wrong', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Password'), 'WrongPass1');
      await user.click(screen.getByRole('button', { name: 'Reactivate Account' }));

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i));
      expect(mockReactivateAccount).not.toHaveBeenCalled();
    });

    it('skips reactivation if the account was already reactivated elsewhere', async () => {
      mockLogin.mockResolvedValueOnce({ ...deactivatedUser, accountStatus: 'active' });
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByLabelText('Password'), 'TestPass123');
      await user.click(screen.getByRole('button', { name: 'Reactivate Account' }));

      await waitFor(() => expect(screen.getByText('Discover Page')).toBeInTheDocument());
      expect(mockReactivateAccount).not.toHaveBeenCalled();
    });

    it('Stay Deactivated goes to login without signing in', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Stay Deactivated' }));

      await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
      expect(mockDismissDeactivated).toHaveBeenCalledTimes(1);
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
