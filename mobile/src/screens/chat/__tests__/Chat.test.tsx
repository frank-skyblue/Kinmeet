import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Socket } from 'socket.io-client';
import { CHAT_SOCKET_EVENTS } from '../../../constants/chatSocketEvents';
import { AuthContext } from '../../../contexts/auth-context';
import { ChatInboxProvider } from '../../../contexts/ChatInboxProvider';
import { SocketContext } from '../../../contexts/socket-context';
import { chatAPI, profileAPI } from '../../../services/api';
import type { ChatConversationSummary, ChatMessage, User } from '../../../types';
import { ChatScreen } from '../ChatScreen';
import { ChatThreadScreen } from '../ChatThreadScreen';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('../../../services/api', () => ({
  chatAPI: {
    getConversations: jest.fn(),
    getConversation: jest.fn(),
    markAsRead: jest.fn(),
  },
  profileAPI: {
    getUserProfile: jest.fn(),
  },
  getPhotoUrl: (path: string) => path,
}));

const me: User = {
  id: 'me',
  email: 'lucia@example.com',
  firstName: 'Lucia',
  lastName: 'Martinez',
  profileComplete: true,
};

const PEER_ID = 'peer-1';
const peerUser = { _id: PEER_ID, firstName: 'Marie', lastName: 'Curie' };
const meUser = { _id: me.id, firstName: me.firstName, lastName: me.lastName };

const now = new Date();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

const message = (id: string, from: 'me' | 'peer', content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  _id: id,
  sender: from === 'me' ? meUser : peerUser,
  receiver: from === 'me' ? peerUser : meUser,
  content,
  read: false,
  createdAt: minutesAgo(10),
  ...extra,
});

const conversation = (overrides: Partial<ChatConversationSummary> = {}): ChatConversationSummary => ({
  user: { ...peerUser, photo: undefined, currentProvince: 'Ontario', currentCountry: 'Canada' },
  lastMessage: message('m-last', 'peer', 'See you Saturday!'),
  unreadCount: 0,
  ...overrides,
});

type Handler = (...args: unknown[]) => void;

/** Stands in for the socket.io client; `serverSends` plays the server's side. */
class FakeSocket {
  connected = true;
  handlers = new Map<string, Set<Handler>>();
  emit = jest.fn();
  /** Ack for the next chat:send_message: `(payload) => ack`, or `'timeout'`. */
  sendReply: ((payload: { content: string }) => unknown) | 'timeout' = (payload) => ({
    success: true,
    message: message('server-1', 'me', payload.content, { createdAt: new Date().toISOString() }),
  });

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)?.add(handler);
    return this;
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  timeout() {
    return {
      emit: (event: string, payload: { content: string }, callback: (err: Error | null, ack?: unknown) => void) => {
        this.emit(event, payload);
        const reply = this.sendReply;
        if (reply === 'timeout') callback(new Error('operation has timed out'));
        else callback(null, reply(payload));
      },
    };
  }

  async serverSends(event: string, payload?: unknown) {
    await act(async () => {
      this.handlers.get(event)?.forEach((handler) => handler(payload));
    });
  }
}

let socket: FakeSocket;
let isConnected: boolean;

const Providers = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider
    value={{
      user: me,
      token: 'token',
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
    }}
  >
    <SocketContext.Provider value={{ socket: socket as unknown as Socket, isConnected }}>
      <ChatInboxProvider>{children}</ChatInboxProvider>
    </SocketContext.Provider>
  </AuthContext.Provider>
);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let isFocused: boolean;
let focusListener: (() => void) | undefined;

const navigation = () => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  isFocused: () => isFocused,
  addListener: jest.fn((event: string, callback: () => void) => {
    if (event === 'focus') focusListener = callback;
    return () => {};
  }),
});

const renderInbox = async () => {
  const props = {
    navigation: navigation(),
    route: { key: 'ChatHome', name: 'ChatHome' },
  } as unknown as React.ComponentProps<typeof ChatScreen>;
  await render(
    <Providers>
      <ChatScreen {...props} />
    </Providers>,
  );
};

const renderThread = async () => {
  const props = {
    navigation: navigation(),
    route: { key: 'ChatThread', name: 'ChatThread', params: { userId: PEER_ID } },
  } as unknown as React.ComponentProps<typeof ChatThreadScreen>;
  await render(
    <Providers>
      <ChatThreadScreen {...props} />
    </Providers>,
  );
  await waitFor(() => expect(screen.queryByText('Loading conversation...')).toBeNull());
};

