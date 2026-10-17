import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupStep1 from '../SignupStep1';
import { authAPI } from '../../../services/api';
import { PASSWORD_HINT } from '../../../constants/validation';

vi.mock('../../../services/api', () => ({
  authAPI: {
    checkEmail: vi.fn(),
    checkUsername: vi.fn(),
  },
}));

const mockCheckEmail = vi.mocked(authAPI.checkEmail);
const mockCheckUsername = vi.mocked(authAPI.checkUsername);

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

  it('shows email format error and does not call checkEmail for invalid email format', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} email="notavalidemail" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(defaultProps.setError).toHaveBeenCalledWith(
        'Please enter a valid email address.',
      );
      expect(mockCheckEmail).not.toHaveBeenCalled();
      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });
  });

  it('shows email format error for email missing domain extension', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} email="user@nodomain" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(defaultProps.setError).toHaveBeenCalledWith(
        'Please enter a valid email address.',
      );
      expect(mockCheckEmail).not.toHaveBeenCalled();
    });
  });

  it('shows email format error for email missing @ symbol', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} email="userexample.com" />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(defaultProps.setError).toHaveBeenCalledWith(
        'Please enter a valid email address.',
      );
      expect(mockCheckEmail).not.toHaveBeenCalled();
    });
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

  it('shows field-specific error when password is too weak', async () => {
    const user = userEvent.setup();
    render(
      <SignupStep1
        {...defaultProps}
        password="password1"
        confirmPassword="password1"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(defaultProps.setError).toHaveBeenCalledWith(PASSWORD_HINT);
    expect(mockCheckEmail).not.toHaveBeenCalled();
    expect(defaultProps.onNext).not.toHaveBeenCalled();
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
      'Username can only contain letters, numbers, and underscores.',
    );
    expect(mockCheckEmail).not.toHaveBeenCalled();
    expect(mockCheckUsername).not.toHaveBeenCalled();
  });

  it('turns typed uppercase letters into lowercase', async () => {
    const user = userEvent.setup();
    render(<SignupStep1 {...defaultProps} username="" />);

    await user.type(screen.getByLabelText('Username'), 'A');

    expect(defaultProps.setUsername).toHaveBeenCalledWith('a');
  });

  it('turns off mobile auto-capitalisation for the username', () => {
    render(<SignupStep1 {...defaultProps} />);

    expect(screen.getByLabelText('Username')).toHaveAttribute('autocapitalize', 'none');
  });

  describe('username availability', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const status = () => screen.queryByTestId('username-status')?.textContent;

    it('explains each formatting rule without asking the server', () => {
      const { rerender } = render(<SignupStep1 {...defaultProps} username="al" />);
      expect(status()).toBe('Username must be at least 3 characters.');

      rerender(<SignupStep1 {...defaultProps} username={'a'.repeat(31)} />);
      expect(status()).toBe('Username must be at most 30 characters.');

      rerender(<SignupStep1 {...defaultProps} username="al-bert" />);
      expect(status()).toBe('Username can only contain letters, numbers, and underscores.');

      expect(mockCheckUsername).not.toHaveBeenCalled();
    });

    it('does nothing for an empty username, and still allows Next', async () => {
      mockCheckEmail.mockResolvedValueOnce({ success: true, available: true });
      const user = userEvent.setup();
      render(<SignupStep1 {...defaultProps} username="" />);

      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(status()).toBeUndefined();
      expect(mockCheckUsername).not.toHaveBeenCalled();
      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('checks once after typing stops, case-insensitively, and reports it available', async () => {
      vi.useFakeTimers();
      mockCheckUsername.mockResolvedValue({ success: true, available: true });
      const { rerender } = render(<SignupStep1 {...defaultProps} username="Al" />);
      rerender(<SignupStep1 {...defaultProps} username="Alb" />);
      rerender(<SignupStep1 {...defaultProps} username="Albert" />);

      expect(status()).toBe('Checking availability...');
      await act(() => vi.advanceTimersByTimeAsync(400));

      expect(mockCheckUsername).toHaveBeenCalledTimes(1);
      expect(mockCheckUsername).toHaveBeenCalledWith('albert');
      expect(status()).toBe('Username available');
    });

    it('reports a taken username and blocks Next', async () => {
      mockCheckUsername.mockResolvedValue({ success: true, available: false });
      const user = userEvent.setup();
      render(<SignupStep1 {...defaultProps} username="albert" />);

      await waitFor(() => expect(status()).toBe('This username is already taken.'));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(defaultProps.setError).toHaveBeenCalledWith('This username is already taken.');
      expect(defaultProps.onNext).not.toHaveBeenCalled();
      expect(mockCheckEmail).not.toHaveBeenCalled();
    });

    it('never treats a failed check as available, and blocks Next until a check succeeds', async () => {
      mockCheckUsername.mockRejectedValue(new Error('Network Error'));
      const user = userEvent.setup();
      render(<SignupStep1 {...defaultProps} username="albert" />);

      await waitFor(() => expect(status()).toBe('Unable to check availability. Please try again.'));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(defaultProps.setError).toHaveBeenCalledWith('Unable to check availability. Please try again.');
      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });

    it('re-checks on Next after a failed check, and continues once it succeeds', async () => {
      mockCheckUsername
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ success: true, available: true });
      mockCheckEmail.mockResolvedValueOnce({ success: true, available: true });
      const user = userEvent.setup();
      render(<SignupStep1 {...defaultProps} username="albert" />);

      await waitFor(() => expect(status()).toBe('Unable to check availability. Please try again.'));
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(mockCheckUsername).toHaveBeenCalledTimes(2);
      expect(defaultProps.onNext).toHaveBeenCalledTimes(1);
    });

    it('ignores a slow response for a username the user has already changed', async () => {
      vi.useFakeTimers();
      let resolveFirst: (value: { success: boolean; available: boolean }) => void = () => {};
      mockCheckUsername
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValueOnce({ success: true, available: true });
      const { rerender } = render(<SignupStep1 {...defaultProps} username="alice" />);
      await act(() => vi.advanceTimersByTimeAsync(400));

      rerender(<SignupStep1 {...defaultProps} username="bobby" />);
      await act(async () => resolveFirst({ success: true, available: false }));
      expect(status()).toBe('Checking availability...');

      await act(() => vi.advanceTimersByTimeAsync(400));
      expect(status()).toBe('Username available');
    });
  });
});
