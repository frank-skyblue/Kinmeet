import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser } from '../helpers';

const app = createTestApp();

const validRegister = {
  email: 'new@example.com',
  password: 'ValidPass1',
  firstName: 'Jane',
  lastName: 'Doe',
  homeCountry: 'France',
  currentProvince: 'Ontario',
  currentCountry: 'Canada',
  languages: ['English'],
  interests: ['Hiking'],
  lookingFor: ['Friendship'],
  dateOfBirth: '1990-06-15',
  gender: 'female',
};

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('returns 201 and a token on success', async () => {
      const res = await request(app).post('/api/auth/register').send(validRegister);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('new@example.com');
    });

    it('returns 400 for duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validRegister);
      const res = await request(app).post('/api/auth/register').send(validRegister);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, password: 'weak' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for future dateOfBirth', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'future-dob-route@example.com', dateOfBirth: '3000-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date of birth');
    });

    it('returns 400 for dateOfBirth more than 120 years ago', async () => {
      const t = new Date();
      const y = t.getUTCFullYear() - 121;
      const tooOldStr = `${y}-06-15`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'too-old-dob-route@example.com', dateOfBirth: tooOldStr });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid date of birth');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 200 and a token for valid credentials', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'TestPass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Wrong1234' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 200 with a valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer some-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 without a token', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
