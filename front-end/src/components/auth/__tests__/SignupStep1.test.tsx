import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupStep1 from '../SignupStep1';
import { authAPI } from '../../../services/api';

vi.mock('../../../services/api', () => ({
  authAPI: {
    checkEmail: vi.fn(),
  },
}));

const mockCheckEmail = vi.mocked(authAPI.checkEmail);

const defaultProps = {
  email: 'test@example.com',
  setEmail: vi.fn(),
  username: '',
  setUsername: vi.fn(),
  password: 'ValidPass1',
  setPassword: vi.fn(),
  confirmPassword: 'ValidPass1',
  setConfirmPassword: vi.fn(),
  onNext: vi.fn(),
  setError: vi.fn(),
};

describe('SignupStep1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call onNext when email is already registered', async () => {
    mockCheckEmail.mockResolvedValueOnce({ success: true, available: false });
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockCheckEmail).toHaveBeenCalledWith('test@example.com');
      expect(defaultProps.setError).toHaveBeenCalledWith(
        'This email is already registered. Please log in instead.',
      );
      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });
  });

  it('calls onNext when email is available', async () => {
    mockCheckEmail.mockResolvedValueOnce({ success: true, available: true });
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(mockCheckEmail).toHaveBeenCalledWith('test@example.com');
      expect(defaultProps.onNext).toHaveBeenCalled();
    });
  });
});
