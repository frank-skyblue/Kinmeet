import { useContext } from 'react';
import { ChatInboxContext } from './chat-inbox-context';

export const useChatInbox = () => {
  const context = useContext(ChatInboxContext);
  if (context === undefined) {
    throw new Error('useChatInbox must be used within a ChatInboxProvider');
  }
  return context;
};
