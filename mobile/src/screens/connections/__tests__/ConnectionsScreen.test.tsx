import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ConnectionRequestsProvider } from '../../../contexts/ConnectionRequestsProvider';
import { blockAPI, connectionsAPI } from '../../../services/api';
import type { Connection, ConnectionRequestItem } from '../../../types';
import { calculateAgeFromDateOfBirth } from '../../../utils/age';
import { ConnectionsScreen, formatBadgeCount } from '../ConnectionsScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('../../../services/api', () => ({
  connectionsAPI: {
    getConnections: jest.fn(),
    getConnectionRequests: jest.fn(),
    acceptRequest: jest.fn(),
    ignoreRequest: jest.fn(),
    removeConnection: jest.fn(),
  },
  blockAPI: {
    blockUser: jest.fn(),
    reportUser: jest.fn(),
  },
  getPhotoUrl: (path: string) => path,
}));

const kin = (id: string, firstName: string, lastName: string, extra: Partial<Connection> = {}): Connection => ({
  _id: id,
  firstName,
  lastName,
  homeCountry: 'Poland',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['Polish', 'English', 'French'],
  interests: [],
  lookingFor: ['Friendship'],
  ...extra,
});

const request = (id: string, firstName: string, dateOfBirth?: string): ConnectionRequestItem => ({
  _id: id,
  createdAt: '2026-11-01T00:00:00.000Z',
  sender: {
    _id: `sender-${id}`,
    firstName,
    dateOfBirth,
    homeCountry: 'France',
    currentProvince: 'Quebec',
    currentCountry: 'Canada',
    languages: ['French'],
    interests: [],
    lookingFor: ['Networking'],
  },
});

const marie = kin('k1', 'Marie', 'Curie', { connectedAt: '2026-10-05T12:00:00.000Z' });
const pierre = kin('k2', 'Pierre', 'Curie');

const mockNavigate = jest.fn();
let focusListener: (() => void) | undefined;

const renderScreen = async () => {
  focusListener = undefined;
  const navigation = {
    navigate: mockNavigate,
    addListener: jest.fn((event: string, callback: () => void) => {
      if (event === 'focus') focusListener = callback;
      return () => {};
    }),
  };
  const props = {
    navigation,
    route: { key: 'Connections', name: 'Connections' },
  } as unknown as React.ComponentProps<typeof ConnectionsScreen>;

  await render(
    <ConnectionRequestsProvider>
      <ConnectionsScreen {...props} />
    </ConnectionRequestsProvider>,
  );
};

const press = async (label: string) => {
  await fireEvent.press(screen.getByLabelText(label));
};

/** Taps a button of the last Alert.alert. */
const confirmAlert = async (buttonText: string) => {
  const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2] ?? [];
  await buttons.find((button) => button.text === buttonText)?.onPress?.();
};

const openRequests = async () => {
  await fireEvent.press(await screen.findByRole('tab', { name: /Requests/ }));
};

