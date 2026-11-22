import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext, type AuthContextType } from '../../../contexts/auth-context';
import { authAPI, profileAPI } from '../../../services/api';
import { PASSWORD_HINT } from '../../../constants/validation';
import { getCountryFlag } from '../../../constants/profileOptions';
import { SignupScreen } from '../SignupScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  authAPI: {
    checkEmail: jest.fn(),
    checkUsername: jest.fn(),
  },
  profileAPI: {
    uploadPhoto: jest.fn(),
  },
}));

const mockRegister = jest.fn<Promise<void>, Parameters<AuthContextType['register']>>();
const mockNavigate = jest.fn();

const renderSignup = async () => {
  const auth: AuthContextType = {
    user: null,
    token: null,
    isLoading: false,
    login: jest.fn(),
    register: mockRegister,
    logout: jest.fn(),
  };
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Signup', name: 'Signup' },
  } as unknown as React.ComponentProps<typeof SignupScreen>;

  await render(
    <AuthContext.Provider value={auth}>
      <SignupScreen {...props} />
    </AuthContext.Provider>,
  );
};

// ---- Helpers that drive the form like a user ----

const type = async (label: string, text: string) => {
  await fireEvent.changeText(screen.getByLabelText(label), text);
};

const press = async (label: string) => {
  await fireEvent.press(screen.getByLabelText(label));
};

/** Opens a SelectField, searches when the list is long, and taps the option. */
const choose = async (fieldLabel: string, optionLabel: string) => {
  await press(fieldLabel);
  const search = screen.queryByLabelText(`Search ${fieldLabel}`);
  if (search) await fireEvent.changeText(search, optionLabel);
  await fireEvent.press(screen.getByText(optionLabel));
};

const fillStep1 = async ({
  password = 'Password123',
  confirm = password,
}: { password?: string; confirm?: string } = {}) => {
  await type('Email', 'marie@example.com');
  await type('Password', password);
  await type('Confirm password', confirm);
};

const goToStep2 = async () => {
  await fillStep1();
  await press('Next');
  await screen.findByText('Profile information');
};

const fillStep2 = async () => {
  await type('First name', 'Marie');
  await type('Last name', 'Curie');
  await choose('Your home country', 'Poland');
  // Country first; typing a known city fills in its province (Toronto → Ontario).
  await choose('Country', 'Canada');
  await type('City or town', 'Toronto');
  await choose('Month', 'March');
  await choose('Day', '15');
  await choose('Year', '1990');
  await choose('Gender', 'Female');
};

const goToStep4 = async () => {
  await goToStep2();
  await fillStep2();
  await press('Next');
  await screen.findByText('Work & education');
  await press('Next');
  await screen.findByText('Languages & interests');
};

