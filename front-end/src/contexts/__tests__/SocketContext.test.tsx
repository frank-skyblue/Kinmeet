import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connected: false,
  disconnect: vi.fn(),
};

vi.mock('../../services/socketService', () => ({
  socketService: {
    connect: vi.fn(() => mockSocket),
    disconnect: vi.fn(),
  },
}));

const mockGetProfile = vi.fn(() => Promise.resolve({ success: true }));
vi.mock('../../services/api', () => ({
  profileAPI: {
    getProfile: () => mockGetProfile(),
  },
}));

let mockAuthValue = { user: null as { id: string } | null, isLoading: false };
vi.mock('../useAuth', () => ({
  useAuth: () => mockAuthValue,
}));

import { SocketProvider } from '../SocketContext';
import { useSocket } from '../useSocket';

const TestConsumer = () => {
  const { socket, isConnected } = useSocket();
  return (
    <div>
      <span data-testid="socket">{socket ? 'present' : 'null'}</span>
      <span data-testid="connected">{String(isConnected)}</span>
    </div>
  );
};

const renderWithSocket = () =>
  render(
    <SocketProvider>
      <TestConsumer />
    </SocketProvider>,
  );

describe('SocketContext', () => {
  beforeEach(() => {
    mockAuthValue = { user: null, isLoading: false };
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    localStorage.clear();
  });

  it('starts disconnected when no user', () => {
    renderWithSocket();
    expect(screen.getByTestId('connected').textContent).toBe('false');
    expect(screen.getByTestId('socket').textContent).toBe('null');
  });

  it('connects when user exists and token is in localStorage', async () => {
    mockAuthValue = { user: { id: '1' }, isLoading: false };
    localStorage.setItem('token', 'test-token');

    renderWithSocket();
    await waitFor(() => {
      expect(screen.getByTestId('socket').textContent).toBe('present');
    });
  });

  const disconnectWith = async (reason: string) => {
    mockAuthValue = { user: { id: '1' }, isLoading: false };
    localStorage.setItem('token', 'test-token');
    renderWithSocket();
    await waitFor(() => expect(screen.getByTestId('socket').textContent).toBe('present'));

    const onDisconnect = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
    act(() => onDisconnect(reason));
  };

  it('checks the session when the server drops the socket', async () => {
    mockGetProfile.mockClear();
    await disconnectWith('io server disconnect');
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it('does not check the session after a network drop', async () => {
    mockGetProfile.mockClear();
    await disconnectWith('transport close');
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('throws when useSocket is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useSocket must be used within a SocketProvider');
    spy.mockRestore();
  });
});
