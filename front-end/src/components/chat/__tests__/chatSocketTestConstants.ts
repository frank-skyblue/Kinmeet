import { CHAT_SOCKET_EVENTS, type ChatSocketEventName } from '../../../constants/chatSocketEvents';

/**
 * Inbound events `ChatThread` registers — keep in sync with its `socket.on` setup.
 */
export const CHAT_THREAD_INBOUND_EVENTS = [
  CHAT_SOCKET_EVENTS.NEW_MESSAGE,
  CHAT_SOCKET_EVENTS.USER_TYPING,
  CHAT_SOCKET_EVENTS.MESSAGES_READ,
] as const satisfies readonly ChatSocketEventName[];
