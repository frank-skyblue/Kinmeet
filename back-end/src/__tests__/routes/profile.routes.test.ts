import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Connection } from '../../models/Connection';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://cloudinary.com/test.jpg'),
  destroyImage: vi.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

describe('Profile Routes', () => {
  describe('GET /api/profile/me', () => {
    it('returns own profile when authenticated', async () => {
      const user = await createTestUser({ email: 'me@test.com', firstName: 'Me' });
      const token = getAuthToken(user);

      const res = await request(app)
        .get('/api/profile/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.firstName).toBe('Me');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/profile/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/profile/:userId', () => {
    it('hides lastName for non-connected users', async () => {
      const requester = await createTestUser({ email: 'a@test.com' });
      const target = await createTestUser({ email: 'b@test.com', lastName: 'Hidden' });
      const token = getAuthToken(requester);

      const res = await request(app)
        .get(`/api/profile/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.isConnected).toBe(false);
      expect(res.body.user.lastName).toBeUndefined();
    });

    it('shows lastName for connected users', async () => {
      const requester = await createTestUser({ email: 'a@test.com' });
      const target = await createTestUser({ email: 'b@test.com', lastName: 'Shown' });
      await Connection.create({ user1: requester._id, user2: target._id });
      const token = getAuthToken(requester);

      const res = await request(app)
        .get(`/api/profile/${target._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.isConnected).toBe(true);
      expect(res.body.user.lastName).toBe('Shown');
    });

    it('returns 400 for invalid userId format', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .get('/api/profile/not-an-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/profile/me', () => {
    it('updates profile fields', async () => {
      const user = await createTestUser({ email: 'me@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          about: 'New bio',
          gender: 'female',
          dateOfBirth: '1990-06-15',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Updated');
      expect(res.body.user.about).toBe('New bio');
      expect(res.body.user.gender).toBe('female');
      expect(String(res.body.user.dateOfBirth)).toContain('1990-06-15');
    });

    it('returns 400 when dateOfBirth is in the future', async () => {
      const user = await createTestUser({ email: 'future-dob-route@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ dateOfBirth: '3000-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date of birth');
    });

    it('returns 400 when dateOfBirth is more than 120 years ago', async () => {
      const user = await createTestUser({ email: 'too-old-dob-route@test.com' });
      const token = getAuthToken(user);
      const t = new Date();
      const y = t.getUTCFullYear() - 121;
      const tooOldStr = `${y}-06-15`;

      const res = await request(app)
        .put('/api/profile/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ dateOfBirth: tooOldStr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date of birth');
    });
  });

  describe('DELETE /api/profile/me', () => {
    it('deletes the account', async () => {
      const user = await createTestUser({ email: 'deleteme@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .delete('/api/profile/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
