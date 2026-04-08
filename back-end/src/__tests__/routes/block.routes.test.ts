import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Connection } from '../../models/Connection';

const app = createTestApp();

describe('Block Routes', () => {
  describe('POST /api/block/block', () => {
    it('blocks a user', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('removes connection when blocking', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });
      const token = getAuthToken(userA);

      await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).toBeNull();
    });

    it('returns 400 for invalid userId', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'not-valid' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/block/unblock/:userId', () => {
    it('unblocks a user', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      const res = await request(app)
        .delete(`/api/block/unblock/${userB._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/block/blocked', () => {
    it('returns blocked users list', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      const res = await request(app)
        .get('/api/block/blocked')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.blockedUsers).toHaveLength(1);
    });
  });

  describe('POST /api/block/report', () => {
    it('reports and blocks a user', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString(), reason: 'Spam' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when reason is missing', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      expect(res.status).toBe(400);
    });

    it('blocked user excluded from matches', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      await request(app)
        .post('/api/block/block')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString() });

      const matchRes = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${token}`);

      const matchIds = matchRes.body.matches.map((m: any) => m._id);
      expect(matchIds).not.toContain(userB._id.toString());
    });
  });
});
