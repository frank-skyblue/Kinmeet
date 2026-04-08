import { describe, it, expect } from 'vitest';
import { getMatches, sendMeetRequest } from '../../services/matchingService';
import { createTestUser } from '../helpers';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { Block } from '../../models/Block';

describe('matchingService', () => {
  describe('getMatches', () => {
    it('returns users from the same home and current country', async () => {
      const userA = await createTestUser({
        email: 'a@test.com',
        homeCountry: 'France',
        currentCountry: 'Canada',
      });
      const userB = await createTestUser({
        email: 'b@test.com',
        firstName: 'Marie',
        homeCountry: 'France',
        currentCountry: 'Canada',
      });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(1);
      expect(matches[0].firstName).toBe('Marie');
    });

    it('excludes users from different home country', async () => {
      const userA = await createTestUser({
        email: 'a@test.com',
        homeCountry: 'France',
        currentCountry: 'Canada',
      });
      await createTestUser({
        email: 'b@test.com',
        homeCountry: 'Germany',
        currentCountry: 'Canada',
      });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });

    it('excludes already connected users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });

    it('excludes users with pending requests', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await ConnectionRequest.create({
        sender: userA._id,
        receiver: userB._id,
        status: 'pending',
      });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });

    it('excludes blocked users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Block.create({ blocker: userA._id, blocked: userB._id });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });

    it('excludes self', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });

    it('excludes users with incomplete profiles', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({ email: 'b@test.com', profileComplete: false });

      const matches = await getMatches(userA._id.toString());
      expect(matches).toHaveLength(0);
    });
  });

  describe('sendMeetRequest', () => {
    it('creates a pending connection request', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      const request = await sendMeetRequest(userA._id.toString(), userB._id.toString());
      expect(request.status).toBe('pending');
      expect(request.sender.toString()).toBe(userA._id.toString());
      expect(request.receiver.toString()).toBe(userB._id.toString());
    });

    it('throws on duplicate request', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await sendMeetRequest(userA._id.toString(), userB._id.toString());
      await expect(
        sendMeetRequest(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Request already exists');
    });

    it('throws when already connected', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });

      await expect(
        sendMeetRequest(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Already connected');
    });

    it('throws when blocked', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Block.create({ blocker: userB._id, blocked: userA._id });

      await expect(
        sendMeetRequest(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Cannot send request');
    });

    it('throws when sending to self', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await expect(
        sendMeetRequest(userA._id.toString(), userA._id.toString()),
      ).rejects.toThrow('Cannot send request to yourself');
    });
  });
});
