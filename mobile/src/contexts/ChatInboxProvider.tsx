import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { CHAT_SOCKET_EVENTS } from '../constants/chatSocketEvents';
import { chatAPI } from '../services/api';
import type { ChatConversationSummary, ChatMessage } from '../types';
import { getErrorMessage } from '../utils/error';
import { useAuth } from './useAuth';
import { ChatInboxContext } from './chat-inbox-context';
import { useSocket } from './useSocket';

/** Several messages in quick succession cause one inbox reload. */
const REFETCH_DEBOUNCE_MS = 300;

type ChatInboxProviderProps = {
  children: ReactNode;
};

/**
 * Conversation list and unread count (port of the web ChatInboxProvider). Mounted only while signed
 * in. Reloads on mount, when a message arrives for this user, when the socket reconnects (messages
 * sent while it was down are not replayed) and when the app comes back to the foreground.
 */
export const ChatInboxProvider = ({ children }: ChatInboxProviderProps) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [inboxError, setInboxError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = user?.id;

  const refetchInbox = useCallback(async () => {
    try {
      const data = await chatAPI.getConversations();
      if (data.success) {
        setConversations(data.conversations);
        setUnreadConversationCount(data.unreadConversationCount);
        setInboxError('');
      }
    } catch (err: unknown) {
      setInboxError(getErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setIsLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    void refetchInbox();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetchInbox();
    });
    return () => subscription.remove();
  }, [refetchInbox]);

  useEffect(() => {
    if (!socket) return;

    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void refetchInbox();
      }, REFETCH_DEBOUNCE_MS);
    };

    const handleNewMessage = (message: ChatMessage) => {
      if (message.receiver._id === userId) scheduleRefetch();
    };

    socket.on(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on('connect', scheduleRefetch);
    return () => {
      socket.off(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off('connect', scheduleRefetch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, userId, refetchInbox]);

  return (
    <ChatInboxContext.Provider
      value={{ conversations, unreadConversationCount, isLoadingInbox, inboxError, refetchInbox }}
    >
      {children}
    </ChatInboxContext.Provider>
  );
};
