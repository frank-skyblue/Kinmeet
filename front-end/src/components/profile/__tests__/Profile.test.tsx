import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import Profile from '../Profile';
import type { UserProfile } from '../../../types';

const fullProfile: UserProfile = {
  _id: 'user-1',
  email: 'me@example.com',
  username: 'meuser',
  firstName: 'Alex',
  lastName: 'Rivera',
  about: 'Hello',
  homeCountry: 'Canada',
  currentProvince: 'ON',
  currentCountry: 'Canada',
  languages: ['English'],
  interests: ['Music'],
  lookingFor: ['Friends'],
  profileComplete: true,
  dateOfBirth: '1990-06-15',
};

const otherProfile: UserProfile = {
  _id: 'other-9',
  firstName: 'Sam',
  lastName: 'Lee',
  homeCountry: 'USA',
  currentProvince: 'CA',
  currentCountry: 'USA',
  languages: ['English'],
  interests: [],
  lookingFor: ['Networking'],
  profileComplete: true,
};

vi.mock('../../../services/api', () => ({
  profileAPI: {
    getProfile: vi.fn(),
    getUserProfile: vi.fn(),
  },
}));

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'me@example.com',
      firstName: 'Alex',
      lastName: 'Rivera',
      profileComplete: true,
    },
    isLoading: false,
  }),
}));

import { profileAPI } from '../../../services/api';
import { calculateAgeFromDateOfBirth } from '../../../utils/age';

const renderProfileAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Profile', () => {
  beforeEach(() => {
    vi.mocked(profileAPI.getProfile).mockReset();
    vi.mocked(profileAPI.getUserProfile).mockReset();
  });

  it('loads own profile at /profile and shows manage actions', async () => {
    vi.mocked(profileAPI.getProfile).mockResolvedValue({ success: true, user: fullProfile });
    renderProfileAt('/profile');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
    expect(profileAPI.getProfile).toHaveBeenCalled();
    expect(profileAPI.getUserProfile).not.toHaveBeenCalled();
  });

  it('loads another user at /profile/:userId and hides edit/delete', async () => {
    vi.mocked(profileAPI.getUserProfile).mockResolvedValue({
      success: true,
      user: otherProfile,
      isConnected: true,
    });
    renderProfileAt('/profile/other-9');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sam lee/i })).toBeInTheDocument();
    });
    expect(profileAPI.getUserProfile).toHaveBeenCalledWith('other-9');
    expect(profileAPI.getProfile).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete account/i })).not.toBeInTheDocument();
  });

  it('uses getProfile when URL userId matches logged-in user', async () => {
    vi.mocked(profileAPI.getProfile).mockResolvedValue({ success: true, user: fullProfile });
    renderProfileAt('/profile/user-1');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
    expect(profileAPI.getProfile).toHaveBeenCalled();
    expect(profileAPI.getUserProfile).not.toHaveBeenCalled();
  });

  it('shows age instead of raw date of birth on own profile', async () => {
    vi.mocked(profileAPI.getProfile).mockResolvedValue({ success: true, user: fullProfile });
    renderProfileAt('/profile');
    const expectedAge = calculateAgeFromDateOfBirth(fullProfile.dateOfBirth);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^age$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(String(expectedAge))).toBeInTheDocument();
    expect(screen.queryByText('1990-06-15')).not.toBeInTheDocument();
    expect(screen.queryByText(/birthday/i)).not.toBeInTheDocument();
  });

  it('shows age instead of raw date of birth on another user profile', async () => {
    const userWithDob = { ...otherProfile, dateOfBirth: '1990-06-15' };
    vi.mocked(profileAPI.getUserProfile).mockResolvedValue({
      success: true,
      user: userWithDob,
      isConnected: true,
    });
    renderProfileAt('/profile/other-9');
    const expectedAge = calculateAgeFromDateOfBirth(userWithDob.dateOfBirth);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^age$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(String(expectedAge))).toBeInTheDocument();
    expect(screen.queryByText('1990-06-15')).not.toBeInTheDocument();
  });

  it('shows country flags for home and current country', async () => {
    vi.mocked(profileAPI.getProfile).mockResolvedValue({ success: true, user: fullProfile });
    const { container } = renderProfileAt('/profile');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });
    expect(container.querySelector('.fi-ca')).toBeInTheDocument();
    expect(screen.getByText('ON, Canada')).toBeInTheDocument();
  });

  it('shows flags for legacy USA country values', async () => {
    vi.mocked(profileAPI.getUserProfile).mockResolvedValue({
      success: true,
      user: otherProfile,
      isConnected: true,
    });
    const { container } = renderProfileAt('/profile/other-9');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sam lee/i })).toBeInTheDocument();
    });
    expect(container.querySelectorAll('.fi-us').length).toBeGreaterThanOrEqual(1);
  });
});
