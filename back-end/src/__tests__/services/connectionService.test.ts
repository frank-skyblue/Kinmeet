import { describe, it, expect } from 'vitest';
import {
  getConnectionRequests,
  acceptConnectionRequest,
  ignoreConnectionRequest,
  getConnections,
  removeConnection,
} from '../../services/connectionService';
import { createTestUser } from '../helpers';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';

describe('connectionService', () => {
  describe('getConnectionRequests', () => {
    it('returns pending requests for the receiver', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const requests = await getConnectionRequests(receiver._id.toString());
      expect(requests).toHaveLength(1);
    });

    it('does not return ignored requests', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'ignored',
      });

      const requests = await getConnectionRequests(receiver._id.toString());
      expect(requests).toHaveLength(0);
    });
  });

  describe('acceptConnectionRequest', () => {
    it('creates a Connection and marks request as accepted', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const req = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const connection = await acceptConnectionRequest(
        receiver._id.toString(),
        req._id.toString(),
      );

      expect(connection).toBeDefined();
      const updated = await ConnectionRequest.findById(req._id);
      expect(updated?.status).toBe('accepted');

      const connDoc = await Connection.findOne({
        $or: [
          { user1: sender._id, user2: receiver._id },
          { user1: receiver._id, user2: sender._id },
        ],
      });
      expect(connDoc).not.toBeNull();
    });

    it('throws if request not found', async () => {
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      await expect(
        acceptConnectionRequest(receiver._id.toString(), '507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Request not found');
    });

    it('throws if not the receiver', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const req = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });

      await expect(
        acceptConnectionRequest(sender._id.toString(), req._id.toString()),
      ).rejects.toThrow('Not authorized');
    });

    it('throws if request already processed', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const req = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'accepted',
      });

      await expect(
        acceptConnectionRequest(receiver._id.toString(), req._id.toString()),
      ).rejects.toThrow('Request already processed');
    });
  });

  describe('ignoreConnectionRequest', () => {
    it('marks request as ignored', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const req = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });

      await ignoreConnectionRequest(receiver._id.toString(), req._id.toString());
      const updated = await ConnectionRequest.findById(req._id);
      expect(updated?.status).toBe('ignored');
    });
  });

  describe('getConnections', () => {
    it('returns connected user profiles', async () => {
      const userA = await createTestUser({ email: 'a@test.com', firstName: 'Alice' });
      const userB = await createTestUser({ email: 'b@test.com', firstName: 'Bob' });
      await Connection.create({ user1: userA._id, user2: userB._id });

      const connections = await getConnections(userA._id.toString());
      expect(connections).toHaveLength(1);
      expect(connections[0].firstName).toBe('Bob');
    });

    it('returns empty array when no connections', async () => {
      const user = await createTestUser({ email: 'alone@test.com' });
      const connections = await getConnections(user._id.toString());
      expect(connections).toHaveLength(0);
    });
  });

  describe('removeConnection', () => {
    it('removes the connection and related connection requests', async () => {
      const userA = await createTestUser({ email: 'a-remove@test.com' });
      const userB = await createTestUser({ email: 'b-remove@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });
      await ConnectionRequest.create({
        sender: userA._id,
        receiver: userB._id,
        status: 'accepted',
      });

      await removeConnection(userA._id.toString(), userB._id.toString());

      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).toBeNull();
      const reqs = await ConnectionRequest.find({
        $or: [
          { sender: userA._id, receiver: userB._id },
          { sender: userB._id, receiver: userA._id },
        ],
      });
      expect(reqs).toHaveLength(0);
    });

    it('throws if not connected', async () => {
      const userA = await createTestUser({ email: 'a-noconn@test.com' });
      const userB = await createTestUser({ email: 'b-noconn@test.com' });

      await expect(
        removeConnection(userA._id.toString(), userB._id.toString()),
      ).rejects.toThrow('Connection not found');
    });

    it('throws if other user does not exist', async () => {
      const userA = await createTestUser({ email: 'a-missing@test.com' });

      await expect(
        removeConnection(userA._id.toString(), '507f1f77bcf86cd799439099'),
      ).rejects.toThrow('User not found');
    });

    it('throws if removing connection with yourself', async () => {
      const userA = await createTestUser({ email: 'a-self@test.com' });

      await expect(
        removeConnection(userA._id.toString(), userA._id.toString()),
      ).rejects.toThrow('Cannot remove connection with yourself');
    });
  });
});
