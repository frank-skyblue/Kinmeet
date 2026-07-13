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

  it('shows field-specific error when email is empty', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} email="" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(
      'Please enter your email address.',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('shows field-specific error when email format is invalid', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} email="not-an-email" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(
      'Please enter a valid email address.',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('shows field-specific error when password is empty', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} password="" confirmPassword="" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(
      'Please enter your password.',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('shows field-specific error when confirm password is empty', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} confirmPassword="" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(
      'Please confirm your password.',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });

  it('username field is optional and does not trigger required error', async () => {
    mockCheckEmail.mockResolvedValueOnce({ success: true, available: true });
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} username="" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(defaultProps.onNext).toHaveBeenCalled();
    });
  });

  it('shows username format error when username is present but invalid', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} username="INVALID USERNAME!" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(
      'Username must be 3-30 characters using lowercase letters, numbers, or underscores',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
  });
});
