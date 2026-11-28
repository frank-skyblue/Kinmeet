import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { authAPI } from '../../../services/api';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

jest.mock('../../../services/api', () => ({
  authAPI: {
    forgotPassword: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

const renderForgotPassword = async () => {
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'ForgotPassword', name: 'ForgotPassword' },
  } as unknown as React.ComponentProps<typeof ForgotPasswordScreen>;
  await render(<ForgotPasswordScreen {...props} />);
};

const submit = async (email: string) => {
  await fireEvent.changeText(screen.getByLabelText('Email address'), email);
  await fireEvent.press(screen.getByLabelText('Send reset link'));
};

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('asks for an email before sending', async () => {
    await renderForgotPassword();

    await fireEvent.press(screen.getByLabelText('Send reset link'));

    expect(await screen.findByText('Please enter your email address.')).toBeTruthy();
    expect(authAPI.forgotPassword).not.toHaveBeenCalled();
  });

  test('rejects an invalid email', async () => {
    await renderForgotPassword();

    await submit('not-an-email');

    expect(await screen.findByText('Please enter a valid email address.')).toBeTruthy();
    expect(authAPI.forgotPassword).not.toHaveBeenCalled();
  });

  test('sends the link and shows the server message', async () => {
    jest.mocked(authAPI.forgotPassword).mockResolvedValue({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
    await renderForgotPassword();

    await submit('  marie@example.com ');

    expect(
      await screen.findByText('If that email is registered, a reset link has been sent.'),
    ).toBeTruthy();
    expect(authAPI.forgotPassword).toHaveBeenCalledWith('marie@example.com');
    // The form is replaced by the confirmation.
    expect(screen.queryByLabelText('Email address')).toBeNull();
  });

  test('shows an error and keeps the form when sending fails', async () => {
    jest.mocked(authAPI.forgotPassword).mockRejectedValue(new Error('Network Error'));
    await renderForgotPassword();

    await submit('marie@example.com');

    expect(await screen.findByText('Network Error')).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toBeTruthy();
  });

  test('Back to sign in returns to the login screen', async () => {
    jest.mocked(authAPI.forgotPassword).mockResolvedValue({ success: true, message: 'Sent' });
    await renderForgotPassword();
    await submit('marie@example.com');
    await screen.findByText('Sent');

    await fireEvent.press(screen.getByLabelText('Back to sign in'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Login'));
  });

  test('the back link returns to the login screen', async () => {
    await renderForgotPassword();

    await fireEvent.press(screen.getByLabelText('Go back to sign in page'));

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
