import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Block } from '../../models/Block';
import { Connection } from '../../models/Connection';
import { Report } from '../../models/Report';

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
    it('records a report without blocking or disconnecting', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: userB._id.toString(),
          reason: 'Harassment or bullying',
          details: 'Sent abusive messages',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const report = await Report.findOne({ reporter: userA._id, reported: userB._id });
      expect(report?.reason).toBe('Harassment or bullying');
      expect(report?.details).toBe('Sent abusive messages');

      // Reporting must not block, and must leave the connection alone.
      const block = await Block.findOne({ blocker: userA._id, blocked: userB._id });
      expect(block).toBeNull();
      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).not.toBeNull();
    });

    it('rejects a reason outside the allowed list', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString(), reason: 'Harassment or bullying — extra text' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when reason is Other without details', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userB._id.toString(), reason: 'Other' });

      expect(res.status).toBe(400);
      expect(await Report.countDocuments({})).toBe(0);
    });

    it('accepts Other when details are provided', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/block/report')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: userB._id.toString(),
          reason: 'Other',
          details: 'Pretending to be support staff',
        });

      expect(res.status).toBe(201);
      const report = await Report.findOne({ reporter: userA._id });
      expect(report?.details).toBe('Pretending to be support staff');
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
