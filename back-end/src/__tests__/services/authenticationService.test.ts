import { describe, it, expect } from 'vitest';
import { authenticationService } from '../../services/authenticationService';
import { User } from '../../models/User';
import { createTestUser } from '../helpers';
import jwt from 'jsonwebtoken';

describe('authenticationService', () => {
  describe('register', () => {
    const validData = {
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

    it('registers a new user and returns a token', async () => {
      const result = await authenticationService.register(validData);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user?.email).toBe('new@example.com');
      expect(result.user?.firstName).toBe('Jane');

      const decoded = jwt.verify(result.token!, process.env.JWT_SECRET!) as Record<string, unknown>;
      expect(decoded.email).toBe('new@example.com');

      const user = await User.findOne({ email: 'new@example.com' });
      expect(user?.gender).toBe('female');
      expect(user?.dateOfBirth).toBeDefined();
    });

    it('hashes the password before saving', async () => {
      await authenticationService.register(validData);
      const user = await User.findOne({ email: 'new@example.com' });
      expect(user?.password).not.toBe('ValidPass1');
    });

    it('persists optional currentCity from currentLocation', async () => {
      const result = await authenticationService.register({
        ...validData,
        email: 'city-user@example.com',
        currentLocation: {
          country: 'Canada',
          province: 'Ontario',
          city: 'Toronto',
        },
      });
      expect(result.success).toBe(true);
      const user = await User.findOne({ email: 'city-user@example.com' });
      expect(user?.currentCity).toBe('Toronto');
    });

    it('rejects duplicate email', async () => {
      await authenticationService.register(validData);
      const result = await authenticationService.register(validData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This email is already registered. Please log in instead.');
    });

    it('rejects duplicate email with different casing', async () => {
      await authenticationService.register(validData);
      const result = await authenticationService.register({
        ...validData,
        email: 'New@Example.com',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('This email is already registered. Please log in instead.');
    });

    it('rejects duplicate email with surrounding whitespace', async () => {
      await authenticationService.register(validData);
      const result = await authenticationService.register({
        ...validData,
        email: ' new@example.com ',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('This email is already registered. Please log in instead.');
    });

    it('rejects missing required fields', async () => {
      const result = await authenticationService.register({
        email: 'x@test.com',
        password: 'ValidPass1',
      } as any);

      expect(result.success).toBe(false);
      expect(result.message).toBe('All required fields must be provided');
    });

    it('rejects missing languages', async () => {
      const result = await authenticationService.register({
        ...validData,
        languages: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('language');
    });

    it('rejects missing lookingFor', async () => {
      const result = await authenticationService.register({
        ...validData,
        lookingFor: [],
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('looking for');
    });

    it('rejects weak password', async () => {
      const result = await authenticationService.register({
        ...validData,
        password: 'weak',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Password must be');
    });

    it('rejects invalid gender', async () => {
      const result = await authenticationService.register({
        ...validData,
        email: 'bad-gender@example.com',
        gender: 'Alien',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid gender selection');
    });

    it('rejects future date of birth', async () => {
      const result = await authenticationService.register({
        ...validData,
        email: 'future-dob@example.com',
        dateOfBirth: '3000-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid date of birth');
    });

    it('allows date of birth today', async () => {
      const t = new Date();
      const todayStr = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
      const result = await authenticationService.register({
        ...validData,
        email: 'today-dob@example.com',
        dateOfBirth: todayStr,
      });

      expect(result.success).toBe(true);
    });

    it('rejects date of birth more than 120 years ago', async () => {
      const t = new Date();
      const y = t.getUTCFullYear() - 121;
      const tooOldStr = `${y}-06-15`;
      const result = await authenticationService.register({
        ...validData,
        email: 'too-old-dob@example.com',
        dateOfBirth: tooOldStr,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid date of birth');
    });

    it('allows date of birth on earliest allowed day (120 years ago, UTC)', async () => {
      const t = new Date();
      const maxDob = new Date(
        Date.UTC(t.getUTCFullYear() - 120, t.getUTCMonth(), t.getUTCDate(), 12, 0, 0, 0),
      );
      const minStr = `${maxDob.getUTCFullYear()}-${String(maxDob.getUTCMonth() + 1).padStart(2, '0')}-${String(maxDob.getUTCDate()).padStart(2, '0')}`;
      const result = await authenticationService.register({
        ...validData,
        email: 'min-age-bound@example.com',
        dateOfBirth: minStr,
      });

      expect(result.success).toBe(true);
    });

    it('auto-generates a username from first name and four digits when none provided', async () => {
      const result = await authenticationService.register(validData);

      expect(result.success).toBe(true);
      expect(result.user?.username).toMatch(/^jane\d{4}$/);
      expect(result.user?.username).not.toBe('janedoe');

      const stored = await User.findOne({ email: 'new@example.com' });
      expect(stored?.username).toBe(result.user?.username);
    });

    it('generates different usernames for users without a provided username', async () => {
      await authenticationService.register(validData);
      const second = await authenticationService.register({
        ...validData,
        email: 'second@example.com',
      });

      expect(second.success).toBe(true);
      expect(second.user?.username).toMatch(/^jane\d{4}$/);
    });

    it('accepts a user-provided username and lowercases it', async () => {
      const result = await authenticationService.register({
        ...validData,
        username: 'Custom_User1',
      });

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe('custom_user1');
    });

    it('rejects an invalid username format', async () => {
      const result = await authenticationService.register({
        ...validData,
        username: 'no spaces!',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Username');
    });

    it('rejects a duplicate username', async () => {
      await authenticationService.register({ ...validData, username: 'taken_name' });
      const result = await authenticationService.register({
        ...validData,
        email: 'second@example.com',
        username: 'taken_name',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Username is already taken');
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });
      const result = await authenticationService.login({
        email: 'login@test.com',
        password: 'TestPass123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user?.email).toBe('login@test.com');
    });

    it('rejects wrong password', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });
      const result = await authenticationService.login({
        email: 'login@test.com',
        password: 'WrongPass1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('rejects nonexistent email', async () => {
      const result = await authenticationService.login({
        email: 'ghost@test.com',
        password: 'TestPass123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('rejects empty email or password', async () => {
      const result = await authenticationService.login({ email: '', password: '' });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email and password are required');
    });
  });

  describe('logout', () => {
    it('returns success', async () => {
      const result = await authenticationService.logout('some-token');
      expect(result.success).toBe(true);
    });
  });
});
