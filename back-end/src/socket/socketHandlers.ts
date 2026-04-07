import { Server, Socket } from 'socket.io';
import { chatService } from '../services/chatService';

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on('chat:send_message', async (data: { receiverId: string; content: string }, callback) => {
    try {
      const { receiverId, content } = data;

      const message = await chatService.sendMessage(userId, receiverId, content);

      io.to(`user:${receiverId}`).emit('chat:new_message', message);

      callback({ success: true, message });
    } catch (error) {
      console.error('Send message error:', error);
      callback({ success: false, message: 'Failed to send message' });
    }
  });

  socket.on('chat:typing_start', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('chat:user_typing', {
      userId,
      isTyping: true,
    });
  });

  socket.on('chat:typing_stop', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('chat:user_typing', {
      userId,
      isTyping: false,
    });
  });

  socket.on('chat:mark_read', async (data: { senderId: string }) => {
    try {
      const modifiedCount = await chatService.markAsRead(userId, data.senderId);

      console.log(`Marked ${modifiedCount} messages as read`);

      io.to(`user:${data.senderId}`).emit('chat:messages_read', {
        readBy: userId,
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });
};
