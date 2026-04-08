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
  getPhotoUrl: (p: string) => p,
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

  it('shows "No More Matches" when empty', async () => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({ success: true, matches: [] });
    renderDiscover();
    await waitFor(() => {
      expect(screen.getByText('No More Matches')).toBeInTheDocument();
    });
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
  });

  it('shows "No More Matches" after last match', async () => {
    vi.mocked(matchingAPI.getMatches).mockResolvedValue({
      success: true,
      matches: [mockMatches[0]],
    });
    const user = userEvent.setup();
    renderDiscover();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /pass/i }));

    await waitFor(() => {
      expect(screen.getByText('No More Matches')).toBeInTheDocument();
    });
  });
});
