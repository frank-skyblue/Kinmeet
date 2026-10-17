import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import DeactivateAccountModal, { ACCOUNT_DEACTIVATED_MESSAGE } from '../DeactivateAccountModal';

const mockLogout = vi.fn();
const mockDeactivateAccount = vi.fn();

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('../../../services/api', () => ({
  settingsAPI: {
    deactivateAccount: (...args: unknown[]) => mockDeactivateAccount(...args),
  },
}));

const LoginProbe = () => {
  const location = useLocation();
  return <div>Login Page: {(location.state as { flash?: string } | null)?.flash}</div>;
};

const renderModal = (onClose = vi.fn()) => {
  render(
    <MemoryRouter initialEntries={['/settings/account']}>
      <Routes>
        <Route
          path="/settings/account"
          element={<DeactivateAccountModal isOpen onClose={onClose} />}
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onClose };
};

describe('DeactivateAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogout.mockResolvedValue(undefined);
  });

  it('explains deactivation and that it is separate from deletion', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /deactivate account/i })).toBeInTheDocument();
    expect(screen.getByText(/taking a break\?/i)).toBeInTheDocument();
    expect(screen.getByText(/not the same as deleting your account/i)).toBeInTheDocument();
  });

  it('keeps Deactivate Account disabled until a password is entered', async () => {
    const user = userEvent.setup();
    renderModal();

    const submit = screen.getByRole('button', { name: /deactivate account/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/current password/i), 'TestPass123');
    expect(submit).toBeEnabled();
  });

  it('deactivates, signs out, and shows the confirmation on the login page', async () => {
    mockDeactivateAccount.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/current password/i), 'TestPass123');
    await user.click(screen.getByRole('button', { name: /deactivate account/i }));

    await waitFor(() => {
      expect(screen.getByText(`Login Page: ${ACCOUNT_DEACTIVATED_MESSAGE}`)).toBeInTheDocument();
    });
    expect(mockDeactivateAccount).toHaveBeenCalledWith('TestPass123');
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows the error and stays signed in when deactivation fails', async () => {
    mockDeactivateAccount.mockRejectedValueOnce(new Error('Current password is incorrect'));
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/current password/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /deactivate account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/current password is incorrect/i);
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDeactivateAccount).not.toHaveBeenCalled();
  });
});
