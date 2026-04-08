import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';

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
    it('returns 200', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/matching/pass')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
