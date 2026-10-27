import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { User } from '../../models/User';
import { DeviceSubscription, WEB_PUSH_CHANNEL } from '../../models/DeviceSubscription';
import { NO_PUSH_DEVICE_MESSAGE } from '../../services/notificationPreferencesService';

const app = createTestApp();

const patch = (token: string, body: unknown) =>
  request(app)
    .patch('/api/notifications/preferences')
    .set('Authorization', `Bearer ${token}`)
    .send(body as object);

const storedPreferences = async (userId: unknown) => {
  const user = await User.findById(userId).select('notificationPreferences').lean();
  return user!.notificationPreferences.newPeopleNearby;
};

describe('Notification preferences routes', () => {
  describe('GET /api/notifications/preferences', () => {
    it('starts with both channels off', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${getAuthToken(user)}`);

      expect(res.status).toBe(200);
      expect(res.body.preferences).toEqual({ newPeopleNearby: { email: false, push: false } });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications/preferences');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/preferences', () => {
    it('turns email on, saves it, and records when alerts started', async () => {
      const user = await createTestUser();
      const before = Date.now();

      const res = await patch(getAuthToken(user), { newPeopleNearby: { email: true } });

      expect(res.status).toBe(200);
      expect(res.body.preferences).toEqual({ newPeopleNearby: { email: true, push: false } });
      const stored = await storedPreferences(user._id);
      expect(stored.email).toBe(true);
      expect(stored.since!.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('changes only the channel sent, leaving the other as saved', async () => {
      const user = await createTestUser();
      await DeviceSubscription.create({ userId: user._id, channel: WEB_PUSH_CHANNEL, token: 't1' });
      const token = getAuthToken(user);
      await patch(token, { newPeopleNearby: { push: true } });

      const res = await patch(token, { newPeopleNearby: { email: true } });

      expect(res.body.preferences).toEqual({ newPeopleNearby: { email: true, push: true } });
    });

    it('keeps the original start time when a second channel is turned on', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);
      await patch(token, { newPeopleNearby: { email: true } });
      const firstSince = (await storedPreferences(user._id)).since!.getTime();

      await DeviceSubscription.create({ userId: user._id, channel: WEB_PUSH_CHANNEL, token: 't1' });
      await patch(token, { newPeopleNearby: { push: true } });

      expect((await storedPreferences(user._id)).since!.getTime()).toBe(firstSince);
    });

    it('turning both off stops alerts', async () => {
      const user = await createTestUser();
      const token = getAuthToken(user);
      await patch(token, { newPeopleNearby: { email: true } });

      const res = await patch(token, { newPeopleNearby: { email: false } });

      expect(res.body.preferences).toEqual({ newPeopleNearby: { email: false, push: false } });
    });

    it('refuses push when no device can receive it', async () => {
      const user = await createTestUser();

      const res = await patch(getAuthToken(user), { newPeopleNearby: { push: true } });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(NO_PUSH_DEVICE_MESSAGE);
      expect((await storedPreferences(user._id)).push).toBe(false);
    });

    it('allows turning push off without a device', async () => {
      const user = await createTestUser();

      const res = await patch(getAuthToken(user), { newPeopleNearby: { push: false } });

      expect(res.status).toBe(200);
    });

    it.each([
      [{}],
      [{ newPeopleNearby: {} }],
      [{ newPeopleNearby: { email: 'yes' } }],
      [{ newPeopleNearby: { sms: true } }],
      [{ newPeopleNearby: { email: true }, other: true }],
    ])('returns 400 for %j', async (body) => {
      const user = await createTestUser();

      const res = await patch(getAuthToken(user), body);

      expect(res.status).toBe(400);
    });

    it('preferences persist and are not shown on profiles viewed by others', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const viewer = await createTestUser({ email: 'b@test.com' });
      await patch(getAuthToken(user), { newPeopleNearby: { email: true } });

      const profile = await request(app)
        .get(`/api/profile/${user._id.toString()}`)
        .set('Authorization', `Bearer ${getAuthToken(viewer)}`);

      expect(profile.status).toBe(200);
      expect(JSON.stringify(profile.body)).not.toContain('notificationPreferences');
    });
  });
});
