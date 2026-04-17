/**
 * Socket.IO chat event names — keep aligned with `back-end/src/socket/chatSocketEvents.ts`.
 */
export const CHAT_SOCKET_EVENTS = {
  SEND_MESSAGE: 'chat:send_message',
  TYPING_START: 'chat:typing_start',
  TYPING_STOP: 'chat:typing_stop',
  MARK_READ: 'chat:mark_read',
  NEW_MESSAGE: 'chat:new_message',
  USER_TYPING: 'chat:user_typing',
  MESSAGES_READ: 'chat:messages_read',
} as const;

export type ChatSocketEventName = (typeof CHAT_SOCKET_EVENTS)[keyof typeof CHAT_SOCKET_EVENTS];
