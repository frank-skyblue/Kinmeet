import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Connection } from '../../models/Connection';

const app = createTestApp();

const connectAndGetTokens = async () => {
  const userA = await createTestUser({ email: 'a@test.com', firstName: 'Alice' });
  const userB = await createTestUser({ email: 'b@test.com', firstName: 'Bob' });
  await Connection.create({ user1: userA._id, user2: userB._id });
  return {
    userA,
    userB,
    tokenA: getAuthToken(userA),
    tokenB: getAuthToken(userB),
  };
};

describe('Chat Routes', () => {
  describe('POST /api/chat/messages', () => {
    it('sends a message between connected users', async () => {
      const { userB, tokenA } = await connectAndGetTokens();

      const res = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: userB._id.toString(), content: 'Hello!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid body', async () => {
      const { tokenA } = await connectAndGetTokens();

      const res = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: 'invalid', content: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chat/conversations', () => {
    it('returns conversation list', async () => {
      const { userA, userB, tokenA } = await connectAndGetTokens();
      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: userB._id.toString(), content: 'Hi' });

      const res = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.conversations).toHaveLength(1);
    });
  });

  describe('GET /api/chat/conversations/:userId', () => {
    it('returns messages for a conversation', async () => {
      const { userA, userB, tokenA } = await connectAndGetTokens();
      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ receiverId: userB._id.toString(), content: 'Test message' });

      const res = await request(app)
        .get(`/api/chat/conversations/${userB._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].content).toBe('Test message');
    });

    it('returns 400 for invalid userId', async () => {
      const { tokenA } = await connectAndGetTokens();

      const res = await request(app)
        .get('/api/chat/conversations/invalid-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/chat/messages/read', () => {
    it('marks messages as read', async () => {
      const { userA, userB, tokenA, tokenB } = await connectAndGetTokens();

      await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ receiverId: userA._id.toString(), content: 'Read me' });

      const res = await request(app)
        .post('/api/chat/messages/read')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ senderId: userB._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
