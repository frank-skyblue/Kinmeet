import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import AccountSettings from '../AccountSettings';

const mockRefreshUser = vi.fn();
const mockUser = {
  id: 'user-123',
  email: 'alice@example.com',
  username: 'alice_99',
  firstName: 'Alice',
  lastName: 'Smith',
  profileComplete: true,
};

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({ user: mockUser, refreshUser: mockRefreshUser }),
}));

vi.mock('../../profile/DeleteAccountModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Delete Account Modal</div> : null,
}));

const mockChangeEmail = vi.fn();
const mockChangeUsername = vi.fn();
const mockChangePassword = vi.fn();

vi.mock('../../../services/api', () => ({
  settingsAPI: {
    changeEmail: (...args: unknown[]) => mockChangeEmail(...args),
    changeUsername: (...args: unknown[]) => mockChangeUsername(...args),
    changePassword: (...args: unknown[]) => mockChangePassword(...args),
  },
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AccountSettings />
    </MemoryRouter>,
  );

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(undefined);
  });

  it('renders the Account heading and back link', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /^account$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to settings and privacy/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('displays current email and username', () => {
    renderComponent();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('@alice_99')).toBeInTheDocument();
  });

  // ─── Email section ───────────────────────────────────────────────────────
  describe('Email section', () => {
    it('shows edit form when Edit is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit email/i }));

      expect(screen.getByLabelText(/new email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it('submits the form and shows success', async () => {
      mockChangeEmail.mockResolvedValueOnce({ success: true, email: 'new@example.com' });
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit email/i }));
      await user.type(screen.getByLabelText(/new email address/i), 'new@example.com');
      await user.type(screen.getByLabelText(/current password/i), 'TestPass123');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(mockChangeEmail).toHaveBeenCalledWith({
          newEmail: 'new@example.com',
          currentPassword: 'TestPass123',
        });
      });
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/email updated/i);
      });
    });

    it('shows error when the API rejects', async () => {
      mockChangeEmail.mockRejectedValueOnce(new Error('Current password is incorrect'));
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit email/i }));
      await user.type(screen.getByLabelText(/new email address/i), 'x@example.com');
      await user.type(screen.getByLabelText(/current password/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/current password is incorrect/i);
      });
    });

    it('hides form when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit email/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByLabelText(/new email address/i)).not.toBeInTheDocument();
    });
  });

  // ─── Username section ─────────────────────────────────────────────────────
  describe('Username section', () => {
    it('shows edit form when Edit is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit username/i }));

      expect(screen.getByLabelText(/new username/i)).toBeInTheDocument();
    });

    it('submits and shows success', async () => {
      mockChangeUsername.mockResolvedValueOnce({ success: true, username: 'new_handle' });
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /edit username/i }));
      const input = screen.getByLabelText(/new username/i);
      await user.clear(input);
      await user.type(input, 'new_handle');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(mockChangeUsername).toHaveBeenCalledWith({ newUsername: 'new_handle' });
      });
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/username updated/i);
      });
    });
  });

  // ─── Password section ─────────────────────────────────────────────────────
  describe('Password section', () => {
    it('shows change form when Change is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /change password/i }));

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('shows error when new passwords do not match', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /change password/i }));
      await user.type(screen.getByLabelText(/current password/i), 'TestPass123');
      await user.type(screen.getByLabelText(/^new password$/i), 'NewPass456');
      await user.type(screen.getByLabelText(/confirm new password/i), 'Mismatch999');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('submits and shows success when passwords match', async () => {
      mockChangePassword.mockResolvedValueOnce({ success: true });
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /change password/i }));
      await user.type(screen.getByLabelText(/current password/i), 'TestPass123');
      await user.type(screen.getByLabelText(/^new password$/i), 'NewPass456');
      await user.type(screen.getByLabelText(/confirm new password/i), 'NewPass456');
      await user.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          currentPassword: 'TestPass123',
          newPassword: 'NewPass456',
        });
      });
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/password updated/i);
      });
    });
  });

  // ─── Delete Account section ───────────────────────────────────────────────
  describe('Delete Account section', () => {
    it('opens the delete confirmation modal', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole('button', { name: /delete account/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
