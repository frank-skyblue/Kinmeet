import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatAPI, profileAPI, getPhotoUrl } from '../../services/api';
import { useAuth } from '../../contexts/useAuth';
import { useSocket } from '../../contexts/useSocket';
import { useChatInbox } from '../../contexts/chatInboxContext';
import { CHAT_SOCKET_EVENTS } from '../../constants/chatSocketEvents';
import type {
  ChatMarkReadPayload,
  ChatMessage,
  ChatMessagesReadPayload,
  ChatSendMessageAck,
  ChatSendMessagePayload,
  ChatTypingPayload,
  ChatUserTypingPayload,
  UserProfile,
} from '../../types';

interface ChatThreadProps {
  userId: string;
}

const ChatThread: React.FC<ChatThreadProps> = ({ userId }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { refetchInbox } = useChatInbox();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<
    Pick<UserProfile, '_id' | 'firstName' | 'lastName' | 'photo' | 'currentProvince' | 'currentCountry'> | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadConversation();
    loadUserProfile();
  }, [userId]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.sender._id === userId || message.receiver._id === userId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    };

    const handleUserTyping = (data: ChatUserTypingPayload) => {
      if (data.userId === userId) {
        setIsTyping(data.isTyping);
      }
    };

    const handleMessagesRead = (data: ChatMessagesReadPayload) => {
      if (data.readBy === userId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.receiver._id === userId ? { ...msg, read: true } : msg)),
        );
      }
    };

    socket.on(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(CHAT_SOCKET_EVENTS.USER_TYPING, handleUserTyping);
    socket.on(CHAT_SOCKET_EVENTS.MESSAGES_READ, handleMessagesRead);

    if (socket.connected) {
      const markReadPayload: ChatMarkReadPayload = { senderId: userId };
      socket.emit(CHAT_SOCKET_EVENTS.MARK_READ, markReadPayload);
    }

    return () => {
      socket.off(CHAT_SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(CHAT_SOCKET_EVENTS.USER_TYPING, handleUserTyping);
      socket.off(CHAT_SOCKET_EVENTS.MESSAGES_READ, handleMessagesRead);
    };
  }, [socket, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      const response = await chatAPI.getConversation(userId);
      if (response.success) {
        setMessages(response.messages);
      }
      await refetchInbox();
      setIsLoading(false);
    } catch (err: unknown) {
      setError('Failed to load conversation');
      console.error(err);
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await profileAPI.getUserProfile(userId);
      if (response.success) {
        setOtherUser(response.user);
      }
    } catch (err: unknown) {
      console.error('Failed to load user profile:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !userId || !user || !socket) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: ChatMessage = {
      _id: tempId,
      sender: {
        _id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      receiver: {
        _id: userId,
        firstName: otherUser?.firstName || '',
        lastName: otherUser?.lastName || '',
      },
      content: messageContent,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);
    setNewMessage('');
    setIsSending(true);

    const typingStopPayload: ChatTypingPayload = { receiverId: userId };
    socket.emit(CHAT_SOCKET_EVENTS.TYPING_STOP, typingStopPayload);

    try {
      const sendPayload: ChatSendMessagePayload = { receiverId: userId, content: messageContent };
      socket.emit(
        CHAT_SOCKET_EVENTS.SEND_MESSAGE,
        sendPayload,
        (response: ChatSendMessageAck) => {
          if (response.success) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => (msg._id === tempId ? response.message : msg)),
            );
            void refetchInbox();
          } else {
            setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== tempId));
            setError(response.message);
            setNewMessage(messageContent);
          }
          setIsSending(false);
        },
      );
    } catch {
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== tempId));
      setError('Failed to send message');
      setNewMessage(messageContent);
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socket || !userId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const typingPayload: ChatTypingPayload = { receiverId: userId };

    if (e.target.value.trim()) {
      socket.emit(CHAT_SOCKET_EVENTS.TYPING_START, typingPayload);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit(CHAT_SOCKET_EVENTS.TYPING_STOP, typingPayload);
      }, 2000);
    } else {
      socket.emit(CHAT_SOCKET_EVENTS.TYPING_STOP, typingPayload);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (days === 1) {
      return 'Yesterday';
    }
    if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleBackToInbox = () => {
    navigate('/chat');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-kin-coral" />
          <p className="font-inter text-kin-navy">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-kin-beige">
      <div className="shrink-0 border-b border-kin-stone-200 bg-white px-4 py-4 shadow-kin-soft md:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={handleBackToInbox}
              className="text-kin-navy transition hover:text-kin-coral md:hidden"
              aria-label="Back to inbox"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {otherUser && (
              <Link
                to={`/profile/${userId}`}
                className="flex min-w-0 items-center gap-3 rounded-kin-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kin-coral focus-visible:ring-offset-2 md:gap-4"
                aria-label={`View ${otherUser.firstName} ${otherUser.lastName}'s profile`}
              >
                {otherUser.photo ? (
                  <img
                    src={getPhotoUrl(otherUser.photo)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover shadow-kin-soft md:h-12 md:w-12"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-kin-coral to-kin-teal text-lg font-bold font-montserrat text-white shadow-kin-soft md:h-12 md:w-12 md:text-xl">
                    {otherUser.firstName.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 text-left">
                  <h2 className="truncate font-montserrat text-base font-bold text-kin-navy md:text-lg">
                    {otherUser.firstName} {otherUser.lastName}
                  </h2>
                  <p className="truncate font-inter text-xs text-kin-teal md:text-sm">
                    {otherUser.currentProvince}, {otherUser.currentCountry}
                  </p>
                </div>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isConnected && (
              <div className="flex items-center gap-2 font-inter text-sm text-kin-coral">
                <div className="h-2 w-2 animate-pulse rounded-full bg-kin-coral" />
                Reconnecting...
              </div>
            )}
            {isConnected && (
              <div className="flex items-center gap-2 font-inter text-sm text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                Connected
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {error && (
            <div className="mb-4 rounded-kin border border-kin-coral-200 bg-kin-coral-50 px-4 py-3 font-inter text-kin-coral-700">
              {error}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="py-12 text-center md:py-16">
              <div className="mb-4 text-5xl md:text-6xl">💬</div>
              <h3 className="mb-2 font-montserrat text-lg font-bold text-kin-navy md:text-xl">
                Start the conversation
              </h3>
              <p className="font-inter text-kin-teal">Send a message to begin chatting!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender._id === user?.id;

              return (
                <div key={message._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    data-testid="chat-message-bubble"
                    className={`max-w-xs cursor-default rounded-kin-lg px-4 py-3 font-inter transition duration-200 hover:shadow-kin-medium lg:max-w-md ${
                      isOwn
                        ? 'bg-kin-coral text-white shadow-kin-soft hover:bg-kin-coral-600'
                        : 'bg-white text-kin-navy shadow-kin-soft hover:bg-kin-beige'
                    }`}
                  >
                    <p className="wrap-break-word whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`mt-1 text-xs ${isOwn ? 'text-kin-beige' : 'text-kin-teal'}`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-kin-lg bg-white px-4 py-3 shadow-kin-soft">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-kin-teal" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-kin-teal delay-150" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-kin-teal delay-300" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-kin-stone-200 bg-white px-4 py-4 shadow-kin-soft md:px-6">
        <form onSubmit={handleSendMessage} className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 rounded-kin-sm border border-kin-stone-300 px-4 py-3 font-inter outline-none transition focus:border-transparent focus:ring-2 focus:ring-kin-coral"
              disabled={isSending || !isConnected}
              aria-label="Type a message"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim() || !isConnected}
              className="flex items-center rounded-kin-sm bg-kin-coral px-6 py-3 font-montserrat font-semibold text-white shadow-kin-soft transition hover:bg-kin-coral-600 hover:shadow-kin-medium disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatThread;
