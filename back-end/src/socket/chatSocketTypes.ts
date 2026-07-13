import { z } from 'zod';
import type { chatService } from '../services/chatService';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

export const chatSendMessageSchema = z.object({
  receiverId: objectId,
  content: z.string().trim().min(1, 'Content is required').max(2000, 'Message too long'),
});

export const chatTypingSchema = z.object({
  receiverId: objectId,
});

export const chatMarkReadSchema = z.object({
  senderId: objectId,
});

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
