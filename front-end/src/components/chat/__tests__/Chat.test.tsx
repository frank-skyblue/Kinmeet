import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import Chat from '../Chat';
import { ChatInboxProvider } from '../../../contexts/ChatInboxProvider';

const mockMessages = [
  {
    _id: 'msg-1',
    sender: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
    receiver: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
    content: 'Hello Marie!',
    read: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'msg-2',
    sender: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
    receiver: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
    content: 'Hi there!',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

const mockUserProfile = {
  _id: 'other-1',
  firstName: 'Marie',
  lastName: 'Dupont',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
};

const mockInboxResponse = {
  success: true as const,
  conversations: [
    {
      user: {
        _id: 'other-1',
        firstName: 'Marie',
        lastName: 'Dupont',
        currentProvince: 'Ontario',
        currentCountry: 'Canada',
      },
      lastMessage: mockMessages[1],
      unreadCount: 0,
    },
  ],
  unreadConversationCount: 0,
};

vi.mock('../../../services/api', () => ({
  chatAPI: {
    getConversation: vi.fn(),
    getConversations: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
  },
  profileAPI: {
    getUserProfile: vi.fn(),
  },
  getPhotoUrl: (p: string) => p,
}));

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Test', lastName: 'User' },
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/SocketContext', () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
  }),
}));

import { chatAPI, profileAPI } from '../../../services/api';

const renderChat = () =>
  render(
    <MemoryRouter initialEntries={['/chat/other-1']}>
      <Routes>
        <Route
          path="/chat/:userId"
          element={
            <ChatInboxProvider>
              <Chat />
            </ChatInboxProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe('Chat', () => {
  beforeEach(() => {
    vi.mocked(chatAPI.getConversation).mockResolvedValue({
      success: true,
      messages: mockMessages,
    });
    vi.mocked(chatAPI.getConversations).mockResolvedValue(mockInboxResponse);
    vi.mocked(profileAPI.getUserProfile).mockResolvedValue({
      success: true,
      user: mockUserProfile,
    });
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it('renders conversation messages', async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Hello Marie!')).toBeInTheDocument();
    });
    // "Hi there!" appears in the inbox sidebar preview and in the thread; allow multiple.
    expect(screen.getAllByText('Hi there!').length).toBeGreaterThanOrEqual(1);
  });

  it('displays other user name and location', async () => {
    renderChat();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /Marie Dupont/i }),
      ).toBeInTheDocument();
      expect(screen.getByText('Ontario, Canada')).toBeInTheDocument();
    });
  });

  it('shows connection status indicator', async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('shows empty conversation state', async () => {
    vi.mocked(chatAPI.getConversation).mockResolvedValue({
      success: true,
      messages: [],
    });
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Start the conversation')).toBeInTheDocument();
    });
  });

  it('registers socket event listeners', async () => {
    renderChat();
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('chat:new_message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:user_typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:messages_read', expect.any(Function));
    });
  });

  it('sends message via socket on form submit', async () => {
    const user = userEvent.setup();
    renderChat();
    await waitFor(() => expect(screen.getByText('Hello Marie!')).toBeInTheDocument());

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'New message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'chat:send_message',
      { receiverId: 'other-1', content: 'New message' },
      expect.any(Function),
    );
  });
});
