import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Requests from '../Requests';

const { mockRefetchConnectionRequests } = vi.hoisted(() => ({
  mockRefetchConnectionRequests: vi.fn(),
}));

vi.mock('../../../contexts/connectionRequestsContext', () => ({
  useConnectionRequests: () => ({
    pendingRequestCount: 0,
    refetchConnectionRequests: mockRefetchConnectionRequests,
  }),
}));

const mockRequests = [
  {
    _id: 'req-1',
    sender: {
      _id: 'user-2',
      firstName: 'Marie',
      homeCountry: 'France',
      currentProvince: 'Ontario',
      currentCountry: 'Canada',
      languages: ['French'],
      interests: [],
      lookingFor: ['Friendship'],
    },
    createdAt: new Date().toISOString(),
  },
];

vi.mock('../../../services/api', () => ({
  connectionsAPI: {
    getConnectionRequests: vi.fn(),
    acceptRequest: vi.fn(),
    ignoreRequest: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

import { connectionsAPI } from '../../../services/api';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const renderRequests = () =>
  render(
    <MemoryRouter>
      <Requests />
    </MemoryRouter>,
  );

describe('Requests', () => {
  beforeEach(() => {
    mockRefetchConnectionRequests.mockClear();
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: mockRequests,
    });
    vi.mocked(connectionsAPI.acceptRequest).mockResolvedValue({ success: true });
    vi.mocked(connectionsAPI.ignoreRequest).mockResolvedValue({ success: true });
  });

  it('renders pending requests', async () => {
    renderRequests();
    await waitFor(() => {
      expect(screen.getByText('Marie')).toBeInTheDocument();
    });
    expect(screen.getByText('1 pending request')).toBeInTheDocument();
  });

  it('shows empty state when no requests', async () => {
    vi.mocked(connectionsAPI.getConnectionRequests).mockResolvedValue({
      success: true,
      requests: [],
    });
    renderRequests();
    await waitFor(() => {
      expect(screen.getByText('No Pending Requests')).toBeInTheDocument();
    });
  });

  it('removes request from list on Accept', async () => {
    const user = userEvent.setup();
    renderRequests();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(screen.queryByText('Marie')).not.toBeInTheDocument();
    });
    expect(connectionsAPI.acceptRequest).toHaveBeenCalledWith('req-1');
    expect(mockRefetchConnectionRequests).toHaveBeenCalled();
  });

  it('removes request from list on Ignore', async () => {
    const user = userEvent.setup();
    renderRequests();
    await waitFor(() => expect(screen.getByText('Marie')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ignore/i }));

    await waitFor(() => {
      expect(screen.queryByText('Marie')).not.toBeInTheDocument();
    });
    expect(connectionsAPI.ignoreRequest).toHaveBeenCalledWith('req-1');
    expect(mockRefetchConnectionRequests).toHaveBeenCalled();
  });
});
