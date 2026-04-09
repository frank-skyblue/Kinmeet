import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getPhotoUrl } from '../../services/api';
import { useChatInbox } from '../../contexts/chatInboxContext';
import type { ChatMessage } from '../../types';

const CHAT_BUBBLE_ICON =
  'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';

interface ChatSidebarProps {
  activeUserId?: string;
}

const formatPreview = (msg: ChatMessage | null) => {
  if (!msg) return 'No messages yet';
  return msg.content.length > 56 ? `${msg.content.slice(0, 56)}…` : msg.content;
};

const formatSidebarTime = (dateString: string | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({ activeUserId }) => {
  const { conversations, isLoadingInbox, inboxError } = useChatInbox();
  const navigate = useNavigate();

  const handleSelectConversation = (peerId: string) => {
    navigate(`/chat/${peerId}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white md:border-0 md:bg-kin-beige">
      <div className="shrink-0 border-b border-kin-stone-200 bg-white px-4 py-3 shadow-kin-soft md:rounded-none">
        <h1 className="font-montserrat text-lg font-bold text-kin-navy">Messages</h1>
        <p className="font-inter text-xs text-kin-teal">Your connections</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white md:bg-transparent">
        {inboxError && (
          <div className="m-3 rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-3 py-2 font-inter text-sm text-kin-coral-700">
            {inboxError}
          </div>
        )}

        {isLoadingInbox && conversations.length === 0 && !inboxError && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 h-12 w-12 animate-spin rounded-full border-b-2 border-kin-coral" />
            <p className="font-inter text-sm text-kin-navy">Loading inbox…</p>
          </div>
        )}

        {!isLoadingInbox && conversations.length === 0 && !inboxError && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <svg
              className="mb-3 h-12 w-12 text-kin-teal"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={CHAT_BUBBLE_ICON} />
            </svg>
            <p className="font-inter text-kin-navy">No conversations yet</p>
            <p className="mt-1 text-sm text-kin-teal font-inter">Connect with people from Discover to chat.</p>
          </div>
        )}

        <ul className="divide-y divide-kin-stone-100" role="list">
          {conversations.map((row) => {
            if (!row.user) return null;
            const peerId = row.user._id;
            const isActive = activeUserId === peerId;
            const unread = row.unreadCount > 0;

            return (
              <li key={peerId}>
                <button
                  type="button"
                  onClick={() => handleSelectConversation(peerId)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-kin-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kin-coral ${
                    isActive ? 'bg-kin-coral-50' : ''
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`Open chat with ${row.user.firstName} ${row.user.lastName}${
                    unread ? ', unread messages' : ''
                  }`}
                >
                  {row.user.photo ? (
                    <img
                      src={getPhotoUrl(row.user.photo)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover shadow-kin-soft"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-kin-coral to-kin-teal text-lg font-bold text-white font-montserrat shadow-kin-soft">
                      {row.user.firstName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate font-inter text-kin-navy ${unread ? 'font-bold' : 'font-medium'}`}
                      >
                        {row.user.firstName} {row.user.lastName}
                      </span>
                      {row.lastMessage?.createdAt && (
                        <span className="shrink-0 text-xs text-kin-teal font-inter">
                          {formatSidebarTime(row.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 truncate text-sm font-inter text-kin-teal ${unread ? 'font-semibold text-kin-navy' : ''}`}
                    >
                      {formatPreview(row.lastMessage)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChatSidebar;
