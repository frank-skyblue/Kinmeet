import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import { Connection } from '../models/Connection';

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  // Send message
  socket.on('chat:send_message', async (data: { receiverId: string; content: string }, callback) => {
    try {
      const { receiverId, content } = data;

      // Validate
      if (!receiverId || !content?.trim()) {
        return callback({ success: false, message: 'Invalid data' });
      }

      // Check connection
      const connection = await Connection.findOne({
        $or: [
          { user1: userId, user2: receiverId },
          { user1: receiverId, user2: userId },
        ],
      });

      if (!connection) {
        return callback({ success: false, message: 'Not connected to this user' });
      }

      // Create message
      const message = new Message({
        sender: userId,
        receiver: receiverId,
        content: content.trim(),
        read: false,
      });

      await message.save();
      await message.populate('sender receiver', 'firstName lastName');

      // Send to receiver in real-time
      io.to(`user:${receiverId}`).emit('chat:new_message', message);

      // Acknowledge sender with saved message
      callback({ success: true, message });
    } catch (error) {
      console.error('Send message error:', error);
      callback({ success: false, message: 'Failed to send message' });
    }
  });

  // Typing indicator - start typing
  socket.on('chat:typing_start', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('chat:user_typing', {
      userId,
      isTyping: true,
    });
  });

  // Typing indicator - stop typing
  socket.on('chat:typing_stop', (data: { receiverId: string }) => {
    io.to(`user:${data.receiverId}`).emit('chat:user_typing', {
      userId,
      isTyping: false,
    });
  });

  // Mark messages as read
  socket.on('chat:mark_read', async (data: { senderId: string }) => {
    try {
      const result = await Message.updateMany(
        { sender: data.senderId, receiver: userId, read: false },
        { read: true }
      );

      console.log(`Marked ${result.modifiedCount} messages as read`);

      // Notify sender that their messages were read
      io.to(`user:${data.senderId}`).emit('chat:messages_read', {
        readBy: userId,
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });
};

