import type { ChatAttachmentReceipt, ChatMessage } from './index';

/** Client → server: send a chat message (text, an image with optional caption, or a voice message) */
export interface ChatSendMessagePayload {
  receiverId: string;
  content?: string;
  attachment?: ChatAttachmentReceipt;
  /** Lets the server recognise a retried send and return the original message. */
  clientMessageId?: string;
}

/** Client → server: typing indicators */
export interface ChatTypingPayload {
  receiverId: string;
}

/** Client → server: mark peer's messages as read */
export interface ChatMarkReadPayload {
  senderId: string;
}

/** Server → client: peer typing state */
export interface ChatUserTypingPayload {
  userId: string;
  isTyping: boolean;
}

/** Server → client: messages were read by `readBy` */
export interface ChatMessagesReadPayload {
  readBy: string;
}

/** Ack from `CHAT_SOCKET_EVENTS.SEND_MESSAGE` */
export type ChatSendMessageAck =
  | { success: true; message: ChatMessage }
  | { success: false; message: string };