const typeAndSend = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Type a message'), text);
  await fireEvent.press(screen.getByLabelText('Send message'));
};

beforeEach(() => {
  // The jest preset mocks this; the app reads it as the current state, as on a device.
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  socket = new FakeSocket();
  isConnected = true;
  isFocused = true;
  focusListener = undefined;
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  jest.mocked(chatAPI.getConversations).mockReset().mockResolvedValue({
    success: true,
    conversations: [conversation()],
    unreadConversationCount: 0,
  });
  jest.mocked(chatAPI.getConversation).mockReset().mockResolvedValue({
    success: true,
    messages: [
      message('m1', 'peer', 'Bonjour Lucia!', { createdAt: minutesAgo(60 * 24 * 2) }),
      message('m2', 'me', 'Hi Marie, how are you?', { createdAt: minutesAgo(5) }),
    ],
    nextCursor: null,
  });
  jest.mocked(chatAPI.markAsRead).mockReset().mockResolvedValue({ success: true, message: 'ok' });
  jest.mocked(profileAPI.getUserProfile).mockReset().mockResolvedValue({
    success: true,
    user: {
      _id: PEER_ID,
      firstName: 'Marie',
      lastName: 'Curie',
      homeCountry: 'Poland',
      currentProvince: 'Quebec',
      currentCountry: 'Canada',
      languages: [],
      interests: [],
      lookingFor: [],
    },
  });
});

describe('Chat inbox', () => {
  test('lists conversations with unread counts and previews', async () => {
    jest.mocked(chatAPI.getConversations).mockResolvedValue({
      success: true,
      unreadConversationCount: 1,
      conversations: [
        conversation({ unreadCount: 3 }),
        conversation({
          user: { _id: 'peer-2', firstName: 'Pierre', lastName: 'Dupont' },
          lastMessage: message('m-photo', 'peer', '', { type: 'image', content: undefined }),
        }),
        conversation({
          user: { _id: 'peer-3', firstName: 'Ana', lastName: 'Silva' },
          lastMessage: message('m-voice', 'peer', '', {
            type: 'voice',
            content: undefined,
            attachment: { durationMs: 65_000, urls: { audio: 'a.m4a' } },
          }),
        }),
      ],
    });

    await renderInbox();

    expect(await screen.findByLabelText('Open chat with Marie Curie, unread messages')).toBeTruthy();
    expect(screen.getByText('See you Saturday!')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByLabelText('Open chat with Pierre Dupont')).toBeTruthy();
    expect(screen.getByText('📷 Photo')).toBeTruthy();
    expect(screen.getByText('🎤 Voice message · 1:05')).toBeTruthy();
  });

  test('opens the conversation', async () => {
    await renderInbox();

    await fireEvent.press(await screen.findByLabelText('Open chat with Marie Curie'));

    expect(mockNavigate).toHaveBeenCalledWith('ChatThread', { userId: PEER_ID });
  });

  test('shows an empty state without conversations', async () => {
    jest.mocked(chatAPI.getConversations).mockResolvedValue({
      success: true,
      conversations: [],
      unreadConversationCount: 0,
    });

    await renderInbox();

    expect(await screen.findByText('No conversations yet')).toBeTruthy();
    expect(screen.getByText('Connect with people from Discover to chat.')).toBeTruthy();
  });

  test('shows a load error', async () => {
    jest.mocked(chatAPI.getConversations).mockRejectedValue(new Error('Network Error'));

    await renderInbox();

    expect(await screen.findByText('Network Error')).toBeTruthy();
  });

  test('reloads when a message arrives for me', async () => {
    await renderInbox();
    await screen.findByLabelText('Open chat with Marie Curie');
    jest.mocked(chatAPI.getConversations).mockResolvedValue({
      success: true,
      conversations: [conversation({ unreadCount: 1, lastMessage: message('m9', 'peer', 'Are you free?') })],
      unreadConversationCount: 1,
    });

    await socket.serverSends(CHAT_SOCKET_EVENTS.NEW_MESSAGE, message('m9', 'peer', 'Are you free?'));

    expect(await screen.findByText('Are you free?')).toBeTruthy();
    expect(screen.getByLabelText('Open chat with Marie Curie, unread messages')).toBeTruthy();
  });

  test('reloads when coming back from a thread', async () => {
    await renderInbox();
    await screen.findByLabelText('Open chat with Marie Curie');
    focusListener?.(); // initial focus
    const callsBefore = jest.mocked(chatAPI.getConversations).mock.calls.length;

    await act(async () => focusListener?.());

    expect(jest.mocked(chatAPI.getConversations).mock.calls.length).toBe(callsBefore + 1);
  });
});

