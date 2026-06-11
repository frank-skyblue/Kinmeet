import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import Chat from '../Chat';
import { CHAT_SOCKET_EVENTS } from '../../../constants/chatSocketEvents';
import { ChatInboxProvider } from '../../../contexts/ChatInboxProvider';
import type { ChatMessage, ChatSendMessagePayload, GetConversationsResponse, UserProfile } from '../../../types';
import { CHAT_THREAD_INBOUND_EVENTS } from './chatSocketTestConstants';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const mockMessages: ChatMessage[] = [
  {
    _id: 'msg-1',
    sender: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
    receiver: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
    content: 'Hello Marie!',
    read: true,
    createdAt: yesterday.toISOString(),
  },
  {
    _id: 'msg-2',
    sender: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
    receiver: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
    content: 'Hi there!',
    read: false,
    createdAt: today.toISOString(),
  },
];

const mockUserProfile: Pick<
  UserProfile,
  '_id' | 'firstName' | 'lastName' | 'currentProvince' | 'currentCountry'
> = {
  _id: 'other-1',
  firstName: 'Marie',
  lastName: 'Dupont',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
};

const mockInboxResponse: GetConversationsResponse = {
  success: true,
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

vi.mock('../../../contexts/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Test', lastName: 'User' },
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/useSocket', () => ({
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

  it('applies hover highlight classes to message bubbles', async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Hello Marie!')).toBeInTheDocument();
    });

    const bubbles = screen.getAllByTestId('chat-message-bubble');
    expect(bubbles).toHaveLength(2);
    for (const bubble of bubbles) {
      expect(bubble).toHaveClass('hover:shadow-kin-medium');
      expect(bubble).toHaveClass('transition');
    }
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

  it('links chat header to the other user profile', async () => {
    renderChat();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view marie dupont.*profile/i });
      expect(link).toHaveAttribute('href', '/profile/other-1');
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
      for (const event of CHAT_THREAD_INBOUND_EVENTS) {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      }
    });
  });

  it('sends message via socket on form submit', async () => {
    const user = userEvent.setup();
    renderChat();
    await waitFor(() => expect(screen.getByText('Hello Marie!')).toBeInTheDocument());

    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'New message');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    const expectedSendPayload: ChatSendMessagePayload = {
      receiverId: 'other-1',
      content: 'New message',
    };

    expect(mockSocket.emit).toHaveBeenCalledWith(
      CHAT_SOCKET_EVENTS.SEND_MESSAGE,
      expectedSendPayload,
      expect.any(Function),
    );
  });

  it('shows one date separator per calendar day', async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Hello Marie!')).toBeInTheDocument();
    });

    const separators = screen.getAllByTestId('chat-date-separator');
    expect(separators).toHaveLength(2);
    expect(separators[0]).toHaveTextContent('Yesterday');
    expect(separators[1]).toHaveTextContent('Today');
  });

  it('reveals exact time only after clicking a message', async () => {
    const user = userEvent.setup();
    renderChat();
    await waitFor(() => {
      expect(screen.getByText('Hello Marie!')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('chat-message-timestamp')).not.toBeInTheDocument();

    await user.click(screen.getByText('Hello Marie!'));
    expect(screen.getByTestId('chat-message-timestamp')).toHaveTextContent(/\d/);
  });
});
