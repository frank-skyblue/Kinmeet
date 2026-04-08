import { describe, it, expect } from 'vitest';
import { blockService } from '../../services/blockService';
import { createTestUser } from '../helpers';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { Block } from '../../models/Block';

describe('blockService', () => {
  describe('blockUser', () => {
    it('creates a block record', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await blockService.blockUser(userA._id.toString(), userB._id.toString());

      const block = await Block.findOne({ blocker: userA._id, blocked: userB._id });
      expect(block).not.toBeNull();
    });

    it('removes existing connection when blocking', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });

      await blockService.blockUser(userA._id.toString(), userB._id.toString());

      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).toBeNull();
    });

    it('removes pending requests when blocking', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await ConnectionRequest.create({
        sender: userB._id,
        receiver: userA._id,
        status: 'pending',
      });

      await blockService.blockUser(userA._id.toString(), userB._id.toString());

      const req = await ConnectionRequest.findOne({
        $or: [
          { sender: userA._id, receiver: userB._id },
          { sender: userB._id, receiver: userA._id },
        ],
      });
      expect(req).toBeNull();
    });

    it('throws on duplicate block', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await blockService.blockUser(userA._id.toString(), userB._id.toString());
      await expect(
        blockService.blockUser(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('User already blocked');
    });

    it('throws when blocking self', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      await expect(
        blockService.blockUser(user._id.toString(), user._id.toString()),
      ).rejects.toThrow('Cannot block yourself');
    });
  });

  describe('unblockUser', () => {
    it('removes the block record', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await blockService.blockUser(userA._id.toString(), userB._id.toString());

      await blockService.unblockUser(userA._id.toString(), userB._id.toString());

      const block = await Block.findOne({ blocker: userA._id, blocked: userB._id });
      expect(block).toBeNull();
    });

    it('throws when block not found', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await expect(
        blockService.unblockUser(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Block not found');
    });
  });

  describe('getBlockedUsers', () => {
    it('returns blocked users list', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com', firstName: 'Blocked' });
      await blockService.blockUser(userA._id.toString(), userB._id.toString());

      const blocked = await blockService.getBlockedUsers(userA._id.toString());
      expect(blocked).toHaveLength(1);
    });

    it('returns empty when no blocks', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const blocked = await blockService.getBlockedUsers(user._id.toString());
      expect(blocked).toHaveLength(0);
    });
  });

  describe('reportUser', () => {
    it('creates a block with REPORT: prefix', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await blockService.reportUser(userA._id.toString(), userB._id.toString(), 'Spam');

      const block = await Block.findOne({ blocker: userA._id, blocked: userB._id });
      expect(block?.reason).toBe('REPORT: Spam');
    });

    it('removes connections and requests on report', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });

      await blockService.reportUser(userA._id.toString(), userB._id.toString(), 'Abusive');

      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).toBeNull();
    });

    it('throws when reporting self', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      await expect(
        blockService.reportUser(user._id.toString(), user._id.toString(), 'test'),
      ).rejects.toThrow('Cannot report yourself');
    });
  });
});
