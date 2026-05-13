import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { Connection } from '../../models/Connection';

const app = createTestApp();

describe('Connections Routes', () => {
  describe('GET /api/connections/requests', () => {
    it('returns pending requests', async () => {
      const sender = await createTestUser({ email: 'sender@test.com', firstName: 'Sender' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });
      const token = getAuthToken(receiver);

      const res = await request(app)
        .get('/api/connections/requests')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.requests).toHaveLength(1);
    });
  });

  describe('POST /api/connections/requests/:requestId/accept', () => {
    it('accepts a request and creates a connection', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const connReq = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });
      const token = getAuthToken(receiver);

      const res = await request(app)
        .post(`/api/connections/requests/${connReq._id}/accept`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const conn = await Connection.findOne({
        $or: [
          { user1: sender._id, user2: receiver._id },
          { user1: receiver._id, user2: sender._id },
        ],
      });
      expect(conn).not.toBeNull();
    });

    it('returns 400 for invalid requestId', async () => {
      const user = await createTestUser({ email: 'a@test.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/connections/requests/not-valid/accept')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/connections/requests/:requestId/ignore', () => {
    it('ignores a request', async () => {
      const sender = await createTestUser({ email: 'sender@test.com' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const connReq = await ConnectionRequest.create({
        sender: sender._id,
        receiver: receiver._id,
        status: 'pending',
      });
      const token = getAuthToken(receiver);

      const res = await request(app)
        .post(`/api/connections/requests/${connReq._id}/ignore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const updated = await ConnectionRequest.findById(connReq._id);
      expect(updated?.status).toBe('ignored');
    });
  });

  describe('GET /api/connections', () => {
    it('returns connected users', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com', firstName: 'Friend' });
      await Connection.create({ user1: userA._id, user2: userB._id });
      const token = getAuthToken(userA);

      const res = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connections).toHaveLength(1);
      expect(res.body.connections[0].firstName).toBe('Friend');
    });

    it('full flow: request → accept → appears in connections', async () => {
      const sender = await createTestUser({ email: 'sender@test.com', firstName: 'Sender' });
      const receiver = await createTestUser({ email: 'receiver@test.com' });
      const senderToken = getAuthToken(sender);
      const receiverToken = getAuthToken(receiver);

      const meetRes = await request(app)
        .post('/api/matching/meet')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({ receiverId: receiver._id.toString() });

      expect(meetRes.status).toBe(201);

      const requestsRes = await request(app)
        .get('/api/connections/requests')
        .set('Authorization', `Bearer ${receiverToken}`);

      const requestId = requestsRes.body.requests[0]._id;

      await request(app)
        .post(`/api/connections/requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${receiverToken}`);

      const connRes = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${receiverToken}`);

      expect(connRes.body.connections).toHaveLength(1);
      expect(connRes.body.connections[0].firstName).toBe('Sender');
    });
  });

  describe('DELETE /api/connections/:userId', () => {
    it('removes a connection with the other user', async () => {
      const userA = await createTestUser({ email: 'del-a@test.com' });
      const userB = await createTestUser({ email: 'del-b@test.com' });
      await Connection.create({ user1: userA._id, user2: userB._id });
      const token = getAuthToken(userA);

      const res = await request(app)
        .delete(`/api/connections/${userB._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const conn = await Connection.findOne({
        $or: [
          { user1: userA._id, user2: userB._id },
          { user1: userB._id, user2: userA._id },
        ],
      });
      expect(conn).toBeNull();
    });

    it('returns 404 when no connection exists', async () => {
      const userA = await createTestUser({ email: 'del-a2@test.com' });
      const userB = await createTestUser({ email: 'del-b2@test.com' });
      const token = getAuthToken(userA);

      const res = await request(app)
        .delete(`/api/connections/${userB._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
