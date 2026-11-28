export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  photo?: string;
  profileComplete: boolean;
}

export interface UserProfile {
  _id: string;
  email?: string;
  username?: string;
  firstName: string;
  lastName?: string;
  about?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  educationLevel?: string;
  graduationYear?: number;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  currentCity?: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
  profileComplete?: boolean;
  gender?: string;
  dateOfBirth?: string;
}

export interface GetProfileResponse {
  success: boolean;
  message?: string;
  user: UserProfile;
}

export interface RegisterPayload {
  email: string;
  username?: string;
  password: string;
  firstName: string;
  lastName: string;
  about?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  educationLevel?: string;
  graduationYear?: number;
  homeCountry: string;
  currentLocation: {
    province: string;
    country: string;
    city: string;
  };
  languages: string[];
  interests: string[];
  lookingFor: string[];
  profilePhoto?: string;
  dateOfBirth: string;
  gender: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

// ---- Discover ----

export interface Match {
  _id: string;
  firstName: string;
  about?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  educationLevel?: string;
  graduationYear?: number;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

/**
 * Why Discover is empty: no one else shares both of the user's countries, or the user has
 * already seen everyone who does.
 */
export type DiscoverEmptyState = 'community_growing' | 'all_caught_up';

export interface GetMatchesResponse {
  success: boolean;
  matches: Match[];
  /** Present only when `matches` is empty. */
  emptyState?: DiscoverEmptyState;
}

// ---- Kins (connections) ----

export interface Connection {
  _id: string;
  firstName: string;
  lastName: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
  connectedAt?: string;
}

export interface GetConnectionsResponse {
  success: boolean;
  connections: Connection[];
}

/** Who sent a kin request. No last name: it stays hidden until the request is accepted. */
export interface ConnectionRequestSender {
  _id: string;
  firstName: string;
  dateOfBirth?: string;
  homeCountry: string;
  currentProvince: string;
  currentCountry: string;
  languages: string[];
  interests: string[];
  lookingFor: string[];
  photo?: string;
}

export interface ConnectionRequestItem {
  _id: string;
  sender: ConnectionRequestSender;
  createdAt: string;
}

export interface GetConnectionRequestsResponse {
  success: boolean;
  requests: ConnectionRequestItem[];
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface AvailabilityResponse {
  success: boolean;
  available?: boolean;
  message?: string;
}

export type ChatMessageType = 'text' | 'image' | 'voice';

/** Signed viewing links, built by the server each time messages are loaded. */
export interface ChatMediaUrls {
  display?: string;
  full?: string;
  audio?: string;
}

export interface ChatAttachment {
  /** Absent when the media was removed. */
  urls?: ChatMediaUrls;
  width?: number;
  height?: number;
  durationMs?: number;
  removed?: boolean;
}

export interface ChatMessageUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface ChatMessage {
  _id: string;
  sender: ChatMessageUser;
  receiver: ChatMessageUser;
  /** Absent on messages created before media existed; treat as text. */
  type?: ChatMessageType;
  /** The text, or an image's optional caption. */
  content?: string;
  attachment?: ChatAttachment;
  read: boolean;
  createdAt: string;
}

export interface ChatConversationUser {
  _id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  currentProvince?: string;
  currentCountry?: string;
  /** Set when the other account is deactivated; its name is replaced with "Unavailable". */
  unavailable?: boolean;
}

export interface ChatConversationSummary {
  user: ChatConversationUser | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface GetConversationsResponse {
  success: boolean;
  conversations: ChatConversationSummary[];
  unreadConversationCount: number;
}

/** One page of a conversation, oldest message first. */
export interface GetConversationResponse {
  success: boolean;
  messages: ChatMessage[];
  /** Pass back to get the page before this one; missing or null at the start of the conversation. */
  nextCursor?: string | null;
}

export interface GetUserProfileResponse {
  success: boolean;
  user: UserProfile;
}

/** Client → server: send a text message. */
export interface ChatSendMessagePayload {
  receiverId: string;
  content: string;
}

/** Client → server: typing indicators. */
export interface ChatTypingPayload {
  receiverId: string;
}

/** Client → server: mark the peer's messages as read. */
export interface ChatMarkReadPayload {
  senderId: string;
}

/** Server → client: the peer's typing state. */
export interface ChatUserTypingPayload {
  userId: string;
  isTyping: boolean;
}

/** Ack from `CHAT_SOCKET_EVENTS.SEND_MESSAGE`. */
export type ChatSendMessageAck =
  | { success: true; message: ChatMessage }
  | { success: false; message: string };
