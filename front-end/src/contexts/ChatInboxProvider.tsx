import React, { useCallback, useEffect, useRef, useState } from 'react';
import { chatAPI } from '../services/api';
import { getErrorMessage } from '../utils/error';
import type { ChatConversationSummary, ChatMessage } from '../types';
import { ChatInboxContext } from './chatInboxContext';
import { useAuth } from './useAuth';
import { useSocket } from './useSocket';

interface ChatInboxProviderProps {
  children: React.ReactNode;
}

export const ChatInboxProvider: React.FC<ChatInboxProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const everLoadedRef = useRef(false);

  const refetchInbox = useCallback(async () => {
    if (!user) return;
    if (!everLoadedRef.current) {
      setIsLoadingInbox(true);
    }
    try {
      setInboxError('');
      const data = await chatAPI.getConversations();
      if (data.success) {
        setConversations(data.conversations);
        setUnreadConversationCount(data.unreadConversationCount);
        everLoadedRef.current = true;
      }
    } catch (err: unknown) {
      setInboxError(getErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setIsLoadingInbox(false);
    }
  }, [user]);

  useEffect(() => {
    everLoadedRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (user) return;
    setConversations([]);
    setUnreadConversationCount(0);
    setInboxError('');
    everLoadedRef.current = false;
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void refetchInbox();
  }, [user?.id, authLoading, refetchInbox]);

  useEffect(() => {
    if (!socket || !user) return;

    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void refetchInbox();
        debounceRef.current = null;
      }, 300);
    };

    const handleNewMessage = (message: ChatMessage) => {
      if (message.receiver._id === user.id) {
        scheduleRefetch();
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    return () => {
      socket.off('chat:new_message', handleNewMessage);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, user, refetchInbox]);

  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetchInbox();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, refetchInbox]);

  return (
    <ChatInboxContext.Provider
      value={{
        conversations,
        unreadConversationCount,
        isLoadingInbox,
        inboxError,
        refetchInbox,
      }}
    >
      {children}
    </ChatInboxContext.Provider>
  );
};
