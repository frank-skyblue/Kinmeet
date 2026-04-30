import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from '../Signup';

vi.mock('../../../services/api', () => ({
  profileAPI: {
    uploadPhoto: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../../constants/profileOptions', () => ({
  getCountryCode: () => 'CA',
  parseProvinceComposite: () => null,
}));

vi.mock('../../../constants/validation', () => ({
  validatePhotoFile: () => null,
}));

const mockRegister = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../common/Logo', () => ({
  default: () => <div data-testid="logo" />,
}));

vi.mock('../SignupStep1', () => ({
  default: ({ onNext }: { onNext: () => void; setError: (s: string) => void }) => (
    <div data-testid="step-1">
      <button onClick={onNext}>Next Step 1</button>
    </div>
  ),
}));

vi.mock('../SignupStep2', () => ({
  default: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="step-2">
      <button onClick={onBack}>Back Step 2</button>
      <button onClick={onNext}>Next Step 2</button>
    </div>
  ),
}));

vi.mock('../SignupStep3', () => ({
  default: ({ onNext, onBack }: { onNext: () => void; onBack: () => void }) => (
    <div data-testid="step-3">
      <button onClick={onBack}>Back Step 3</button>
      <button onClick={onNext}>Next Step 3</button>
    </div>
  ),
}));

vi.mock('../SignupStep4', () => ({
  default: ({ onSubmit, onBack, isLoading }: { onSubmit: () => void; onBack: () => void; isLoading: boolean }) => (
    <div data-testid="step-4">
      <button onClick={onBack}>Back Step 4</button>
      <button onClick={onSubmit} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Account'}
      </button>
    </div>
  ),
}));

import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const renderSignup = () =>
  render(
    <MemoryRouter>
      <Signup />
    </MemoryRouter>,
  );

describe('Signup', () => {
  beforeEach(() => {
    mockRegister.mockClear();
    mockNavigate.mockClear();
  });

  it('renders step 1 initially', () => {
    renderSignup();
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
  });

  it('navigates through all 4 steps', async () => {
    const user = userEvent.setup();
    renderSignup();

    expect(screen.getByTestId('step-1')).toBeInTheDocument();

    await user.click(screen.getByText('Next Step 1'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();

    await user.click(screen.getByText('Next Step 2'));
    expect(screen.getByTestId('step-3')).toBeInTheDocument();

    await user.click(screen.getByText('Next Step 3'));
    expect(screen.getByTestId('step-4')).toBeInTheDocument();
  });

  it('navigates backward', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Next Step 1'));
    expect(screen.getByTestId('step-2')).toBeInTheDocument();

    await user.click(screen.getByText('Back Step 2'));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
  });

  it('navigates to step 1 via progress after visiting step 3', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Next Step 1'));
    await user.click(screen.getByText('Next Step 2'));
    expect(screen.getByTestId('step-3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Go to signup step 1/i }));
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
  });

  it('disables progress for steps not yet reached', () => {
    renderSignup();
    expect(screen.getByRole('button', { name: /Go to signup step 3/i })).toBeDisabled();
  });

  it('calls register and navigates on submit', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Next Step 1'));
    await user.click(screen.getByText('Next Step 2'));
    await user.click(screen.getByText('Next Step 3'));
    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/discover');
    });
  });

  it('shows error when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Registration failed'));
    const user = userEvent.setup();
    renderSignup();

    await user.click(screen.getByText('Next Step 1'));
    await user.click(screen.getByText('Next Step 2'));
    await user.click(screen.getByText('Next Step 3'));
    await user.click(screen.getByText('Create Account'));

    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });
});
