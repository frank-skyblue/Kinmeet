import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConnectionsList from '../ConnectionsList';

const mockConnections = [
  {
    _id: 'conn-1',
    firstName: 'Marie',
    lastName: 'Dupont',
    homeCountry: 'France',
    currentProvince: 'Ontario',
    currentCountry: 'Canada',
    languages: ['French', 'English'],
    interests: ['Cooking', 'Hiking'],
    lookingFor: ['Friendship'],
  },
];

vi.mock('../../../services/api', () => ({
  connectionsAPI: {
    getConnections: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { connectionsAPI } from '../../../services/api';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const renderList = () =>
  render(
    <MemoryRouter>
      <ConnectionsList />
    </MemoryRouter>,
  );

describe('ConnectionsList', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: mockConnections,
    });
  });

  it('renders connections with full names', async () => {
    renderList();
    await waitFor(() => {
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument();
    });
    expect(screen.getByText('1 kin')).toBeInTheDocument();
  });

  it('shows empty state when no connections', async () => {
    vi.mocked(connectionsAPI.getConnections).mockResolvedValue({
      success: true,
      connections: [],
    });
    renderList();
    await waitFor(() => {
      expect(screen.getByText('No Kins Yet')).toBeInTheDocument();
    });
  });

  it('navigates to chat on Send Message click', async () => {
    const user = userEvent.setup();
    renderList();
    await waitFor(() => expect(screen.getByText('Marie Dupont')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/chat/conn-1');
  });
});
