import { createContext } from 'react';
import type { ChatConversationSummary } from '../types';

export interface ChatInboxContextValue {
  conversations: ChatConversationSummary[];
  /** Conversations with at least one unread message (the Chat tab badge). */
  unreadConversationCount: number;
  isLoadingInbox: boolean;
  inboxError: string;
  refetchInbox: () => Promise<void>;
}

export const ChatInboxContext = createContext<ChatInboxContextValue | undefined>(undefined);
