import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { DiscoverPass } from '../../models/DiscoverPass';

const app = createTestApp();

describe('Matching Routes', () => {
  describe('GET /api/matching', () => {
    it('returns matching users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({
        email: 'b@test.com',
        firstName: 'Match',
        homeCountry: 'France',
        currentCountry: 'Canada',
      });
      const token = getAuthToken(userA);

      const res = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matches).toHaveLength(1);
      expect(res.body.matches[0].firstName).toBe('Match');
    });

    it('leaves out emptyState when there are matches', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({ email: 'b@test.com' });

      const res = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${getAuthToken(userA)}`);

      expect(res.body.emptyState).toBeUndefined();
    });

    it('reports community_growing when no one else is in the group', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({ email: 'b@test.com', homeCountry: 'Germany' });

      const res = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${getAuthToken(userA)}`);

      expect(res.status).toBe(200);
      expect(res.body.matches).toEqual([]);
      expect(res.body.emptyState).toBe('community_growing');
    });

    it('reports all_caught_up when everyone in the group has been seen', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await DiscoverPass.create({ viewer: userA._id, viewed: userB._id });

      const res = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${getAuthToken(userA)}`);

      expect(res.body.matches).toEqual([]);
      expect(res.body.emptyState).toBe('all_caught_up');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/matching');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/matching/meet', () => {
    it('creates a meet request', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .post('/api/matching/meet')
        .set('Authorization', `Bearer ${token}`)
        .send({ receiverId: userB._id.toString() });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid receiverId', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/matching/meet')
        .set('Authorization', `Bearer ${token}`)
        .send({ receiverId: 'not-valid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/matching/pass', () => {
    it('records the pass so the profile is not shown again', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const other = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/matching/pass')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: other._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(await DiscoverPass.countDocuments({ viewer: user._id, viewed: other._id })).toBe(1);

      const matches = await request(app)
        .get('/api/matching')
        .set('Authorization', `Bearer ${token}`);
      expect(matches.body.matches).toHaveLength(0);
    });

    it('passing the same person twice keeps one record', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const other = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(user);

      for (let i = 0; i < 2; i++) {
        const res = await request(app)
          .post('/api/matching/pass')
          .set('Authorization', `Bearer ${token}`)
          .send({ userId: other._id.toString() });
        expect(res.status).toBe(200);
      }
      expect(await DiscoverPass.countDocuments({ viewer: user._id })).toBe(1);
    });

    it('returns 400 without a valid userId', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/matching/pass')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 when passing on yourself', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/matching/pass')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/matching/pass rate limit', () => {
    it('caps passes per user', async () => {
      const user = await createTestUser({ email: 'swiper@test.com' });
      const other = await createTestUser({ email: 'b@test.com' });
      const token = getAuthToken(user);
      const pass = () => request(app)
        .post('/api/matching/pass')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: other._id.toString() });

      for (let i = 0; i < 120; i += 1) {
        expect((await pass()).status).toBe(200);
      }

      expect((await pass()).status).toBe(429);
    });
  });
});