const fillStep4 = async () => {
  await choose('Language', 'English');
  await press('Friendship');
};

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authAPI.checkEmail).mockResolvedValue({ success: true, available: true });
    jest.mocked(authAPI.checkUsername).mockResolvedValue({ success: true, available: true });
    jest.mocked(profileAPI.uploadPhoto).mockResolvedValue({ success: true, message: 'ok' });
    mockRegister.mockResolvedValue(undefined);
  });

  describe('step 1: account', () => {
    test('asks for an email first', async () => {
      await renderSignup();

      await press('Next');

      expect(await screen.findByText('Please enter your email address.')).toBeTruthy();
      expect(authAPI.checkEmail).not.toHaveBeenCalled();
    });

    test('rejects an invalid email', async () => {
      await renderSignup();
      await type('Email', 'not-an-email');

      await press('Next');

      expect(await screen.findByText('Please enter a valid email address.')).toBeTruthy();
    });

    test('rejects passwords that do not match', async () => {
      await renderSignup();
      await fillStep1({ password: 'Password123', confirm: 'Password124' });

      await press('Next');

      expect(await screen.findByText('Passwords do not match')).toBeTruthy();
    });

    test('rejects a weak password', async () => {
      await renderSignup();
      await fillStep1({ password: 'password' });

      await press('Next');

      expect(await screen.findByText(PASSWORD_HINT)).toBeTruthy();
    });

    test('stays on step 1 when the email is already registered', async () => {
      jest.mocked(authAPI.checkEmail).mockResolvedValue({ success: true, available: false });
      await renderSignup();
      await fillStep1();

      await press('Next');

      expect(
        await screen.findByText('This email is already registered. Please log in instead.'),
      ).toBeTruthy();
      expect(screen.getByText('Create account')).toBeTruthy();
    });

    test('shows an error when the email check fails', async () => {
      jest.mocked(authAPI.checkEmail).mockRejectedValue(new Error('Network Error'));
      await renderSignup();
      await fillStep1();

      await press('Next');

      expect(await screen.findByText('Network Error')).toBeTruthy();
      expect(screen.getByText('Create account')).toBeTruthy();
    });

    test('moves to step 2 when everything is valid', async () => {
      await renderSignup();

      await goToStep2();

      expect(authAPI.checkEmail).toHaveBeenCalledWith('marie@example.com');
    });

    test('lowercases the username as it is typed', async () => {
      await renderSignup();

      await type('Username', 'Marie_C');

      expect(screen.getByLabelText('Username').props.value).toBe('marie_c');
    });

    test('flags a username that breaks the rules without asking the server', async () => {
      await renderSignup();

      await type('Username', 'ab');

      expect(await screen.findByText('Username must be at least 3 characters.')).toBeTruthy();
      expect(authAPI.checkUsername).not.toHaveBeenCalled();
    });

    test('shows when a username is taken and blocks Next', async () => {
      jest.mocked(authAPI.checkUsername).mockResolvedValue({ success: true, available: false });
      await renderSignup();
      await fillStep1();
      await type('Username', 'marie');

      // The live check runs after the user stops typing.
      expect(await screen.findByText('This username is already taken.')).toBeTruthy();
      await press('Next');

      await waitFor(() => {
        expect(screen.getAllByText('This username is already taken.').length).toBe(2);
      });
      expect(authAPI.checkEmail).not.toHaveBeenCalled();
      expect(screen.getByText('Create account')).toBeTruthy();
    });

    test('shows when a username is available', async () => {
      await renderSignup();

      await type('Username', 'marie');

      expect(await screen.findByText('Username available')).toBeTruthy();
      expect(authAPI.checkUsername).toHaveBeenCalledWith('marie');
    });

    test('hides and shows the password', async () => {
      await renderSignup();
      expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

      await press('Show password');

      expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
    });
  });

  describe('step indicator', () => {
    test('does not allow skipping ahead to a step not reached yet', async () => {
      await renderSignup();

      await press('Go to signup step 3');

      expect(screen.getByText('Create account')).toBeTruthy();
      expect(screen.getByLabelText('Go to signup step 3').props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    test('allows going back to a step already reached, keeping what was typed', async () => {
      await renderSignup();
      await goToStep2();

      await press('Go to signup step 1');

      expect(screen.getByText('Create account')).toBeTruthy();
      expect(screen.getByLabelText('Email').props.value).toBe('marie@example.com');
    });

    test('editing an earlier step locks later steps until Next re-checks it', async () => {
      await renderSignup();
      await goToStep4();
      await press('Go to signup step 1');

      await type('Confirm password', 'Different123');

      expect(screen.getByLabelText('Go to signup step 4').props.accessibilityState).toMatchObject({
        disabled: true,
      });
      await press('Go to signup step 4');
      expect(screen.getByText('Create account')).toBeTruthy();

      await press('Next');

      expect(await screen.findByText('Passwords do not match')).toBeTruthy();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    test('after an edit, Next re-checks and later answers are kept', async () => {
      await renderSignup();
      await goToStep4();
      await choose('Language', 'English');
      await press('Go to signup step 1');
      await type('Email', 'marie.curie@example.com');

      await press('Next');
      await screen.findByText('Profile information');

      expect(authAPI.checkEmail).toHaveBeenLastCalledWith('marie.curie@example.com');
      expect(screen.getByLabelText('First name').props.value).toBe('Marie');
      await press('Next');
      await screen.findByText('Work & education');
      await press('Next');
      expect(await screen.findByText('Languages & interests')).toBeTruthy();
      expect(screen.getByLabelText('Language').props.accessibilityValue).toEqual({ text: 'English' });
    });

    test('revisiting a step without editing keeps later steps reachable', async () => {
      await renderSignup();
      await goToStep4();

      await press('Go to signup step 1');
      await press('Go to signup step 4');

      expect(screen.getByText('Languages & interests')).toBeTruthy();
    });

    test('Back keeps the values of the step being left', async () => {
      await renderSignup();
      await goToStep2();
      await type('First name', 'Marie');

      await press('Back');
      await press('Next');

      expect(await screen.findByText('Profile information')).toBeTruthy();
      expect(screen.getByLabelText('First name').props.value).toBe('Marie');
    });
  });

  describe('step 2: profile', () => {
    test('lists every missing required field', async () => {
      await renderSignup();
      await goToStep2();

      await press('Next');

      expect(
        await screen.findByText(
          'Please fill in: first name, last name, home country, date of birth, gender, country you live in, city, province/state',
        ),
      ).toBeTruthy();
    });

    test('city and province wait until a country is chosen', async () => {
      await renderSignup();
      await goToStep2();

      expect(screen.getByLabelText('City or town').props.editable).toBe(false);
      expect(screen.getByLabelText('Province/State').props.accessibilityState).toMatchObject({
        disabled: true,
      });

      await choose('Country', 'Canada');

      expect(screen.getByLabelText('City or town').props.editable).toBe(true);
      expect(screen.getByLabelText('Province/State').props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });

    test('shows the chosen country with its flag', async () => {
      await renderSignup();
      await goToStep2();

      await choose('Country', 'Canada');

      expect(screen.getByText(getCountryFlag('Canada'))).toBeTruthy();
    });

    test('suggests only cities in the chosen country, and fills in the province', async () => {
      await renderSignup();
      await goToStep2();
      await choose('Country', 'Canada');
      const city = screen.getByLabelText('City or town');

      await fireEvent(city, 'focus');
      await fireEvent.changeText(city, 'London');
      const suggestion = await screen.findByLabelText('London, Ontario');
      // London, England is not in Canada.
      expect(screen.queryByLabelText(/England/)).toBeNull();
      await fireEvent.press(suggestion);

      expect(screen.getByLabelText('City or town').props.value).toBe('London');
      expect(screen.getByLabelText('Province/State').props.accessibilityValue).toEqual({
        text: 'Ontario',
      });
    });

    test('lists only the provinces of the chosen country', async () => {
      await renderSignup();
      await goToStep2();
      await choose('Country', 'Canada');

      await press('Province/State');

      expect(screen.getByText('Ontario')).toBeTruthy();
      await fireEvent.changeText(screen.getByLabelText('Search Province/State'), 'California');
      expect(screen.getByText('No matches')).toBeTruthy();
    });

    test('changing the country clears the city and province', async () => {
      await renderSignup();
      await goToStep2();
      await choose('Country', 'Canada');
      await type('City or town', 'Toronto');

      await choose('Country', 'Mexico');

      expect(screen.getByLabelText('City or town').props.value).toBe('');
      expect(screen.getByLabelText('Province/State').props.accessibilityValue).toEqual({
        text: 'Not selected',
      });
    });

    describe('province must match the city', () => {
      const provinceField = () => screen.getByLabelText('Province/State');

      test('a city in only one province sets and locks it', async () => {
        await renderSignup();
        await goToStep2();
        await choose('Country', 'Canada');

        await type('City or town', 'Toronto');

        expect(provinceField().props.accessibilityValue).toEqual({ text: 'Ontario' });
        expect(provinceField().props.accessibilityState).toMatchObject({ disabled: true });
        expect(screen.getByText('Set from your city. Toronto is only in Ontario.')).toBeTruthy();
      });

      test('typing the city replaces a province it is not in', async () => {
        await renderSignup();
        await goToStep2();
        await choose('Country', 'Canada');
        await choose('Province/State', 'Nova Scotia');

        await type('City or town', 'Toronto');

        expect(provinceField().props.accessibilityValue).toEqual({ text: 'Ontario' });
      });

      test('a city in several provinces only offers those', async () => {
        await renderSignup();
        await goToStep2();
        await choose('Country', 'Canada');
        await choose('Province/State', 'Nova Scotia');

        await type('City or town', 'Richmond');

        // Nova Scotia has no Richmond, so it is cleared and no longer offered.
        expect(provinceField().props.accessibilityValue).toEqual({ text: 'Not selected' });
        expect(provinceField().props.accessibilityState).toMatchObject({ disabled: false });
        await press('Province/State');
        expect(screen.getByText('British Columbia')).toBeTruthy();
        expect(screen.getByText('Ontario')).toBeTruthy();
        expect(screen.getByText('Quebec')).toBeTruthy();
        expect(screen.queryByText('Nova Scotia')).toBeNull();
      });

      test('a city not in the data allows any province', async () => {
        await renderSignup();
        await goToStep2();
        await choose('Country', 'Canada');

        await type('City or town', 'Smallville');
        await choose('Province/State', 'Nova Scotia');

        expect(provinceField().props.accessibilityValue).toEqual({ text: 'Nova Scotia' });
      });

      test('registers Toronto with Ontario', async () => {
        await renderSignup();
        await goToStep4();
        await fillStep4();

        await press('Complete signup');

        await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
        expect(mockRegister.mock.calls[0][0].currentLocation).toEqual({
          province: 'Ontario',
          country: 'Canada',
          city: 'Toronto',
        });
      });
    });

    test('hides the province for a country without provinces', async () => {
      await renderSignup();
      await goToStep2();

      await choose('Country', 'Aruba');

      expect(screen.queryByLabelText('Province/State')).toBeNull();
    });

    test('adds the picked photo as a preview', async () => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1000, width: 100, height: 100 }],
      });
      await renderSignup();
      await goToStep2();

      await press('Add photo');

      expect(await screen.findByLabelText('Profile photo preview')).toBeTruthy();
      expect(screen.getByLabelText('Remove photo')).toBeTruthy();
    });

    test('rejects a photo over 5 MB', async () => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///big.jpg', mimeType: 'image/jpeg', fileName: 'big.jpg', fileSize: 6 * 1024 * 1024, width: 100, height: 100 }],
      });
      await renderSignup();
      await goToStep2();

      await press('Add photo');

      expect(await screen.findByText('Image must be under 5 MB')).toBeTruthy();
      expect(screen.queryByLabelText('Profile photo preview')).toBeNull();
    });

    test('marks required fields with a red asterisk', async () => {
      await renderSignup();
      await goToStep2();

      const asterisks = screen.getAllByLabelText('required');
      // First name, last name, home country, country, city, province, date of birth, gender.
      expect(asterisks).toHaveLength(8);
      expect(asterisks[0].props.className).toContain('text-red-600');
    });

    test('shows the flag next to the chosen home country', async () => {
      await renderSignup();
      await goToStep2();

      await choose('Your home country', 'Poland');

      expect(screen.getByText(getCountryFlag('Poland'))).toBeTruthy();
    });

    test('moves to step 3 when the profile is complete', async () => {
      await renderSignup();
      await goToStep2();
      await fillStep2();

      await press('Next');

      expect(await screen.findByText('Work & education')).toBeTruthy();
    });
  });

  describe('step 4: languages and submit', () => {
    test('requires at least one language', async () => {
      await renderSignup();
      await goToStep4();

      await press('Complete signup');

      expect(await screen.findByText('At least one language is required')).toBeTruthy();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    test('requires something in Looking for', async () => {
      await renderSignup();
      await goToStep4();
      await choose('Language', 'English');

      await press('Complete signup');

      expect(await screen.findByText('Please select what you are looking for')).toBeTruthy();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    test('adds and removes language rows', async () => {
      await renderSignup();
      await goToStep4();

      await press('Add language');
      expect(screen.getAllByLabelText('Language')).toHaveLength(2);

      await press('Remove language 2');
      expect(screen.getAllByLabelText('Language')).toHaveLength(1);
    });

    test('registers with everything collected across the steps', async () => {
      await renderSignup();
      await goToStep4();
      await fillStep4();

      await press('Complete signup');

      await waitFor(() => expect(mockRegister).toHaveBeenCalledTimes(1));
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'marie@example.com',
        username: undefined,
        password: 'Password123',
        firstName: 'Marie',
        lastName: 'Curie',
        about: undefined,
        industry: undefined,
        educationLevel: undefined,
        homeCountry: 'Poland',
        currentLocation: { province: 'Ontario', country: 'Canada', city: 'Toronto' },
        languages: ['English'],
        interests: [],
        lookingFor: ['Friendship'],
        dateOfBirth: '1990-03-15',
        gender: 'female',
      });
      expect(profileAPI.uploadPhoto).not.toHaveBeenCalled();
    });

    test('uploads the photo after registering', async () => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1000, width: 100, height: 100 }],
      });
      await renderSignup();
      await goToStep2();
      await press('Add photo');
      await screen.findByLabelText('Profile photo preview');
      await fillStep2();
      await press('Next');
      await screen.findByText('Work & education');
      await press('Next');
      await screen.findByText('Languages & interests');
      await fillStep4();

      await press('Complete signup');

      await waitFor(() => {
        expect(profileAPI.uploadPhoto).toHaveBeenCalledWith({
          uri: 'file:///photo.jpg',
          name: 'photo.jpg',
          type: 'image/jpeg',
        });
      });
    });

    test('still finishes signup when the photo upload fails', async () => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg', fileSize: 1000, width: 100, height: 100 }],
      });
      jest.mocked(profileAPI.uploadPhoto).mockRejectedValue(new Error('Upload failed'));
      await renderSignup();
      await goToStep2();
      await press('Add photo');
      await screen.findByLabelText('Profile photo preview');
      await fillStep2();
      await press('Next');
      await screen.findByText('Work & education');
      await press('Next');
      await screen.findByText('Languages & interests');
      await fillStep4();

      await press('Complete signup');

      await waitFor(() => expect(profileAPI.uploadPhoto).toHaveBeenCalled());
      expect(screen.queryByText('Upload failed')).toBeNull();
    });

    test('shows the duplicate-email message when registration says the user exists', async () => {
      mockRegister.mockRejectedValue(new Error('User already exists'));
      await renderSignup();
      await goToStep4();
      await fillStep4();

      await press('Complete signup');

      expect(
        await screen.findByText('This email is already registered. Please log in instead.'),
      ).toBeTruthy();
      expect(screen.getByText('Languages & interests')).toBeTruthy();
    });

    test('goes back to step 1 when the username was taken in the meantime', async () => {
      mockRegister.mockRejectedValue(new Error('This username is already taken.'));
      await renderSignup();
      await goToStep4();
      await fillStep4();

      await press('Complete signup');

      expect(await screen.findByText('Create account')).toBeTruthy();
      expect(screen.getByText('This username is already taken.')).toBeTruthy();
    });
  });

  test('Log in link goes back to the login screen', async () => {
    await renderSignup();

    await press('Log in');

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
