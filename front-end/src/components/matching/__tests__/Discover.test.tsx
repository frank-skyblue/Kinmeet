import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Discover from '../Discover';

const mockMatches = [
  {
    _id: 'match-1',
    firstName: 'Marie',
    homeCountry: 'France',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['French', 'English'],
    interests: ['Cooking'],
    lookingFor: ['Friendship'],
  },
  {
    _id: 'match-2',
    firstName: 'Julien',
    homeCountry: 'France',
    currentProvince: 'BC',
    currentCountry: 'Canada',
    languages: ['French'],
    interests: [],
    lookingFor: ['Networking'],
  },
];

vi.mock('../../../services/api', () => ({
  matchingAPI: {
    getMatches: vi.fn(),
    sendMeetRequest: vi.fn(),
    passUser: vi.fn(),
  },
  notificationsAPI: {
    getPreferences: vi.fn().mockResolvedValue({
      success: true,
      preferences: { newPeopleNearby: { email: false, push: false } },
    }),
    updatePreferences: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

vi.mock('../../../services/pushNotifications', () => ({
  registerWebPushForCurrentUser: vi.fn(),
}));

import { matchingAPI } from '../../../services/api';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const renderDiscover = () =>
  render(
    <MemoryRouter>
      <Discover />
    </MemoryRouter>,
  );

describe('Discover', () => {
  beforeEach(() => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({ success: true, matches: mockMatches });
    vi.mocked(matchingAPI.sendMeetRequest).mockResolvedValue({ success: true });
    vi.mocked(matchingAPI.passUser).mockResolvedValue({ success: true });
  });

  it('renders the first match card', async () => {
    renderDiscover();
    await waitFor(() => {
      expect(screen.getByText('Marie')).toBeInTheDocument();
    });
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('shows "Your community is still growing" when no one else is in the group', async () => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({
      success: true,
      matches: [],
      emptyState: 'community_growing',
    });
    renderDiscover();

    expect(
      await screen.findByRole('heading', { name: 'Your community is still growing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Get notified when someone from your home country joins near you\./),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /notify me/i })).toBeInTheDocument();
  });

  it('shows "You’re all caught up" when everyone has been seen', async () => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({
      success: true,
      matches: [],
      emptyState: 'all_caught_up',
    });
    renderDiscover();

    expect(await screen.findByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument();
    expect(
      screen.getByText('Get notified when new people from your home country join.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /notify me/i })).toBeInTheDocument();
  });

  it('offers to try again when loading fails', async () => {
    vi.mocked(matchingAPI.getMatches).mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    renderDiscover();

    await user.click(await screen.findByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Marie')).toBeInTheDocument();
  });

  it('stops and offers to try again when the server answers without success', async () => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({ success: false, matches: [] });
    renderDiscover();

    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(matchingAPI.getMatches).toHaveBeenCalledTimes(1);
  });

  it('advances to next match on Meet', async () => {
    const user = userEvent.setup();
    renderDiscover();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /meet/i }));

    await waitFor(() => {
      expect(screen.getByText('Julien')).toBeInTheDocument();
    });
    expect(matchingAPI.sendMeetRequest).toHaveBeenCalledWith('match-1');
  });

  it('advances to next match on Pass', async () => {
    const user = userEvent.setup();
    renderDiscover();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /pass/i }));

    await waitFor(() => {
      expect(screen.getByText('Julien')).toBeInTheDocument();
    });
    expect(matchingAPI.passUser).toHaveBeenCalledWith('match-1');
  });

  it('asks the server for more at the end of the list before showing an empty state', async () => {
    vi.mocked(matchingAPI.getMatches)
      .mockResolvedValueOnce({ success: true, matches: [mockMatches[0]] })
      .mockResolvedValueOnce({ success: true, matches: [mockMatches[1]] })
      .mockResolvedValueOnce({ success: true, matches: [], emptyState: 'all_caught_up' });
    const user = userEvent.setup();
    renderDiscover();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /pass/i }));
    expect(await screen.findByText('Julien')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /pass/i }));
    expect(await screen.findByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument();
    expect(matchingAPI.getMatches).toHaveBeenCalledTimes(3);
  });
});
