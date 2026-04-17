import { Server, Socket } from 'socket.io';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';
import { CHAT_SOCKET_EVENTS } from './chatSocketEvents';
import type {
  ChatMarkReadPayload,
  ChatMessagesReadPayload,
  ChatSendMessageCallback,
  ChatSendMessagePayload,
  ChatTypingPayload,
  ChatUserTypingPayload,
} from './chatSocketTypes';

type PopulatedUserRef = { _id: { toString(): string }; firstName: string; lastName: string };

type PopulatedChatMessage = {
  _id: { toString(): string };
  sender: PopulatedUserRef;
  receiver: PopulatedUserRef;
};

const schedulePushIfReceiverOffline = (io: Server, receiverId: string, message: unknown) => {
  const room = io.sockets.adapter.rooms.get(`user:${receiverId}`);
  const receiverOnline = (room?.size ?? 0) > 0;
  if (receiverOnline) return;

  const m = message as PopulatedChatMessage;
  void notificationService.notifyChatMessage({
    receiverUserId: receiverId,
    senderUserId: m.sender._id.toString(),
    messageId: m._id.toString(),
    senderDisplayName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
  });
};

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on(CHAT_SOCKET_EVENTS.SEND_MESSAGE, async (data: ChatSendMessagePayload, callback: ChatSendMessageCallback) => {
    try {
      const { receiverId, content } = data;

      const message = await chatService.sendMessage(userId, receiverId, content);

      io.to(`user:${receiverId}`).emit(CHAT_SOCKET_EVENTS.NEW_MESSAGE, message);

      schedulePushIfReceiverOffline(io, receiverId, message);

      callback({ success: true, message });
    } catch (error) {
      console.error('Send message error:', error);
      callback({ success: false, message: 'Failed to send message' });
    }
  });

  socket.on(CHAT_SOCKET_EVENTS.TYPING_START, (data: ChatTypingPayload) => {
    const typingPayload: ChatUserTypingPayload = {
      userId,
      isTyping: true,
    };
    io.to(`user:${data.receiverId}`).emit(CHAT_SOCKET_EVENTS.USER_TYPING, typingPayload);
  });

  socket.on(CHAT_SOCKET_EVENTS.TYPING_STOP, (data: ChatTypingPayload) => {
    const typingPayload: ChatUserTypingPayload = {
      userId,
      isTyping: false,
    };
    io.to(`user:${data.receiverId}`).emit(CHAT_SOCKET_EVENTS.USER_TYPING, typingPayload);
  });

  socket.on(CHAT_SOCKET_EVENTS.MARK_READ, async (data: ChatMarkReadPayload) => {
    try {
      const modifiedCount = await chatService.markAsRead(userId, data.senderId);

      console.log(`Marked ${modifiedCount} messages as read`);

      const readPayload: ChatMessagesReadPayload = {
        readBy: userId,
      };
      io.to(`user:${data.senderId}`).emit(CHAT_SOCKET_EVENTS.MESSAGES_READ, readPayload);
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });
};
