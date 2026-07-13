import { Server, Socket } from 'socket.io';
import { ZodSchema } from 'zod';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';
import { CHAT_SOCKET_EVENTS } from './chatSocketEvents';
import {
  chatMarkReadSchema,
  chatSendMessageSchema,
  chatTypingSchema,
} from './chatSocketTypes';
import type {
  ChatMessageFromSend,
  ChatMessagesReadPayload,
  ChatSendMessageCallback,
  ChatUserTypingPayload,
} from './chatSocketTypes';

/**
 * Parse and validate an incoming socket payload against a Zod schema.
 * Returns the typed data on success, or null on failure (emitting an error ack when provided).
 */
const parseSocketPayload = <T>(
  schema: ZodSchema<T>,
  data: unknown,
  callback?: (ack: { success: false; message: string }) => void,
): T | null => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid payload';
    callback?.({ success: false, message });
    return null;
  }
  return result.data;
};

const schedulePushIfReceiverOffline = (io: Server, receiverId: string, message: ChatMessageFromSend) => {
  const room = io.sockets.adapter.rooms.get(`user:${receiverId}`);
  const receiverOnline = (room?.size ?? 0) > 0;
  if (receiverOnline) return;

  const sender = message.sender as unknown as { _id: { toString(): string }; firstName: string; lastName: string };
  void notificationService.notifyChatMessage({
    receiverUserId: receiverId,
    senderUserId: sender._id.toString(),
    messageId: (message._id as { toString(): string }).toString(),
    senderDisplayName: `${sender.firstName} ${sender.lastName}`.trim(),
  });
};

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on(CHAT_SOCKET_EVENTS.SEND_MESSAGE, async (data: unknown, callback: ChatSendMessageCallback) => {
    const payload = parseSocketPayload(chatSendMessageSchema, data, callback);
    if (!payload) return;

    try {
      const message = await chatService.sendMessage(userId, payload.receiverId, payload.content);

      io.to(`user:${payload.receiverId}`).emit(CHAT_SOCKET_EVENTS.NEW_MESSAGE, message);
      schedulePushIfReceiverOffline(io, payload.receiverId, message);

      callback({ success: true, message });
    } catch (error) {
      console.error('Send message error:', error);
      callback({ success: false, message: 'Failed to send message' });
    }
  });

  const emitTyping = (receiverId: string, isTyping: boolean) => {
    const typingPayload: ChatUserTypingPayload = { userId, isTyping };
    io.to(`user:${receiverId}`).emit(CHAT_SOCKET_EVENTS.USER_TYPING, typingPayload);
  };

  socket.on(CHAT_SOCKET_EVENTS.TYPING_START, (data: unknown) => {
    const payload = parseSocketPayload(chatTypingSchema, data);
    if (payload) emitTyping(payload.receiverId, true);
  });

  socket.on(CHAT_SOCKET_EVENTS.TYPING_STOP, (data: unknown) => {
    const payload = parseSocketPayload(chatTypingSchema, data);
    if (payload) emitTyping(payload.receiverId, false);
  });

  socket.on(CHAT_SOCKET_EVENTS.MARK_READ, async (data: unknown) => {
    const payload = parseSocketPayload(chatMarkReadSchema, data);
    if (!payload) return;

    try {
      const modifiedCount = await chatService.markAsRead(userId, payload.senderId);

      console.log(`Marked ${modifiedCount} messages as read`);

      const readPayload: ChatMessagesReadPayload = { readBy: userId };
      io.to(`user:${payload.senderId}`).emit(CHAT_SOCKET_EVENTS.MESSAGES_READ, readPayload);
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });
};
