import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import Layout from '../Layout';

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'Alex',
      profileComplete: true,
    },
    logout: vi.fn(),
  }),
}));

vi.mock('../../../contexts/chatInboxContext', () => ({
  useChatInbox: () => ({ unreadConversationCount: 0 }),
}));

vi.mock('../../../contexts/connectionRequestsContext', () => ({
  useConnectionRequests: () => ({ pendingRequestCount: 0 }),
}));

describe('Layout user menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Settings & Privacy below Sign Out in the user menu', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/discover']}>
        <Layout />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /user menu/i }));

    const profileLink = screen.getByRole('link', { name: /my profile/i });
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    const settingsLink = screen.getByRole('link', { name: /settings & privacy/i });

    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(
      profileLink.compareDocumentPosition(signOutButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      signOutButton.compareDocumentPosition(settingsLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
