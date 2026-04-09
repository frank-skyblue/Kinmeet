import { createContext, useContext } from 'react';
import type { ChatConversationSummary } from '../types';

export interface ChatInboxContextValue {
  conversations: ChatConversationSummary[];
  unreadConversationCount: number;
  isLoadingInbox: boolean;
  inboxError: string;
  refetchInbox: () => Promise<void>;
}

export const ChatInboxContext = createContext<ChatInboxContextValue | undefined>(
  undefined,
);

export const useChatInbox = () => {
  const ctx = useContext(ChatInboxContext);
  if (ctx === undefined) {
    throw new Error('useChatInbox must be used within ChatInboxProvider');
  }
  return ctx;
};