describe('ConnectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(connectionsAPI.getConnections).mockResolvedValue({ success: true, connections: [marie, pierre] });
    jest.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: [request('r1', 'Amelie', '1990-01-15'), request('r2', 'Luc')],
    });
    jest.mocked(connectionsAPI.acceptRequest).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(connectionsAPI.ignoreRequest).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(connectionsAPI.removeConnection).mockResolvedValue({ success: true, message: 'ok' });
    jest.mocked(blockAPI.blockUser).mockResolvedValue({ success: true, message: 'ok' });
  });

  describe('My kins', () => {
    test('lists kins with their details', async () => {
      await renderScreen();

      expect(await screen.findByText('Marie Curie')).toBeTruthy();
      expect(screen.getByText('2 kins')).toBeTruthy();
      expect(screen.getAllByText('Ontario, Canada · Polish, English +1')).toHaveLength(2);
      expect(screen.getAllByText('From Poland')).toHaveLength(2);
      expect(screen.getByText(/^Connected on /)).toBeTruthy();
    });

    test('Message opens the chat with that kin', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press('Message Marie Curie');

      expect(mockNavigate).toHaveBeenCalledWith('Chat', {
        screen: 'ChatThread',
        params: { userId: 'k1' },
        initial: false,
      });
    });

    test('tapping a kin opens their profile', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press("View Marie Curie's profile");

      expect(mockNavigate).toHaveBeenCalledWith('Profile', {
        screen: 'ProfileView',
        params: { userId: 'k1' },
        initial: false,
      });
    });

    test('Remove Kin asks first, then removes them', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press('More actions for Marie Curie');
      await press('Remove Kin');
      expect(connectionsAPI.removeConnection).not.toHaveBeenCalled();
      await confirmAlert('Remove');

      await waitFor(() => expect(screen.queryByText('Marie Curie')).toBeNull());
      expect(connectionsAPI.removeConnection).toHaveBeenCalledWith('k1');
      expect(screen.getByText('1 kin')).toBeTruthy();
    });

    test('Block asks first, then removes them', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press('More actions for Marie Curie');
      await press('Block');
      await confirmAlert('Block');

      await waitFor(() => expect(screen.queryByText('Marie Curie')).toBeNull());
      expect(blockAPI.blockUser).toHaveBeenCalledWith('k1');
    });

    test('a failed remove shows the error and keeps the kin', async () => {
      jest.mocked(connectionsAPI.removeConnection).mockRejectedValue(new Error('Server error'));
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press('More actions for Marie Curie');
      await press('Remove Kin');
      await confirmAlert('Remove');

      expect(await screen.findByText('Server error')).toBeTruthy();
      expect(screen.getByText('Marie Curie')).toBeTruthy();
    });

    test('Report opens the report form', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');

      await press('More actions for Marie Curie');
      await press('Report');

      expect(await screen.findByText('Report Marie Curie')).toBeTruthy();
    });

    test('with no kins, offers Discover', async () => {
      jest.mocked(connectionsAPI.getConnections).mockResolvedValue({ success: true, connections: [] });
      await renderScreen();

      expect(await screen.findByText('No kins yet')).toBeTruthy();
      await fireEvent.press(screen.getByText('Discover people'));

      expect(mockNavigate).toHaveBeenCalledWith('Discover');
    });

    test('a load error offers Try again', async () => {
      jest
        .mocked(connectionsAPI.getConnections)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ success: true, connections: [marie] });
      await renderScreen();

      expect(await screen.findByText('Failed to load kins')).toBeTruthy();
      await fireEvent.press(screen.getByText('Try again'));

      expect(await screen.findByText('Marie Curie')).toBeTruthy();
    });

    test('coming back to the tab reloads the list and the badge', async () => {
      await renderScreen();
      await screen.findByText('Marie Curie');
      await act(async () => focusListener?.()); // first focus = initial mount
      const listCalls = jest.mocked(connectionsAPI.getConnections).mock.calls.length;
      const badgeCalls = jest.mocked(connectionsAPI.getConnectionRequests).mock.calls.length;

      await act(async () => focusListener?.());

      await waitFor(() =>
        expect(jest.mocked(connectionsAPI.getConnections).mock.calls.length).toBe(listCalls + 1),
      );
      expect(jest.mocked(connectionsAPI.getConnectionRequests).mock.calls.length).toBe(badgeCalls + 1);
    });
  });

  describe('Requests', () => {
    test('the Requests tab shows the pending count', async () => {
      await renderScreen();

      expect(await screen.findByRole('tab', { name: 'Requests, 2 pending' })).toBeTruthy();
    });

    test('lists requests with first name and age only', async () => {
      await renderScreen();
      await openRequests();

      const age = calculateAgeFromDateOfBirth('1990-01-15');
      expect(await screen.findByText(`Amelie, ${age}`)).toBeTruthy();
      expect(screen.getByText('Luc')).toBeTruthy();
      expect(screen.getByText('2 pending')).toBeTruthy();
      expect(screen.getAllByText('📍 Quebec, Canada')).toHaveLength(2);
      expect(screen.getAllByText('Networking')).toHaveLength(2);
    });

    test('Accept connects, removes the request and updates the badge', async () => {
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');
      jest
        .mocked(connectionsAPI.getConnectionRequests)
        .mockResolvedValue({ success: true, requests: [request('r2', 'Luc')] });

      await press('Accept kin request from Luc');

      await waitFor(() => expect(screen.queryByText('Luc')).toBeNull());
      expect(connectionsAPI.acceptRequest).toHaveBeenCalledWith('r2');
      expect(await screen.findByRole('tab', { name: 'Requests, 1 pending' })).toBeTruthy();
    });

    test('Ignore removes the request', async () => {
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');

      await press('Ignore kin request from Luc');

      await waitFor(() => expect(screen.queryByText('Luc')).toBeNull());
      expect(connectionsAPI.ignoreRequest).toHaveBeenCalledWith('r2');
    });

    test('a double tap on Accept sends one request', async () => {
      let finish: () => void = () => {};
      jest.mocked(connectionsAPI.acceptRequest).mockReturnValue(
        new Promise((resolve) => {
          finish = () => resolve({ success: true, message: 'ok' });
        }),
      );
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');

      await press('Accept kin request from Luc');
      await press('Accept kin request from Luc');
      await act(async () => finish());

      await waitFor(() => expect(screen.queryByText('Luc')).toBeNull());
      expect(connectionsAPI.acceptRequest).toHaveBeenCalledTimes(1);
    });

    test('a failed accept shows the error and keeps the request', async () => {
      jest.mocked(connectionsAPI.acceptRequest).mockRejectedValue(new Error('Request no longer exists'));
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');

      await press('Accept kin request from Luc');

      expect(await screen.findByText('Request no longer exists')).toBeTruthy();
      expect(screen.getByText('Luc')).toBeTruthy();
    });

    test('Block asks first, then blocks the sender and removes the request', async () => {
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');

      await press('More actions for Luc');
      await press('Block');
      expect(blockAPI.blockUser).not.toHaveBeenCalled();
      await confirmAlert('Block');

      await waitFor(() => expect(screen.queryByText('Luc')).toBeNull());
      expect(blockAPI.blockUser).toHaveBeenCalledWith('sender-r2');
    });

    test('View Profile opens the sender profile', async () => {
      await renderScreen();
      await openRequests();
      await screen.findByText('Luc');

      await press('More actions for Luc');
      await press('View Profile');

      expect(mockNavigate).toHaveBeenCalledWith('Profile', {
        screen: 'ProfileView',
        params: { userId: 'sender-r2' },
        initial: false,
      });
    });

    test('shows an empty state when there are no requests', async () => {
      jest.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({ success: true, requests: [] });
      await renderScreen();
      await openRequests();

      expect(await screen.findByText('No pending requests')).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Requests' })).toBeTruthy();
    });
  });

  test('badge counts over 99 show as 99+', () => {
    expect(formatBadgeCount(5)).toBe('5');
    expect(formatBadgeCount(99)).toBe('99');
    expect(formatBadgeCount(100)).toBe('99+');
  });
});
