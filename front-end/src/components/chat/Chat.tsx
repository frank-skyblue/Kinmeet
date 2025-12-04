import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI, profileAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  receiver: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  content: string;
  read: boolean;
  createdAt: string;
}

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  currentProvince: string;
  currentCountry: string;
}

const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadConversation();
      loadUserProfile();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadConversation, 3000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      if (!userId) return;
      const response = await chatAPI.getConversation(userId);
      if (response.success) {
        setMessages(response.messages);
      }
      setIsLoading(false);
    } catch (err: any) {
      setError('Failed to load conversation');
      console.error(err);
      setIsLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      if (!userId) return;
      const response = await profileAPI.getUserProfile(userId);
      if (response.success) {
        setOtherUser(response.user);
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userId) return;

    setIsSending(true);
    try {
      const response = await chatAPI.sendMessage(userId, newMessage);
      if (response.success) {
        setMessages([...messages, response.message]);
        setNewMessage('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kin-beige">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-kin-coral mx-auto mb-4"></div>
          <p className="text-kin-navy font-inter">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-kin-beige">
      {/* Header */}
      <div className="bg-white border-b border-kin-stone-200 px-6 py-4 shadow-kin-soft">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/connections')}
              className="text-kin-navy hover:text-kin-coral transition"
              aria-label="Back to connections"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {otherUser && (
              <>
                {otherUser.photo ? (
                  <img
                    src={otherUser.photo}
                    alt={`${otherUser.firstName} ${otherUser.lastName}`}
                    className="w-12 h-12 rounded-full object-cover shadow-kin-soft"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-kin-coral to-kin-teal flex items-center justify-center text-white text-xl font-bold font-montserrat shadow-kin-soft">
                    {otherUser.firstName.charAt(0)}
                  </div>
                )}
                
                <div>
                  <h2 className="text-lg font-bold font-montserrat text-kin-navy">
                    {otherUser.firstName} {otherUser.lastName}
                  </h2>
                  <p className="text-sm text-kin-teal font-inter">
                    {otherUser.currentProvince}, {otherUser.currentCountry}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {error && (
            <div className="bg-kin-coral-50 border border-kin-coral-200 text-kin-coral-700 px-4 py-3 rounded-kin font-inter mb-4">
              {error}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-bold font-montserrat text-kin-navy mb-2">Start the conversation</h3>
              <p className="text-kin-teal font-inter">Send a message to begin chatting!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender._id === user?.id;
              
              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-kin-lg font-inter ${
                      isOwn
                        ? 'bg-kin-coral text-white shadow-kin-soft'
                        : 'bg-white text-kin-navy shadow-kin-soft'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-kin-beige' : 'text-kin-teal'
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-kin-stone-200 px-6 py-4 shadow-kin-soft">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-kin-stone-300 rounded-kin-sm focus:ring-2 focus:ring-kin-coral focus:border-transparent outline-none transition font-inter"
              disabled={isSending}
              aria-label="Type a message"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="bg-kin-coral text-white px-6 py-3 rounded-kin-sm font-semibold font-montserrat hover:bg-kin-coral-600 shadow-kin-soft hover:shadow-kin-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;

