import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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
  timeout: vi.fn(),
  connected: true,
};

vi.mock('../../../services/chatMedia', () => ({
  uploadChatMedia: vi.fn(),
}));

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
import { uploadChatMedia } from '../../../services/chatMedia';
import { ThemeProvider } from '../../../contexts/ThemeProvider';

const renderChat = () =>
  render(
		<ThemeProvider>
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
			</MemoryRouter>
		</ThemeProvider>,
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

  describe('earlier messages', () => {
    const olderMessage: ChatMessage = {
      _id: 'msg-0',
      sender: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
      receiver: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
      content: 'An older message',
      read: true,
      createdAt: new Date(yesterday.getTime() - 60_000).toISOString(),
    };

    beforeEach(() => {
      vi.mocked(chatAPI.getConversation)
        .mockResolvedValueOnce({ success: true, messages: mockMessages, nextCursor: 'cursor-1' })
        .mockResolvedValueOnce({ success: true, messages: [olderMessage], nextCursor: null });
    });

    it('opens on the newest page', async () => {
      renderChat();

      await screen.findByText('Hello Marie!');
      expect(chatAPI.getConversation).toHaveBeenCalledWith('other-1', null);
    });

    it('adds the page before the oldest message above it, and stops at the start', async () => {
      const user = userEvent.setup();
      renderChat();

      await user.click(await screen.findByRole('button', { name: 'Load earlier messages' }));

      const older = await screen.findByText('An older message');
      expect(chatAPI.getConversation).toHaveBeenLastCalledWith('other-1', 'cursor-1');
      expect(
        older.compareDocumentPosition(screen.getByText('Hello Marie!')) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /earlier messages/i })).not.toBeInTheDocument();
    });

    it('loads earlier messages when scrolled near the top, once', async () => {
      renderChat();
      await screen.findByRole('button', { name: 'Load earlier messages' });

      const list = screen.getByTestId('chat-messages-scroll');
      fireEvent.scroll(list, { target: { scrollTop: 0 } });
      fireEvent.scroll(list, { target: { scrollTop: 0 } });

      expect(await screen.findByText('An older message')).toBeInTheDocument();
      expect(chatAPI.getConversation).toHaveBeenCalledTimes(2);
    });

    it('offers nothing earlier when the whole conversation is loaded', async () => {
      vi.mocked(chatAPI.getConversation).mockReset();
      vi.mocked(chatAPI.getConversation).mockResolvedValue({ success: true, messages: mockMessages });
      renderChat();

      await screen.findByText('Hello Marie!');
      expect(screen.queryByRole('button', { name: /earlier messages/i })).not.toBeInTheDocument();
    });
  });

  describe('following new messages', () => {
    const incoming = (content: string, senderId = 'other-1'): ChatMessage => ({
      _id: `new-${content}`,
      sender: { _id: senderId, firstName: senderId === 'other-1' ? 'Marie' : 'Test', lastName: 'X' },
      receiver: { _id: senderId === 'other-1' ? 'user-1' : 'other-1', firstName: 'Y', lastName: 'Z' },
      content,
      read: false,
      createdAt: new Date().toISOString(),
    });

    const receive = (message: ChatMessage) => {
      const [, handler] = mockSocket.on.mock.calls.find(([event]) => event === CHAT_SOCKET_EVENTS.NEW_MESSAGE)!;
      act(() => (handler as (m: ChatMessage) => void)(message));
    };

    /** Puts the reader `fromBottom` px above the bottom of a 2000px conversation. */
    const scrollTo = (fromBottom: number) => {
      const list = screen.getByTestId('chat-messages-scroll');
      Object.defineProperty(list, 'scrollHeight', { value: 2000, configurable: true });
      Object.defineProperty(list, 'clientHeight', { value: 500, configurable: true });
      fireEvent.scroll(list, { target: { scrollTop: 2000 - 500 - fromBottom } });
    };

    it('keeps someone reading older messages in place when a message arrives', async () => {
      renderChat();
      await screen.findByText('Hello Marie!');
      scrollTo(800);
      vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();

      receive(incoming('New while reading'));

      expect(await screen.findByText('New while reading')).toBeInTheDocument();
      expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    });

    it('follows a new message when the reader is already at the bottom', async () => {
      renderChat();
      await screen.findByText('Hello Marie!');
      scrollTo(20);
      vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();

      receive(incoming('New at bottom'));

      await screen.findByText('New at bottom');
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("always brings the reader down to their own message", async () => {
      renderChat();
      await screen.findByText('Hello Marie!');
      scrollTo(800);
      vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();

      receive(incoming('Sent from my other tab', 'user-1'));

      await screen.findByText('Sent from my other tab');
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('images and voice messages', () => {
    const photoMessage: ChatMessage = {
      _id: 'msg-photo',
      sender: { _id: 'other-1', firstName: 'Marie', lastName: 'Dupont' },
      receiver: { _id: 'user-1', firstName: 'Test', lastName: 'User' },
      type: 'image',
      content: 'Sunset in Lyon',
      attachment: {
        width: 1600,
        height: 1200,
        urls: { display: 'https://cdn.test/display.jpg', full: 'https://cdn.test/full.jpg' },
      },
      read: true,
      createdAt: today.toISOString(),
    };

    beforeEach(() => {
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:local-preview'), revokeObjectURL: vi.fn() }));
      vi.mocked(uploadChatMedia).mockReset();
      // The shared setup restores all mocks after each test, which clears this implementation.
      mockSocket.timeout.mockImplementation(() => mockSocket);
    });

    afterEach(() => {
      mockSocket.emit.mockReset();
    });

    const renderWithMessages = async (messages: ChatMessage[]) => {
      vi.mocked(chatAPI.getConversation).mockResolvedValue({ success: true, messages });
      renderChat();
      await waitFor(() => expect(screen.queryByText('Loading conversation...')).not.toBeInTheDocument());
    };

    it('shows a photo with its caption, and opens it full size', async () => {
      const user = userEvent.setup();
      await renderWithMessages([photoMessage]);

      expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', 'https://cdn.test/display.jpg');
      expect(screen.getByText('Sunset in Lyon')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open photo' }));

      expect(screen.getByRole('dialog', { name: 'Photo' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Shared in chat' })).toHaveAttribute('src', 'https://cdn.test/full.jpg');
    });

    it('shows a voice message with a play button and its length', async () => {
      await renderWithMessages([{
        ...photoMessage,
        _id: 'msg-voice',
        type: 'voice',
        content: undefined,
        attachment: { durationMs: 12_400, waveform: [10, 200, 90], urls: { audio: 'https://cdn.test/voice.mp3' } },
      }]);

      expect(screen.getByRole('button', { name: 'Play voice message' })).toBeInTheDocument();
      expect(screen.getByText('0:12')).toBeInTheDocument();
    });

    it('shows removed media as unavailable', async () => {
      await renderWithMessages([{ ...photoMessage, attachment: { removed: true } }]);

      expect(screen.getByText('Photo unavailable')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();
    });

    const choosePhoto = (user: ReturnType<typeof userEvent.setup>) =>
      user.upload(screen.getByTestId('chat-image-input'), new File(['png'], 'beach.png', { type: 'image/png' }));

    it('stages a chosen photo without sending it until Send is pressed', async () => {
      const user = userEvent.setup();
      await renderWithMessages([]);

      await choosePhoto(user);

      expect(screen.getByRole('img', { name: 'Selected photo: beach.png' })).toBeInTheDocument();
      expect(screen.getByLabelText('Add a caption')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
      expect(uploadChatMedia).not.toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalledWith(CHAT_SOCKET_EVENTS.SEND_MESSAGE, expect.anything(), expect.anything());
    });

    it('removes a staged photo without sending anything', async () => {
      const user = userEvent.setup();
      await renderWithMessages([]);

      await choosePhoto(user);
      await user.click(screen.getByRole('button', { name: 'Remove selected photo' }));

      expect(screen.queryByTestId('chat-staged-photo')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      expect(uploadChatMedia).not.toHaveBeenCalled();
    });

    it('sends the staged photo with the typed text as its caption', async () => {
      vi.mocked(uploadChatMedia).mockResolvedValue({ id: 'att-3', version: 9, signature: 'sig3' });
      mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (err: Error | null, res: unknown) => void) => {
        if (event === CHAT_SOCKET_EVENTS.SEND_MESSAGE) ack?.(null, { success: true, message: { ...photoMessage, _id: 'msg-captioned', content: 'Beach day' } });
      });
      const user = userEvent.setup();
      await renderWithMessages([]);

      await choosePhoto(user);
      await user.type(screen.getByLabelText('Add a caption'), 'Beach day');
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          CHAT_SOCKET_EVENTS.SEND_MESSAGE,
          expect.objectContaining({ content: 'Beach day', attachment: expect.objectContaining({ id: 'att-3' }) }),
          expect.any(Function),
        );
      });
      expect(screen.queryByTestId('chat-staged-photo')).not.toBeInTheDocument();
      expect(await screen.findByText('Beach day')).toBeInTheDocument();
    });

    it('uploads a photo straight to storage, then sends it with the upload receipt', async () => {
      const sent: ChatMessage = { ...photoMessage, _id: 'msg-sent', sender: photoMessage.receiver, receiver: photoMessage.sender, content: undefined };
      vi.mocked(uploadChatMedia).mockResolvedValue({ id: 'att-1', version: 7, signature: 'sig' });
      mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (err: Error | null, res: unknown) => void) => {
        if (event === CHAT_SOCKET_EVENTS.SEND_MESSAGE) ack?.(null, { success: true, message: sent });
      });
      const user = userEvent.setup();
      await renderWithMessages([]);

      await choosePhoto(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith(
          CHAT_SOCKET_EVENTS.SEND_MESSAGE,
          expect.objectContaining({
            receiverId: 'other-1',
            clientMessageId: expect.stringMatching(/^temp-/),
            attachment: expect.objectContaining({ id: 'att-1', version: 7, signature: 'sig' }),
          }),
          expect.any(Function),
        );
      });
      expect(uploadChatMedia).toHaveBeenCalledWith('other-1', 'image', expect.any(File), 'beach.png', expect.any(Function));
      expect(mockSocket.emit).toHaveBeenCalledWith(
        CHAT_SOCKET_EVENTS.SEND_MESSAGE,
        expect.not.objectContaining({ content: expect.anything() }),
        expect.any(Function),
      );
      await waitFor(() => {
        expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', 'https://cdn.test/display.jpg');
      });
    });

    it('rejects photos over 5 MB with an error, without staging or uploading them', async () => {
      const user = userEvent.setup();
      await renderWithMessages([]);
      const tooBig = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });

      await user.upload(screen.getByTestId('chat-image-input'), tooBig);

      expect(await screen.findByText('Photos must be under 5 MB')).toBeInTheDocument();
      expect(screen.queryByTestId('chat-staged-photo')).not.toBeInTheDocument();
      expect(uploadChatMedia).not.toHaveBeenCalled();
    });

    it('shows errors right above the message box, where they stay visible, and lets you dismiss them', async () => {
      const user = userEvent.setup();
      await renderWithMessages(mockMessages);
      const tooBig = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' });

      await user.upload(screen.getByTestId('chat-image-input'), tooBig);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Photos must be under 5 MB');
      // Directly before the composer form, outside the scrolling message list.
      expect(alert.nextElementSibling?.tagName).toBe('FORM');
      expect(alert.closest('.overflow-y-auto')).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Dismiss error' }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('accepts a photo right at the 5 MB limit', async () => {
      const user = userEvent.setup();
      await renderWithMessages([]);
      const atLimit = new File([new Uint8Array(5 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });

      await user.upload(screen.getByTestId('chat-image-input'), atLimit);

      expect(screen.getByTestId('chat-staged-photo')).toBeInTheDocument();
      expect(screen.queryByText(/Photos must be under/)).not.toBeInTheDocument();
    });

    it('rejects files that are not images before uploading', async () => {
      const user = userEvent.setup({ applyAccept: false });
      await renderWithMessages([]);

      await user.upload(screen.getByTestId('chat-image-input'), new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }));

      expect(await screen.findByText('Please choose an image file')).toBeInTheDocument();
      expect(uploadChatMedia).not.toHaveBeenCalled();
    });

    it('offers a retry when the upload fails, and sends on retry', async () => {
      vi.mocked(uploadChatMedia)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({ id: 'att-2', version: 8, signature: 'sig2' });
      mockSocket.emit.mockImplementation((event: string, _payload: unknown, ack?: (err: Error | null, res: unknown) => void) => {
        if (event === CHAT_SOCKET_EVENTS.SEND_MESSAGE) ack?.(null, { success: true, message: { ...photoMessage, _id: 'msg-retried' } });
      });
      const user = userEvent.setup();
      await renderWithMessages([]);

      await choosePhoto(user);
      await user.click(screen.getByRole('button', { name: 'Send message' }));
      await user.click(await screen.findByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(uploadChatMedia).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        CHAT_SOCKET_EVENTS.SEND_MESSAGE,
        expect.objectContaining({ attachment: expect.objectContaining({ id: 'att-2' }) }),
        expect.any(Function),
      );
    });
  });

  it('shows a deactivated peer as Unavailable, without a profile link or composer', async () => {
    vi.mocked(chatAPI.getConversations).mockResolvedValue({
      ...mockInboxResponse,
      conversations: [
        {
          user: { _id: 'other-1', firstName: 'Unavailable', lastName: '', unavailable: true },
          lastMessage: mockMessages[1],
          unreadCount: 0,
        },
      ],
    });
    vi.mocked(profileAPI.getUserProfile).mockRejectedValue(new Error('User not found'));

    renderChat();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Unavailable' })).toBeInTheDocument();
    });
    expect(screen.getByText('Hello Marie!')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /profile/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Type a message')).toBeDisabled();
    expect(screen.getByPlaceholderText('This account is unavailable')).toBeInTheDocument();
    // No photos or voice messages either.
    expect(screen.getByRole('button', { name: 'Choose a photo' })).toBeDisabled();
    const recordButton = screen.queryByRole('button', { name: 'Record a voice message' });
    if (recordButton) expect(recordButton).toBeDisabled();
  });
});
