import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import AdminPage from '../AdminPage';
import { adminAPI } from '../../../services/api';
import type { AdminReportItem, AdminReportListResponse } from '../../../types';

vi.mock('../../../services/api', () => ({
  adminAPI: {
    getSession: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    listFeedback: vi.fn(),
    listReports: vi.fn(),
    updateReportStatus: vi.fn(),
  },
}));

const axiosError = (status?: number) =>
  new AxiosError(
    status ? 'Request failed' : 'Network Error',
    status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
    undefined,
    undefined,
    status
      ? {
          status,
          statusText: 'Error',
          data: { message: 'Unable to load reports.' },
          headers: {},
          config: { headers: new AxiosHeaders() },
        }
      : undefined,
  );

const report = (overrides: Partial<AdminReportItem> = {}): AdminReportItem => ({
  id: 'report-1',
  reporterEmail: 'lucia@example.com',
  reportedEmail: 'tomas@example.com',
  reportedName: 'Tomas',
  reason: 'Harassment or bullying',
  details: 'Kept sending unwanted messages',
  status: 'new',
  createdAt: '2026-09-16T12:00:00.000Z',
  ...overrides,
});

const reportsPage = (
  reports: AdminReportItem[] = [],
  page = 1,
  total = reports.length,
): AdminReportListResponse => ({
  success: true,
  reports,
  pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};

const renderReports = () =>
  render(
    <MemoryRouter>
      <AdminPage section="reports" />
    </MemoryRouter>,
  );

describe('AdminPage — reports', () => {
  beforeEach(() => {
    vi.mocked(adminAPI.getSession).mockReset().mockResolvedValue({ success: true, authenticated: true });
    vi.mocked(adminAPI.logout).mockReset().mockResolvedValue({ success: true, message: 'ok' });
    vi.mocked(adminAPI.listReports).mockReset().mockResolvedValue(reportsPage());
    vi.mocked(adminAPI.updateReportStatus).mockReset();
  });

  it('fetches reports, not feedback, for the reports section', async () => {
    renderReports();

    expect(await screen.findByText('No reports yet.')).toBeInTheDocument();
    expect(adminAPI.listReports).toHaveBeenCalledWith(1);
    expect(adminAPI.listFeedback).not.toHaveBeenCalled();
  });

  it('marks the Reports nav tab as current', async () => {
    renderReports();
    await screen.findByText('No reports yet.');

    expect(screen.getByRole('link', { name: /reports/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /feedback/i })).not.toHaveAttribute('aria-current');
  });

  it('shows a loading state before the list arrives', async () => {
    const list = deferred<AdminReportListResponse>();
    vi.mocked(adminAPI.listReports).mockReturnValueOnce(list.promise);
    renderReports();

    expect(await screen.findByText(/loading reports/i)).toBeInTheDocument();
    await act(async () => list.resolve(reportsPage()));
  });

  it('renders a report row with both users, reason, details and status', async () => {
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    renderReports();

    const table = await screen.findByRole('table');
    const row = within(table).getByRole('row', { name: /tomas@example\.com/i });

    expect(within(row).getByText('tomas@example.com')).toBeInTheDocument();
    expect(within(row).getByText('lucia@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Harassment or bullying')).toBeInTheDocument();
    expect(within(row).getByText('Kept sending unwanted messages')).toBeInTheDocument();
    expect(within(row).getByText('New')).toBeInTheDocument();
  });

  it('falls back when a report carries no details', async () => {
    vi.mocked(adminAPI.listReports).mockResolvedValue(
      reportsPage([report({ details: undefined })]),
    );
    renderReports();

    const table = await screen.findByRole('table');
    expect(within(table).getAllByText(/no additional details/i).length).toBeGreaterThan(0);
  });

  it('renders non-default statuses through the shared formatter', async () => {
    vi.mocked(adminAPI.listReports).mockResolvedValue(
      reportsPage([report({ status: 'reviewing' })]),
    );
    renderReports();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Reviewing')).toBeInTheDocument();
  });

  it('opens the details dialog and closes it again', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    renderReports();

    await user.click((await screen.findAllByRole('button', { name: /view details/i }))[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Report details')).toBeInTheDocument();
    expect(within(dialog).getByText(/Tomas — tomas@example\.com/)).toBeInTheDocument();
    expect(within(dialog).getByText('lucia@example.com')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /close details/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pages through results', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()], 1, 40));
    renderReports();

    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(adminAPI.listReports).toHaveBeenLastCalledWith(2);
  });

  it('surfaces a load error and retries', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports)
      .mockRejectedValueOnce(axiosError(500))
      .mockResolvedValueOnce(reportsPage([report()]));
    renderReports();

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load reports/i);

    await user.click(screen.getByRole('button', { name: /^retry$/i }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('drops back to login when the session expires mid-list', async () => {
    vi.mocked(adminAPI.listReports).mockRejectedValue(axiosError(401));
    renderReports();

    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('shows the current status in a select and lists every option', async () => {
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    renderReports();

    const table = await screen.findByRole('table');
    const select = within(table).getByRole('combobox') as HTMLSelectElement;

    expect(select.value).toBe('new');
    expect(
      within(select).getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['New', 'Reviewing', 'Resolved']);
  });

  it('marks a report as reviewing and reflects the server response', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    vi.mocked(adminAPI.updateReportStatus).mockResolvedValue({
      success: true,
      report: report({ status: 'reviewing' }),
    });
    renderReports();

    const table = await screen.findByRole('table');
    await user.selectOptions(within(table).getByRole('combobox'), 'reviewing');

    expect(adminAPI.updateReportStatus).toHaveBeenCalledWith('report-1', 'reviewing');
    await waitFor(() =>
      expect((within(table).getByRole('combobox') as HTMLSelectElement).value).toBe('reviewing'),
    );
  });

  it('can mark a report resolved', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    vi.mocked(adminAPI.updateReportStatus).mockResolvedValue({
      success: true,
      report: report({ status: 'resolved' }),
    });
    renderReports();

    const table = await screen.findByRole('table');
    await user.selectOptions(within(table).getByRole('combobox'), 'resolved');

    expect(adminAPI.updateReportStatus).toHaveBeenCalledWith('report-1', 'resolved');
  });

  it('surfaces a status update failure without losing the row', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    vi.mocked(adminAPI.updateReportStatus).mockRejectedValue(axiosError(500));
    renderReports();

    const table = await screen.findByRole('table');
    await user.selectOptions(within(table).getByRole('combobox'), 'resolved');

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(within(table).getByText('tomas@example.com')).toBeInTheDocument();
  });

  it('drops back to login if the session expires during a status update', async () => {
    const user = userEvent.setup();
    vi.mocked(adminAPI.listReports).mockResolvedValue(reportsPage([report()]));
    vi.mocked(adminAPI.updateReportStatus).mockRejectedValue(axiosError(401));
    renderReports();

    const table = await screen.findByRole('table');
    await user.selectOptions(within(table).getByRole('combobox'), 'reviewing');

    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
  });
});
