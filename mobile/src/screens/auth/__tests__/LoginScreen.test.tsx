import { fireEvent, render, screen } from '@testing-library/react-native';
import { AuthContext, type AuthContextType } from '../../../contexts/auth-context';
import { LoginScreen } from '../LoginScreen';

const mockNavigate = jest.fn();

const renderLogin = async () => {
  const auth: AuthContextType = {
    user: null,
    token: null,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  };
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Login', name: 'Login' },
  } as unknown as React.ComponentProps<typeof LoginScreen>;

  await render(
    <AuthContext.Provider value={auth}>
      <LoginScreen {...props} />
    </AuthContext.Provider>,
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hides the password until Show is pressed', async () => {
    await renderLogin();
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByLabelText('Show password'));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Hide password')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Hide password'));

    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  test('Forgot password? opens the forgot password screen', async () => {
    await renderLogin();

    await fireEvent.press(screen.getByLabelText('Forgot password'));

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
