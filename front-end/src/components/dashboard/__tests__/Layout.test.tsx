import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import Layout from '../Layout';

const mockLogout = vi.fn();

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'Alex',
      photo: null,
    },
    logout: mockLogout,
  }),
}));

vi.mock('../../../contexts/chatInboxContext', () => ({
  useChatInbox: () => ({ unreadConversationCount: 0 }),
}));

vi.mock('../../../contexts/connectionRequestsContext', () => ({
  useConnectionRequests: () => ({ pendingRequestCount: 0 }),
}));

vi.mock('../../../services/api', () => ({
  getPhotoUrl: (photo: string) => photo,
}));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/discover']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/discover" element={<div>Discover Page</div>} />
          <Route path="/profile" element={<div>Profile Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('Layout user menu', () => {
  beforeEach(() => {
    mockLogout.mockReset();
  });

  it('shows profile and sign out options with icons when menu is open', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'User menu' }));

    const profileLink = screen.getByRole('link', { name: /my profile/i });
    const signOutButton = screen.getByRole('button', { name: /sign out/i });

    expect(profileLink).toBeInTheDocument();
    expect(signOutButton).toBeInTheDocument();
    expect(profileLink.querySelector('svg')).toBeInTheDocument();
    expect(signOutButton.querySelector('svg')).toBeInTheDocument();
  });

  it('navigates to profile when My Profile is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'User menu' }));
    await user.click(screen.getByRole('link', { name: /my profile/i }));

    expect(screen.getByText('Profile Page')).toBeInTheDocument();
  });
});
