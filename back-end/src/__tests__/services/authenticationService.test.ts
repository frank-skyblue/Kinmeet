import { vi, describe, it, expect } from 'vitest';
import { authenticationService } from '../../services/authenticationService';
import { User } from '../../models/User';
import { createTestUser } from '../helpers';
import { newPeopleAlertService } from '../../services/newPeopleAlertService';
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

    it('joins the Discover group and alerts it in the background', async () => {
      const notify = vi.spyOn(newPeopleAlertService, 'notifyGroup').mockResolvedValue(0);

      await authenticationService.register(validData);

      const saved = await User.findOne({ email: 'new@example.com' }).select('groupJoinedAt').lean();
      expect(saved!.groupJoinedAt).toBeInstanceOf(Date);
      expect(notify).toHaveBeenCalledWith({ homeCountry: 'France', currentCountry: 'Canada' });
      notify.mockRestore();
    });

    it('registers a new user and returns a token', async () => {
      const result = await authenticationService.register(validData);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user?.email).toBe('new@example.com');
      expect(result.user?.firstName).toBe('Jane');

      const decoded = jwt.verify(result.token!, process.env.JWT_SECRET!) as Record<string, unknown>;
      expect(decoded.email).toBe('new@example.com');
      expect(decoded.tv).toBe(0);

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

    it('persists optional industry during registration', async () => {
      const result = await authenticationService.register({
        ...validData,
        email: 'industry-user@example.com',
        industry: 'Healthcare',
      });
      expect(result.success).toBe(true);
      const user = await User.findOne({ email: 'industry-user@example.com' });
      expect(user?.industry).toBe('Healthcare');
      expect(user?.jobTitle).toBeUndefined();
      expect(user?.company).toBeUndefined();
    });

    it('persists optional educationLevel during registration', async () => {
      const result = await authenticationService.register({
        ...validData,
        email: 'education-user@example.com',
        educationLevel: "Bachelor's Degree",
      });
      expect(result.success).toBe(true);
      const user = await User.findOne({ email: 'education-user@example.com' });
      expect(user?.educationLevel).toBe("Bachelor's Degree");
    });

    it('rejects duplicate email', async () => {
      await authenticationService.register(validData);
      await expect(authenticationService.register(validData)).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
    });

    it('rejects duplicate email with different casing', async () => {
      await authenticationService.register(validData);
      await expect(
        authenticationService.register({
          ...validData,
          email: 'New@Example.com',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
    });

    it('rejects duplicate email with surrounding whitespace', async () => {
      await authenticationService.register(validData);
      await expect(
        authenticationService.register({
          ...validData,
          email: ' new@example.com ',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
    });

    it('rejects duplicate email with zero-width characters', async () => {
      await authenticationService.register(validData);
      await expect(
        authenticationService.register({
          ...validData,
          email: 'new@example.com\u200B',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
    });

    it('rejects duplicate email with unicode equivalent forms', async () => {
      await authenticationService.register({
        ...validData,
        email: 'caf\u00E9@example.com',
      });
      await expect(
        authenticationService.register({
          ...validData,
          email: 'cafe\u0301@example.com',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
    });

    it('rejects duplicate email for legacy mixed-case records', async () => {
      await User.collection.insertOne({
        email: 'Legacy@Example.com',
        password: 'hash',
        firstName: 'Old',
        lastName: 'User',
        homeCountry: 'France',
        currentProvince: 'Ontario',
        currentCountry: 'Canada',
        languages: ['English'],
        lookingFor: ['Friendship'],
        profileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authenticationService.register({
          ...validData,
          email: 'legacy@example.com',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'This email is already registered. Please log in instead.',
      });
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

    it('rejects a duplicate username', async () => {
      await authenticationService.register({ ...validData, username: 'taken_name' });
      await expect(
        authenticationService.register({
          ...validData,
          email: 'second@example.com',
          username: 'taken_name',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'This username is already taken.',
      });
    });

    it('treats usernames as case-insensitive', async () => {
      await authenticationService.register({ ...validData, username: 'albert' });

      await expect(
        authenticationService.register({ ...validData, email: 'second@example.com', username: 'Albert' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'This username is already taken.' });
    });

    it('generates a username when the field is empty', async () => {
      const result = await authenticationService.register({ ...validData, username: '' });

      expect(result.user?.username).toMatch(/^[a-z0-9_]{3,30}$/);
    });

    it('lets only one of two simultaneous sign-ups claim the same username', async () => {
      await User.init(); // make sure the unique index exists in the in-memory database

      const results = await Promise.allSettled([
        authenticationService.register({ ...validData, email: 'one@example.com', username: 'race_name' }),
        authenticationService.register({ ...validData, email: 'two@example.com', username: 'race_name' }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected?.reason).toMatchObject({ statusCode: 409, message: 'This username is already taken.' });
      expect(await User.countDocuments({ username: 'race_name' })).toBe(1);
    });

    it('picks another generated username when two sign-ups generate the same one at once', async () => {
      await User.init();
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // both sign-ups generate the same candidate

      const results = await Promise.allSettled([
        authenticationService.register({ ...validData, email: 'gen1@example.com', username: undefined }),
        authenticationService.register({ ...validData, email: 'gen2@example.com', username: undefined }),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      const usernames = (await User.find({ email: /^gen/ })).map((u) => u.username);
      expect(new Set(usernames).size).toBe(2);
      vi.restoreAllMocks();
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

    it('signs the token with the current tokenVersion', async () => {
      const user = await createTestUser({ email: 'versioned@test.com', password: 'TestPass123' });
      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 2 } });

      const result = await authenticationService.login({
        email: 'versioned@test.com',
        password: 'TestPass123',
      });

      const decoded = jwt.verify(result.token!, process.env.JWT_SECRET!) as Record<string, unknown>;
      expect(decoded.tv).toBe(2);
    });

    it('does not return tokenVersion in the user payload', async () => {
      await createTestUser({ email: 'payload@test.com', password: 'TestPass123' });

      const result = await authenticationService.login({
        email: 'payload@test.com',
        password: 'TestPass123',
      });

      expect(result.user).not.toHaveProperty('tokenVersion');
    });

    it('logs in with mixed-case email', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });
      const result = await authenticationService.login({
        email: 'Login@Test.com',
        password: 'TestPass123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('logs in for legacy mixed-case stored email', async () => {
      await createTestUser({ email: 'legacy-login@test.com', password: 'TestPass123' });
      await User.collection.updateOne(
        { email: 'legacy-login@test.com' },
        { $set: { email: 'Legacy@Example.com' } },
      );

      const result = await authenticationService.login({
        email: 'legacy@example.com',
        password: 'TestPass123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('rejects wrong password', async () => {
      await createTestUser({ email: 'login@test.com', password: 'TestPass123' });
      await expect(
        authenticationService.login({
          email: 'login@test.com',
          password: 'WrongPass1',
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('rejects nonexistent email', async () => {
      await expect(
        authenticationService.login({
          email: 'ghost@test.com',
          password: 'TestPass123',
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });
  });

  describe('logout', () => {
    it('returns success', async () => {
      const result = await authenticationService.logout();
      expect(result.success).toBe(true);
    });
  });
});
