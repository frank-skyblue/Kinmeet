import { describe, it, expect } from 'vitest';
import { getDiscoverEmptyState, getMatches, sendMeetRequest } from '../../services/matchingService';
import { createTestUser } from '../helpers';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { Block } from '../../models/Block';
import { DiscoverPass } from '../../models/DiscoverPass';
import { User } from '../../models/User';

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

  describe('getMatches with passes', () => {
    it('excludes people the user passed on, but not people who passed on the user', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com', firstName: 'Passed' });
      const userC = await createTestUser({ email: 'c@test.com', firstName: 'PassedOnA' });
      await DiscoverPass.create({ viewer: userA._id, viewed: userB._id });
      await DiscoverPass.create({ viewer: userC._id, viewed: userA._id });

      const matches = await getMatches(userA._id.toString());
      expect(matches.map((m) => m.firstName)).toEqual(['PassedOnA']);
    });

    it('does not expose alert settings or join time of other users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({ email: 'b@test.com' });

      const [match] = await getMatches(userA._id.toString());
      const json = match.toObject() as unknown as Record<string, unknown>;
      expect(json.notificationPreferences).toBeUndefined();
      expect(json.lastNewPeopleAlertAt).toBeUndefined();
      expect(json.groupJoinedAt).toBeUndefined();
    });
  });

  describe('getDiscoverEmptyState', () => {
    it('is community_growing when no one else shares both countries', async () => {
      const userA = await createTestUser({ email: 'a@test.com', homeCountry: 'Ukraine' });
      await createTestUser({ email: 'b@test.com', homeCountry: 'Ukraine', currentCountry: 'Poland' });
      await createTestUser({ email: 'c@test.com', homeCountry: 'Vietnam' });

      expect(await getDiscoverEmptyState(userA._id.toString())).toBe('community_growing');
    });

    it('is all_caught_up when the group has people the user has already seen', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const passed = await createTestUser({ email: 'b@test.com' });
      const connected = await createTestUser({ email: 'c@test.com' });
      await DiscoverPass.create({ viewer: userA._id, viewed: passed._id });
      await Connection.create({ user1: connected._id, user2: userA._id });

      expect(await getMatches(userA._id.toString())).toHaveLength(0);
      expect(await getDiscoverEmptyState(userA._id.toString())).toBe('all_caught_up');
    });

    it('treats blocked and deactivated people as absent from the group', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const blockedByA = await createTestUser({ email: 'b@test.com' });
      const blockedA = await createTestUser({ email: 'c@test.com' });
      const deactivated = await createTestUser({ email: 'd@test.com' });
      await Block.create({ blocker: userA._id, blocked: blockedByA._id });
      await Block.create({ blocker: blockedA._id, blocked: userA._id });
      await User.updateOne({ _id: deactivated._id }, { accountStatus: 'deactivated' });

      expect(await getDiscoverEmptyState(userA._id.toString())).toBe('community_growing');
    });

    it('ignores incomplete profiles', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      await createTestUser({ email: 'b@test.com', profileComplete: false });

      expect(await getDiscoverEmptyState(userA._id.toString())).toBe('community_growing');
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
