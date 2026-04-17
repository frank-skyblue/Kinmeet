import type { chatService } from '../services/chatService';

/** Client → server: send a chat message */
export interface ChatSendMessagePayload {
  receiverId: string;
  content: string;
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

export type ChatMessageFromSend = Awaited<ReturnType<typeof chatService.sendMessage>>;

/** Ack from `CHAT_SOCKET_EVENTS.SEND_MESSAGE` */
export type ChatSendMessageAck =
  | { success: true; message: ChatMessageFromSend }
  | { success: false; message: string };

export type ChatSendMessageCallback = (ack: ChatSendMessageAck) => void;
