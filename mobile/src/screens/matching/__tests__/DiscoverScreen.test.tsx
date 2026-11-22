import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { blockAPI, matchingAPI } from '../../../services/api';
import type { Match } from '../../../types';
import { DiscoverScreen } from '../DiscoverScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('../../../services/api', () => ({
  matchingAPI: {
    getMatches: jest.fn(),
    sendMeetRequest: jest.fn(),
    passUser: jest.fn(),
  },
  blockAPI: {
    blockUser: jest.fn(),
    reportUser: jest.fn(),
  },
  getPhotoUrl: (path: string) => path,
}));

const makeMatch = (id: string, firstName: string, extra: Partial<Match> = {}): Match => ({
  _id: id,
  firstName,
  homeCountry: 'Poland',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['Polish', 'English'],
  interests: ['Chess'],
  lookingFor: ['Friendship'],
  ...extra,
});

const marie = makeMatch('u1', 'Marie', {
  industry: 'Research',
  about: 'Physicist who loves chess.',
  educationLevel: 'Doctorate / PhD',
});
const pierre = makeMatch('u2', 'Pierre');

const mockNavigate = jest.fn();

const renderDiscover = async () => {
  const props = {
    navigation: { navigate: mockNavigate },
    route: { key: 'Discover', name: 'Discover' },
  } as unknown as React.ComponentProps<typeof DiscoverScreen>;
  await render(<DiscoverScreen {...props} />);
};

const press = async (label: string) => {
  await fireEvent.press(screen.getByLabelText(label));
};

/** Taps a destructive/confirm button of the last Alert.alert. */
const confirmAlert = async (buttonText: string) => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  const button = buttons.find((b) => b.text === buttonText);
  await button?.onPress?.();
};

describe('DiscoverScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(matchingAPI.getMatches).mockResolvedValue({ success: true, matches: [marie, pierre] });
    jest.mocked(matchingAPI.sendMeetRequest).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(matchingAPI.passUser).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(blockAPI.blockUser).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(blockAPI.reportUser).mockResolvedValue({ success: true, message: 'ok' });
  });

  describe('profile card', () => {
    test('shows the first match with their details', async () => {
      await renderDiscover();

      expect(await screen.findByText('Marie')).toBeTruthy();
      expect(screen.getByText('2 matches available')).toBeTruthy();
      expect(screen.getByText('Research')).toBeTruthy();
      expect(screen.getByText('Physicist who loves chess.')).toBeTruthy();
      expect(screen.getByText('Doctorate / PhD')).toBeTruthy();
      expect(screen.getByText('Polish')).toBeTruthy();
      expect(screen.getByText('Chess')).toBeTruthy();
      expect(screen.getByText('Friendship')).toBeTruthy();
    });

    test('Meet sends a request and shows the next person', async () => {
      await renderDiscover();
      await screen.findByText('Marie');

      await press('Send meet request');

      expect(await screen.findByText('Pierre')).toBeTruthy();
      expect(matchingAPI.sendMeetRequest).toHaveBeenCalledWith('u1');
      expect(screen.getByText('1 match available')).toBeTruthy();
    });

    test('Pass records the pass and shows the next person', async () => {
      await renderDiscover();
      await screen.findByText('Marie');

      await press('Pass on this match');

      expect(await screen.findByText('Pierre')).toBeTruthy();
      expect(matchingAPI.passUser).toHaveBeenCalledWith('u1');
    });

    test('a failed Meet shows the error and keeps the same person', async () => {
      jest.mocked(matchingAPI.sendMeetRequest).mockRejectedValue(new Error('Request already sent'));
      await renderDiscover();
      await screen.findByText('Marie');

      await press('Send meet request');

      expect(await screen.findByText('Request already sent')).toBeTruthy();
      expect(screen.getByText('Marie')).toBeTruthy();
    });

    test('a double tap on Meet sends only one request', async () => {
      let finish: () => void = () => {};
      jest.mocked(matchingAPI.sendMeetRequest).mockReturnValue(
        new Promise((resolve) => {
          finish = () => resolve({ success: true, message: 'ok' });
        }),
      );
      await renderDiscover();
      await screen.findByText('Marie');

      await press('Send meet request');
      await press('Send meet request');
      finish();

      expect(await screen.findByText('Pierre')).toBeTruthy();
      expect(matchingAPI.sendMeetRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('more actions', () => {
    test('View Profile opens their profile in the Profile tab', async () => {
      await renderDiscover();
      await screen.findByText('Marie');

      await press('More actions for Marie');
      await press('View Profile');

      expect(mockNavigate).toHaveBeenCalledWith('Profile', {
        screen: 'ProfileView',
        params: { userId: 'u1' },
        initial: false,
      });
    });

    test('Block asks first, then removes them', async () => {
      await renderDiscover();
      await screen.findByText('Marie');

      await press('More actions for Marie');
      await press('Block');
      expect(Alert.alert).toHaveBeenCalledWith('Block Marie?', expect.any(String), expect.any(Array));
      expect(blockAPI.blockUser).not.toHaveBeenCalled();

      await confirmAlert('Block');

      expect(await screen.findByText('Pierre')).toBeTruthy();
      expect(blockAPI.blockUser).toHaveBeenCalledWith('u1');
    });

    test('Report needs a reason, then offers to block', async () => {
      await renderDiscover();
      await screen.findByText('Marie');
      await press('More actions for Marie');
      await press('Report');

      await press('Submit report');
      expect(await screen.findByText('Please choose a reason')).toBeTruthy();

      await press('Spam or scam');
      await press('Submit report');

      expect(await screen.findByText('Report received')).toBeTruthy();
      expect(blockAPI.reportUser).toHaveBeenCalledWith('u1', 'Spam or scam', undefined);

      await press('Block Marie');

      expect(await screen.findByText('Pierre')).toBeTruthy();
      expect(blockAPI.blockUser).toHaveBeenCalledWith('u1');
    });

    test('Report with Other requires details', async () => {
      await renderDiscover();
      await screen.findByText('Marie');
      await press('More actions for Marie');
      await press('Report');

      await press('Other');
      await press('Submit report');

      expect(
        await screen.findByText('Please describe the issue when choosing Other'),
      ).toBeTruthy();
      expect(blockAPI.reportUser).not.toHaveBeenCalled();
    });
  });

  describe('loading and empty states', () => {
    test('asks for more at the end of a page, then shows all caught up', async () => {
      jest
        .mocked(matchingAPI.getMatches)
        .mockResolvedValueOnce({ success: true, matches: [marie] })
        .mockResolvedValueOnce({ success: true, matches: [], emptyState: 'all_caught_up' });
      await renderDiscover();
      await screen.findByText('Marie');

      await press('Pass on this match');

      expect(await screen.findByText('You’re all caught up')).toBeTruthy();
      expect(matchingAPI.getMatches).toHaveBeenCalledTimes(2);
    });

    test('shows the growing-community state when no one matches', async () => {
      jest
        .mocked(matchingAPI.getMatches)
        .mockResolvedValue({ success: true, matches: [], emptyState: 'community_growing' });
      await renderDiscover();

      expect(await screen.findByText('Your community is still growing')).toBeTruthy();
      expect(screen.queryByLabelText('Notify me')).toBeNull();
    });

    test('a load error offers Try again', async () => {
      jest
        .mocked(matchingAPI.getMatches)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ success: true, matches: [marie] });
      await renderDiscover();

      expect(await screen.findByText('Failed to load matches')).toBeTruthy();
      await fireEvent.press(screen.getByText('Try again'));

      expect(await screen.findByText('Marie')).toBeTruthy();
    });
  });
});