describe('Chat thread', () => {
  test('shows the conversation with day separators and the peer in the header', async () => {
    await renderThread();

    expect(screen.getByText('Bonjour Lucia!')).toBeTruthy();
    expect(screen.getByText('Hi Marie, how are you?')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(chatAPI.getConversation).toHaveBeenCalledWith(PEER_ID, null);
    expect(await screen.findByText('Quebec, Canada')).toBeTruthy();
  });

  test('opens the peer profile from the header', async () => {
    await renderThread();

    await fireEvent.press(await screen.findByLabelText("View Marie Curie's profile"));

    expect(mockNavigate).toHaveBeenCalledWith('Profile', {
      screen: 'ProfileView',
      params: { userId: PEER_ID },
      initial: false,
    });
  });

  test('shows the sent time when a message is tapped', async () => {
    await renderThread();
    expect(screen.queryByText(/\d:\d\d [AP]M/)).toBeNull();

    await fireEvent.press(screen.getByLabelText('Message from Lucia: Hi Marie, how are you?'));

    expect(screen.getByText(/\d:\d\d [AP]M/)).toBeTruthy();
  });

  test('sends a message and replaces it with the server copy', async () => {
    let finishSend: (() => void) | undefined;
    const reply = socket.sendReply as (payload: { content: string }) => unknown;
    socket.timeout = () => ({
      emit: (event: string, payload: { content: string }, callback: (err: Error | null, ack?: unknown) => void) => {
        socket.emit(event, payload);
        finishSend = () => callback(null, reply(payload));
      },
    });
    await renderThread();

    await typeAndSend('  Free on Saturday?  ');

    expect(socket.emit).toHaveBeenCalledWith(CHAT_SOCKET_EVENTS.TYPING_START, { receiverId: PEER_ID });
    expect(socket.emit).toHaveBeenCalledWith(CHAT_SOCKET_EVENTS.SEND_MESSAGE, {
      receiverId: PEER_ID,
      content: 'Free on Saturday?',
    });
    expect(socket.emit).toHaveBeenCalledWith(CHAT_SOCKET_EVENTS.TYPING_STOP, { receiverId: PEER_ID });
    expect(screen.getByText('Free on Saturday?')).toBeTruthy();
    expect(screen.getByText('Sending…')).toBeTruthy();
    expect(screen.getByLabelText('Type a message').props.value).toBe('');

    const inboxLoads = jest.mocked(chatAPI.getConversations).mock.calls.length;
    await act(async () => finishSend?.());

    expect(screen.queryByText('Sending…')).toBeNull();
    expect(screen.getByText('Free on Saturday?')).toBeTruthy();
    expect(jest.mocked(chatAPI.getConversations).mock.calls.length).toBeGreaterThan(inboxLoads);
  });

  test('a failed send shows the error and gives the text back', async () => {
    socket.sendReply = () => ({ success: false, message: 'Can only message connected users' });
    await renderThread();

    await typeAndSend('Hello?');

    expect(await screen.findByText('Can only message connected users')).toBeTruthy();
    expect(screen.queryByText('Hello?')).toBeNull();
    expect(screen.getByLabelText('Type a message').props.value).toBe('Hello?');

    await fireEvent.press(screen.getByLabelText('Dismiss error'));
    expect(screen.queryByText('Can only message connected users')).toBeNull();
  });

  test('a send with no reply from the server fails', async () => {
    socket.sendReply = 'timeout';
    await renderThread();

    await typeAndSend('Hello?');

    expect(await screen.findByText('No response from the server')).toBeTruthy();
  });

  test('shows messages and typing from the peer live, and marks them read', async () => {
    await renderThread();

    await socket.serverSends(CHAT_SOCKET_EVENTS.USER_TYPING, { userId: PEER_ID, isTyping: true });
    expect(screen.getByLabelText('Marie is typing')).toBeTruthy();

    await socket.serverSends(
      CHAT_SOCKET_EVENTS.NEW_MESSAGE,
      message('m3', 'peer', 'Yes, Saturday works!', { createdAt: new Date().toISOString() }),
    );

    expect(screen.getByText('Yes, Saturday works!')).toBeTruthy();
    expect(screen.queryByLabelText('Marie is typing')).toBeNull();
    await waitFor(() => expect(chatAPI.markAsRead).toHaveBeenCalledWith(PEER_ID));
  });

  test("ignores other conversations' messages and typing", async () => {
    await renderThread();

    await socket.serverSends(CHAT_SOCKET_EVENTS.USER_TYPING, { userId: 'peer-2', isTyping: true });
    await socket.serverSends(CHAT_SOCKET_EVENTS.NEW_MESSAGE, {
      ...message('x1', 'peer', 'Not for this thread'),
      sender: { _id: 'peer-2', firstName: 'Pierre', lastName: 'Dupont' },
    });

    expect(screen.queryByText('Not for this thread')).toBeNull();
    expect(screen.queryByLabelText(/is typing/)).toBeNull();
    expect(chatAPI.markAsRead).not.toHaveBeenCalled();
  });

  test('a message that arrives out of view is marked read on return', async () => {
    await renderThread();
    isFocused = false;

    await socket.serverSends(CHAT_SOCKET_EVENTS.NEW_MESSAGE, message('m3', 'peer', 'Ping'));
    expect(chatAPI.markAsRead).not.toHaveBeenCalled();

    isFocused = true;
    await act(async () => focusListener?.());

    expect(chatAPI.markAsRead).toHaveBeenCalledWith(PEER_ID);
  });

  test('loads earlier messages', async () => {
    jest.mocked(chatAPI.getConversation)
      .mockResolvedValueOnce({
        success: true,
        messages: [message('m2', 'me', 'Newest page', { createdAt: minutesAgo(5) })],
        nextCursor: 'm2',
      })
      .mockResolvedValueOnce({
        success: true,
        messages: [message('m1', 'peer', 'From last week', { createdAt: minutesAgo(60 * 24 * 30) })],
        nextCursor: null,
      });
    await renderThread();

    await fireEvent.press(screen.getByText('Load earlier messages'));

    expect(await screen.findByText('From last week')).toBeTruthy();
    expect(chatAPI.getConversation).toHaveBeenLastCalledWith(PEER_ID, 'm2');
    expect(screen.getByText('Newest page')).toBeTruthy();
    expect(screen.queryByText('Load earlier messages')).toBeNull();
  });

  test('reloads the newest messages after the connection comes back', async () => {
    await renderThread();
    jest.mocked(chatAPI.getConversation).mockResolvedValue({
      success: true,
      messages: [message('m5', 'peer', 'Sent while you were offline', { createdAt: minutesAgo(1) })],
      nextCursor: null,
    });

    await socket.serverSends('disconnect');
    await socket.serverSends('connect');

    expect(await screen.findByText('Sent while you were offline')).toBeTruthy();
    expect(screen.getByText('Bonjour Lucia!')).toBeTruthy();
  });

  test('cannot send while reconnecting', async () => {
    isConnected = false;
    await renderThread();

    expect(screen.getByText('Reconnecting…')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Type a message'), 'Hello');
    expect(screen.getByLabelText('Send message').props.accessibilityState).toEqual({ disabled: true });
  });

  test('an unavailable peer cannot be messaged or opened', async () => {
    jest.mocked(chatAPI.getConversations).mockResolvedValue({
      success: true,
      conversations: [
        conversation({ user: { _id: PEER_ID, firstName: 'Unavailable', lastName: '', unavailable: true } }),
      ],
      unreadConversationCount: 0,
    });
    await renderThread();

    expect(await screen.findByText('Unavailable')).toBeTruthy();
    expect(screen.getByPlaceholderText('This account is unavailable')).toBeTruthy();
    expect(screen.queryByLabelText(/View .*'s profile/)).toBeNull();
    expect(screen.getByLabelText('Send message').props.accessibilityState).toEqual({ disabled: true });
  });

  test('shows an empty conversation prompt', async () => {
    jest.mocked(chatAPI.getConversation).mockResolvedValue({ success: true, messages: [], nextCursor: null });

    await renderThread();

    expect(screen.getByText('Start the conversation')).toBeTruthy();
  });

  test('a failed load can be retried', async () => {
    jest.mocked(chatAPI.getConversation).mockRejectedValueOnce(new Error('Network Error'));
    await render(
      <Providers>
        <ChatThreadScreen
          {...({
            navigation: navigation(),
            route: { key: 'ChatThread', name: 'ChatThread', params: { userId: PEER_ID } },
          } as unknown as React.ComponentProps<typeof ChatThreadScreen>)}
        />
      </Providers>,
    );

    expect(await screen.findByText('Failed to load conversation')).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('Bonjour Lucia!')).toBeTruthy();
  });

  test('back returns to the inbox', async () => {
    await renderThread();

    await fireEvent.press(screen.getByLabelText('Back to inbox'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
