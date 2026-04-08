import { describe, it, expect, vi } from 'vitest';
import * as profileService from '../../services/profileService';
import { createTestUser } from '../helpers';
import { User } from '../../models/User';
import { Connection } from '../../models/Connection';
import { ConnectionRequest } from '../../models/ConnectionRequest';
import { Message } from '../../models/Message';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImage: vi.fn().mockResolvedValue('https://cloudinary.com/test-photo.jpg'),
  destroyImage: vi.fn().mockResolvedValue(undefined),
}));

describe('profileService', () => {
  describe('getProfile', () => {
    it('returns the user without password', async () => {
      const user = await createTestUser({ email: 'me@test.com', firstName: 'Me' });
      const profile = await profileService.getProfile(user._id.toString());

      expect(profile.firstName).toBe('Me');
      expect((profile as any).password).toBeUndefined();
    });

    it('throws for nonexistent user', async () => {
      await expect(
        profileService.getProfile('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserProfile', () => {
    it('hides lastName for non-connected users', async () => {
      const requester = await createTestUser({ email: 'a@test.com' });
      const target = await createTestUser({ email: 'b@test.com', lastName: 'Secret' });

      const result = await profileService.getUserProfile(
        requester._id.toString(),
        target._id.toString(),
      );

      expect(result.isConnected).toBe(false);
      expect(result.user.lastName).toBeUndefined();
    });

    it('shows lastName for connected users', async () => {
      const requester = await createTestUser({ email: 'a@test.com' });
      const target = await createTestUser({ email: 'b@test.com', lastName: 'Visible' });
      await Connection.create({ user1: requester._id, user2: target._id });

      const result = await profileService.getUserProfile(
        requester._id.toString(),
        target._id.toString(),
      );

      expect(result.isConnected).toBe(true);
      expect(result.user.lastName).toBe('Visible');
    });
  });

  describe('updateProfile', () => {
    it('updates allowed fields', async () => {
      const user = await createTestUser({ email: 'me@test.com' });
      const updated = await profileService.updateProfile(user._id.toString(), {
        firstName: 'Updated',
        about: 'New bio',
      });

      expect(updated.firstName).toBe('Updated');
      expect(updated.about).toBe('New bio');
    });

    it('strips sensitive fields (email, password, _id)', async () => {
      const user = await createTestUser({ email: 'me@test.com' });
      const updated = await profileService.updateProfile(user._id.toString(), {
        email: 'hacked@test.com',
        password: 'hacked',
        firstName: 'Safe',
      });

      expect(updated.email).toBe('me@test.com');
      expect(updated.firstName).toBe('Safe');
    });
  });

  describe('deleteProfile', () => {
    it('deletes user and cascades to connections, requests, messages', async () => {
      const userA = await createTestUser({ email: 'a@test.com' });
      const userB = await createTestUser({ email: 'b@test.com' });

      await Connection.create({ user1: userA._id, user2: userB._id });
      await ConnectionRequest.create({
        sender: userA._id,
        receiver: userB._id,
        status: 'pending',
      });
      await Message.create({
        sender: userA._id,
        receiver: userB._id,
        content: 'Goodbye',
      });

      await profileService.deleteProfile(userA._id.toString());

      expect(await User.findById(userA._id)).toBeNull();
      expect(await Connection.countDocuments({})).toBe(0);
      expect(await ConnectionRequest.countDocuments({})).toBe(0);
      expect(await Message.countDocuments({})).toBe(0);
    });
  });

  describe('uploadPhoto', () => {
    it('uploads and saves photo URL', async () => {
      const user = await createTestUser({ email: 'photo@test.com' });
      const url = await profileService.uploadPhoto(user._id.toString(), Buffer.from('fake'));

      expect(url).toBe('https://cloudinary.com/test-photo.jpg');
      const updated = await User.findById(user._id);
      expect(updated?.photo).toBe('https://cloudinary.com/test-photo.jpg');
    });
  });

  describe('deletePhoto', () => {
    it('removes photo from user', async () => {
      const user = await createTestUser({ email: 'photo@test.com' });
      user.photo = 'https://cloudinary.com/old.jpg';
      await user.save();

      await profileService.deletePhoto(user._id.toString());
      const updated = await User.findById(user._id);
      expect(updated?.photo).toBeUndefined();
    });
  });
});
