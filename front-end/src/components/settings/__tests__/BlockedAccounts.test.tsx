import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BlockedAccounts from '../BlockedAccounts';

const getBlockedUsers = vi.fn();
const unblockUser = vi.fn();

vi.mock('../../../services/api', () => ({
  blockAPI: {
    getBlockedUsers: () => getBlockedUsers(),
    unblockUser: (userId: string) => unblockUser(userId),
  },
}));

const row = (id: string, firstName: string, createdAt?: string) => ({
  _id: `block-${id}`,
  blocked: {
    _id: id,
    firstName,
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
  },
  createdAt,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <BlockedAccounts />
    </MemoryRouter>,
  );

describe('BlockedAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBlockedUsers.mockResolvedValue({ success: true, blockedUsers: [] });
    unblockUser.mockResolvedValue({ success: true });
  });

  it('shows a loading state before the list arrives', () => {
    getBlockedUsers.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/loading blocked accounts/i)).toBeInTheDocument();
  });

  it('shows the empty state when nobody is blocked', async () => {
    renderPage();

    expect(await screen.findByText(/you haven’t blocked anyone/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unblock/i })).not.toBeInTheDocument();
  });

  it('lists blocked accounts with location, date and a count', async () => {
    getBlockedUsers.mockResolvedValue({
      success: true,
      blockedUsers: [row('u1', 'Tomas', '2026-03-05T10:00:00.000Z'), row('u2', 'Valentina')],
    });
    renderPage();

    expect(await screen.findByText('Tomas')).toBeInTheDocument();
    expect(screen.getByText('Valentina')).toBeInTheDocument();
    expect(screen.getAllByText('Ontario, Canada')).toHaveLength(2);
    expect(screen.getByText(/2 accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/blocked on/i)).toBeInTheDocument();
  });

  it('uses the singular label for one account', async () => {
    getBlockedUsers.mockResolvedValue({ success: true, blockedUsers: [row('u1', 'Tomas')] });
    renderPage();

    expect(await screen.findByText(/1 account$/i)).toBeInTheDocument();
  });

  it('warns that unblocking does not restore the connection', async () => {
    renderPage();

    expect(
      await screen.findByText(/does not\s+restore a previous connection/i),
    ).toBeInTheDocument();
  });

  it('unblocks by the user id, not the block row id', async () => {
    const user = userEvent.setup();
    getBlockedUsers.mockResolvedValue({ success: true, blockedUsers: [row('u1', 'Tomas')] });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /unblock tomas/i }));

    // the row's own _id is "block-u1"; the API must receive the user's id
    expect(unblockUser).toHaveBeenCalledWith('u1');
  });

  it('removes the row and confirms after a successful unblock', async () => {
    const user = userEvent.setup();
    getBlockedUsers.mockResolvedValue({
      success: true,
      blockedUsers: [row('u1', 'Tomas'), row('u2', 'Valentina')],
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /unblock tomas/i }));

    await waitFor(() => expect(screen.queryByText('Tomas')).not.toBeInTheDocument());
    expect(screen.getByText('Valentina')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/tomas has been unblocked/i);
  });

  it('keeps the row and shows an error when unblocking fails', async () => {
    const user = userEvent.setup();
    getBlockedUsers.mockResolvedValue({ success: true, blockedUsers: [row('u1', 'Tomas')] });
    unblockUser.mockRejectedValue(new Error('nope'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /unblock tomas/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Tomas')).toBeInTheDocument();
  });

  it('surfaces the error message on a load failure', async () => {
    getBlockedUsers.mockRejectedValue(new Error('Network Error'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');
  });

  it('falls back to a friendly message when the failure carries none', async () => {
    // getErrorMessage only uses the fallback for non-Error values
    getBlockedUsers.mockRejectedValue({});
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unable to load blocked accounts/i,
    );
  });

  it('skips rows whose blocked user could not be populated', async () => {
    getBlockedUsers.mockResolvedValue({
      success: true,
      blockedUsers: [row('u1', 'Tomas'), { _id: 'block-orphan', blocked: null }],
    });
    renderPage();

    expect(await screen.findByText('Tomas')).toBeInTheDocument();
    expect(screen.getByText(/1 account$/i)).toBeInTheDocument();
  });

  it('links back to the Privacy hub', async () => {
    renderPage();

    await screen.findByText(/you haven’t blocked anyone/i);
    expect(screen.getByRole('link', { name: /back to privacy/i })).toHaveAttribute(
      'href',
      '/settings/privacy',
    );
  });
});
