import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../../../App';
import { authAPI, profileAPI } from '../../services/api';
import { TOKEN_KEY, USER_KEY } from '../../constants/storage';
import type { User, UserProfile } from '../../types';

const mockMemory = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockMemory.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockMemory.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockMemory.delete(key);
    return Promise.resolve();
  }),
}));

jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    logout: jest.fn(() => Promise.resolve({ success: true, message: 'Logged out' })),
    register: jest.fn(),
  },
  profileAPI: {
    getProfile: jest.fn(),
  },
  getPhotoUrl: (photoPath: string) => photoPath,
  API_ORIGIN: 'http://localhost:8080',
}));

const storedUser: User = {
  id: 'user-1',
  email: 'lucia.martinez@example.com',
  firstName: 'Lucia',
  lastName: 'Martinez',
  profileComplete: true,
};

const storedProfile: UserProfile = {
  _id: 'user-1',
  email: 'lucia.martinez@example.com',
  username: 'lucia',
  firstName: 'Lucia',
  lastName: 'Martinez',
  homeCountry: 'Argentina',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['Spanish'],
  interests: ['Cooking'],
  lookingFor: ['Friendship'],
  gender: 'female',
  dateOfBirth: '1990-01-15',
  profileComplete: true,
};

const signIn = async () => {
  await fireEvent.changeText(screen.getByLabelText('Email'), 'lucia.martinez@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Password123');
  await waitFor(() => {
    expect(screen.getByLabelText('Sign In').props.accessibilityState).toEqual({ disabled: false });
  });
  await fireEvent.press(screen.getByLabelText('Sign In'));
};

describe('App navigation', () => {
  beforeEach(() => {
    mockMemory.clear();
    jest.mocked(authAPI.login).mockReset();
    jest.mocked(authAPI.logout).mockClear();
    jest.mocked(profileAPI.getProfile).mockResolvedValue({
      success: true,
      user: storedProfile,
    });
  });

  test('shows the sign-in form when no session is stored', async () => {
    await render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Sign In')).toBeTruthy();
    });
    expect(screen.queryByText('Discover')).toBeNull();
  });

  test('shows Discover when a session is stored', async () => {
    mockMemory.set(TOKEN_KEY, 'test-token');
    mockMemory.set(USER_KEY, JSON.stringify(storedUser));

    await render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    });
    expect(screen.queryByLabelText('Sign In')).toBeNull();
  });

  test('stays on the sign-in form when login fails', async () => {
    jest.mocked(authAPI.login).mockRejectedValue(new Error('Invalid email or password'));

    await render(<App />);
    await waitFor(() => {
      expect(screen.getByLabelText('Sign In')).toBeTruthy();
    });

    await signIn();

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
    });
    expect(screen.queryByText('Discover')).toBeNull();
  });

  test('shows Discover after a successful login', async () => {
    jest.mocked(authAPI.login).mockResolvedValue({
      success: true,
      token: 'new-token',
      user: storedUser,
    });

    await render(<App />);
    await waitFor(() => {
      expect(screen.getByLabelText('Sign In')).toBeTruthy();
    });

    await signIn();

    await waitFor(() => {
      expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    });
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  test('shows the signed-in profile and a log out control', async () => {
    mockMemory.set(TOKEN_KEY, 'test-token');
    mockMemory.set(USER_KEY, JSON.stringify(storedUser));

    await render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('Discover').length).toBeGreaterThan(0);
    });

    await fireEvent.press(screen.getByText('Profile'));

    await waitFor(() => {
      expect(screen.getByText('Lucia Martinez')).toBeTruthy();
    });
    expect(screen.getByLabelText('Log out')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Log out'));

    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeTruthy();
    });
  });
});
