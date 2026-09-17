import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import AdminPage from '../AdminPage';
import { adminAPI } from '../../../services/api';
import type { AdminFeedbackItem, AdminFeedbackListResponse, AdminSessionResponse } from '../../../types';

vi.mock('../../../services/api', () => ({
  adminAPI: {
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    listFeedback: vi.fn(),
  },
}));

const axiosError = (status?: number) => new AxiosError(
  status ? 'Request failed' : 'Network Error',
  status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
  undefined,
  undefined,
  status ? {
    status,
    statusText: 'Error',
    data: { message: 'Unable to load feedback.' },
    headers: {},
    config: { headers: new AxiosHeaders() },
  } : undefined,
);

const item: AdminFeedbackItem = {
  id: 'feedback-1',
  email: 'ada@example.com',
  category: 'Bug or Technical Issue',
  message: 'Feedback body',
  screenshots: [{ url: 'https://res.cloudinary.com/demo/image.png' }],
  followUp: true,
  status: 'new',
  createdAt: '2026-09-16T12:00:00.000Z',
};

const feedbackPage = (feedback: AdminFeedbackItem[] = [], page = 1, total = feedback.length): AdminFeedbackListResponse => ({
  success: true,
  feedback,
  pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

const renderAdmin = () => render(<MemoryRouter><AdminPage /></MemoryRouter>);

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(adminAPI.getSession).mockReset().mockResolvedValue({ success: true, authenticated: true });
    vi.mocked(adminAPI.login).mockReset().mockResolvedValue({ success: true, message: 'ok' });
    vi.mocked(adminAPI.logout).mockReset().mockResolvedValue({ success: true, message: 'ok' });
    vi.mocked(adminAPI.listFeedback).mockReset().mockResolvedValue(feedbackPage());
  });

  it('checks the session without flashing login, then lets an unauthenticated admin sign in', async () => {
    const session = deferred<AdminSessionResponse>();
    vi.mocked(adminAPI.getSession).mockReturnValue(session.promise);
    const user = userEvent.setup();
    renderAdmin();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();

    await act(async () => session.reject(axiosError(401)));
    const password = 'x'.repeat(16);
    await user.type(await screen.findByLabelText(/^password$/i), password);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('No feedback yet.')).toBeInTheDocument();
    expect(adminAPI.login).toHaveBeenCalledWith(password);
    expect(adminAPI.listFeedback).toHaveBeenCalledWith(1);
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it.each([undefined, 500])('retries session failures (%s) without showing login', async (status) => {
    vi.mocked(adminAPI.getSession)
      .mockRejectedValueOnce(axiosError(status))
      .mockResolvedValueOnce({ success: true, authenticated: true });
    const user = userEvent.setup();
    renderAdmin();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('No feedback yet.')).toBeInTheDocument();
  });

  it('shows list loading, retries an error, and displays the empty result', async () => {
    const list = deferred<AdminFeedbackListResponse>();
    vi.mocked(adminAPI.listFeedback).mockReturnValueOnce(list.promise);
    const user = userEvent.setup();
    renderAdmin();
    expect(await screen.findByText('Loading feedback...')).toBeInTheDocument();
    await act(async () => list.reject(axiosError(500)));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load feedback.');
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText('No feedback yet.')).toBeInTheDocument();
    expect(screen.queryByText(/showing /i)).not.toBeInTheDocument();
  });

  it('uses server totals for ranges and supports next and previous pages', async () => {
    const first = feedbackPage([item], 1, 21);
    const second = feedbackPage([{ ...item, id: 'feedback-2', message: 'Second page' }], 2, 21);
    vi.mocked(adminAPI.listFeedback)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second)
      .mockResolvedValueOnce(first);
    const user = userEvent.setup();
    renderAdmin();
    expect(await screen.findByText('Showing 1 to 20 of 21 feedback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('Showing 21 to 21 of 21 feedback')).toBeInTheDocument();
    expect(adminAPI.listFeedback).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(await screen.findByText('Showing 1 to 20 of 21 feedback')).toBeInTheDocument();
    expect(adminAPI.listFeedback).toHaveBeenLastCalledWith(1);
  });

  it('hides stale list data on a page error and returns to login when the session expires', async () => {
    vi.mocked(adminAPI.listFeedback)
      .mockResolvedValueOnce(feedbackPage([item], 1, 21))
      .mockRejectedValueOnce(axiosError(500))
      .mockRejectedValueOnce(axiosError(401));
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Showing 1 to 20 of 21 feedback');
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await screen.findByRole('alert');
    expect(screen.queryByText(item.message)).not.toBeInTheDocument();
    expect(screen.queryByText(/showing /i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('immediately hides feedback during logout and offers retry when logout is unconfirmed', async () => {
    const logout = deferred<Awaited<ReturnType<typeof adminAPI.logout>>>();
    vi.mocked(adminAPI.listFeedback).mockResolvedValue(feedbackPage([item]));
    vi.mocked(adminAPI.logout).mockReturnValueOnce(logout.promise);
    const user = userEvent.setup();
    renderAdmin();
    await screen.findAllByText(item.message);
    await user.click(screen.getByRole('button', { name: /^log out$/i }));
    expect(screen.queryByText(item.message)).not.toBeInTheDocument();
    await act(async () => logout.reject(axiosError()));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your admin session may still be active.');
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry log out/i }));
    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('shows full text safely and traps, restores focus when details close with Escape', async () => {
    const message = '<script>alert(1)</script> ' + 'Full feedback text. '.repeat(25);
    vi.mocked(adminAPI.listFeedback).mockResolvedValue(feedbackPage([{ ...item, message }]));
    const user = userEvent.setup();
    renderAdmin();
    const opener = (await screen.findAllByRole('button', { name: /view details/i }))[0];
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: /feedback details/i });
    expect(within(dialog).getByText(message.trim())).toBeInTheDocument();
    expect(dialog.querySelector('script')).toBeNull();
    const close = within(dialog).getByRole('button', { name: /close details/i });
    const link = within(dialog).getByRole('link');
    expect(link).toHaveAttribute('href', item.screenshots[0].url);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(link).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    opener.focus();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
});
