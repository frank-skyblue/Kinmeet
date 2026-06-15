import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { User } from '../../models/User';
import { createTestApp, createTestUser } from '../helpers';

const app = createTestApp();

const validRegister = {
  email: 'new@example.com',
  password: 'ValidPass1',
  firstName: 'Jane',
  lastName: 'Doe',
  homeCountry: 'France',
  currentLocation: {
    province: 'Ontario',
    country: 'Canada',
    city: 'Toronto',
  },
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

    it('returns 400 for missing firstName', async () => {
      const { firstName: _firstName, ...payload } = validRegister;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...payload, email: 'missing-first@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for blank firstName', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'blank-first@example.com', firstName: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing lastName', async () => {
      const { lastName: _lastName, ...payload } = validRegister;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...payload, email: 'missing-last@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing homeCountry', async () => {
      const { homeCountry: _homeCountry, ...payload } = validRegister;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...payload, email: 'missing-home@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing currentLocation.province', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'missing-province@example.com',
          currentLocation: { country: 'Canada', city: 'Toronto' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing currentLocation.country', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'missing-country@example.com',
          currentLocation: { province: 'Ontario', city: 'Toronto' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing currentLocation.city', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'missing-city@example.com',
          currentLocation: { province: 'Ontario', country: 'Canada' },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid dateOfBirth', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'invalid-dob@example.com', dateOfBirth: '1990-13-45' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing gender', async () => {
      const { gender: _gender, ...payload } = validRegister;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...payload, email: 'missing-gender@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing lookingFor', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validRegister, email: 'missing-looking@example.com', lookingFor: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('saves firstName trimmed when input has surrounding spaces', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'trimmed-first@example.com',
          firstName: '  Ethan  ',
        });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: 'trimmed-first@example.com' });
      expect(user?.firstName).toBe('Ethan');
    });

    it('accepts mixed-case username and saves it lowercased', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'mixed-case-username@example.com',
          username: ' Custom_User1 ',
        });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: 'mixed-case-username@example.com' });
      expect(user?.username).toBe('custom_user1');
    });

    it('does not trim password before existing password validation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegister,
          email: 'password-spaces@example.com',
          password: '  ValidPass1  ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Password must be at least 8 characters');
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
