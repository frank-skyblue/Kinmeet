import { describe, it, expect } from 'vitest';
import { chatService } from '../../services/chatService';
import { createTestUser } from '../helpers';
import { Connection } from '../../models/Connection';
import { Message } from '../../models/Message';

describe('chatService', () => {
  const connectUsers = async () => {
    const userA = await createTestUser({ email: 'a@test.com', firstName: 'Alice' });
    const userB = await createTestUser({ email: 'b@test.com', firstName: 'Bob' });
    await Connection.create({ user1: userA._id, user2: userB._id });
    return { userA, userB };
  };

  describe('sendMessage', () => {
    it('saves a message between connected users', async () => {
      const { userA, userB } = await connectUsers();
      const msg = await chatService.sendMessage(
        userA._id.toString(),
        userB._id.toString(),
        'Hello!',
      );

      expect(msg.content).toBe('Hello!');
      expect(msg.read).toBe(false);
    });

    it('rejects messages between unconnected users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await expect(
        chatService.sendMessage(userA._id.toString(), userB._id.toString(), 'Hi'),
      ).rejects.toThrow('Can only message connected users');
    });

    it('rejects empty content', async () => {
      const { userA, userB } = await connectUsers();
      await expect(
        chatService.sendMessage(userA._id.toString(), userB._id.toString(), ''),
      ).rejects.toThrow('Receiver ID and content are required');
    });
  });

  describe('getConversation', () => {
    it('returns messages in chronological order', async () => {
      const { userA, userB } = await connectUsers();
      await chatService.sendMessage(userA._id.toString(), userB._id.toString(), 'First');
      await chatService.sendMessage(userB._id.toString(), userA._id.toString(), 'Second');

      const messages = await chatService.getConversation(
        userA._id.toString(),
        userB._id.toString(),
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });

    it('marks unread messages as read when fetching conversation', async () => {
      const { userA, userB } = await connectUsers();
      await chatService.sendMessage(userB._id.toString(), userA._id.toString(), 'Read me');

      await chatService.getConversation(userA._id.toString(), userB._id.toString());

      const unread = await Message.countDocuments({
        sender: userB._id,
        receiver: userA._id,
        read: false,
      });
      expect(unread).toBe(0);
    });

    it('rejects conversation between unconnected users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await expect(
        chatService.getConversation(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Can only view conversations with connected users');
    });
  });

  describe('getConversations', () => {
    it('returns conversation list with last message and unread count', async () => {
      const { userA, userB } = await connectUsers();
      await chatService.sendMessage(userB._id.toString(), userA._id.toString(), 'Hey');

      const conversations = await chatService.getConversations(userA._id.toString());

      expect(conversations).toHaveLength(1);
      expect(conversations[0].lastMessage?.content).toBe('Hey');
      expect(conversations[0].unreadCount).toBe(1);
      expect(conversations[0].user?.firstName).toBe('Bob');
    });

    it('returns empty for user with no connections', async () => {
      const user = await createTestUser({ email: 'alone@test.com' });
      const conversations = await chatService.getConversations(user._id.toString());
      expect(conversations).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('marks unread messages from a sender as read', async () => {
      const { userA, userB } = await connectUsers();
      await chatService.sendMessage(userB._id.toString(), userA._id.toString(), 'Msg 1');
      await chatService.sendMessage(userB._id.toString(), userA._id.toString(), 'Msg 2');

      const count = await chatService.markAsRead(userA._id.toString(), userB._id.toString());
      expect(count).toBe(2);

      const unread = await Message.countDocuments({
        sender: userB._id,
        receiver: userA._id,
        read: false,
      });
      expect(unread).toBe(0);
    });

    it('returns 0 when no unread messages', async () => {
      const { userA, userB } = await connectUsers();
      const count = await chatService.markAsRead(userA._id.toString(), userB._id.toString());
      expect(count).toBe(0);
    });
  });
});
