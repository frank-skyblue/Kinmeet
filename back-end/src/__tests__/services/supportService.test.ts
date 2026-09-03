import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportService } from '../../services/supportService';
import { createTestUser } from '../helpers';
import { SupportRequest } from '../../models/SupportRequest';
import { destroyImageByPublicId, uploadImageAsset } from '../../services/cloudinaryService';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImageAsset: vi.fn().mockImplementation((_buffer: Buffer, options: { publicId: string }) =>
    Promise.resolve({
      url: `https://cloudinary.com/${options.publicId}.jpg`,
      publicId: `kinmeet-dev/support-screenshots/${options.publicId}`,
    }),
  ),
  destroyImageByPublicId: vi.fn().mockResolvedValue(undefined),
}));

describe('supportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitSupportRequest', () => {
    it('creates a support request without uploading when there are no screenshots', async () => {
      const user = await createTestUser({ email: 'support-service@example.com' });

      const result = await supportService.submitSupportRequest(user._id.toString(), {
        issueType: 'Other',
        subject: 'General question',
        message: 'How do I update my profile?',
        followUp: false,
      });

      const saved = await SupportRequest.findById(result.supportRequestId);
      expect(saved).not.toBeNull();
      expect(saved?.userId.toString()).toBe(user._id.toString());
      expect(saved?.email).toBe('support-service@example.com');
      expect(saved?.issueType).toBe('Other');
      expect(saved?.followUp).toBe(false);
      expect(saved?.screenshots).toEqual([]);
      expect(uploadImageAsset).not.toHaveBeenCalled();
    });

    it('uploads screenshots with unique publicIds under support-screenshots', async () => {
      const user = await createTestUser({ email: 'support-screenshot@example.com' });
      const userId = user._id.toString();

      const result = await supportService.submitSupportRequest(userId, {
        issueType: 'Safety concern',
        subject: 'Report issue',
        message: 'I need help with a safety concern.',
        followUp: true,
        screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
      });

      expect(uploadImageAsset).toHaveBeenCalledTimes(2);
      expect(uploadImageAsset).toHaveBeenCalledWith(
        Buffer.from('fake-image-1'),
        expect.objectContaining({ subfolder: 'support-screenshots' }),
      );

      const firstPublicId = vi.mocked(uploadImageAsset).mock.calls[0][1].publicId;
      const secondPublicId = vi.mocked(uploadImageAsset).mock.calls[1][1].publicId;
      expect(firstPublicId).toMatch(new RegExp(`^${userId}-[0-9a-f-]{36}$`, 'i'));
      expect(secondPublicId).toMatch(new RegExp(`^${userId}-[0-9a-f-]{36}$`, 'i'));
      expect(firstPublicId).not.toBe(secondPublicId);

      const saved = await SupportRequest.findById(result.supportRequestId);
      expect(saved?.followUp).toBe(true);
      expect(saved?.screenshots).toHaveLength(2);
    });

    it('cleans up earlier uploads when a later screenshot upload fails', async () => {
      vi.mocked(uploadImageAsset)
        .mockResolvedValueOnce({
          url: 'https://cloudinary.com/first.jpg',
          publicId: 'kinmeet-dev/support-screenshots/first',
        })
        .mockRejectedValueOnce(new Error('Unknown API key your_api_key'));

      const user = await createTestUser({ email: 'support-partial-upload@example.com' });

      await expect(
        supportService.submitSupportRequest(user._id.toString(), {
          issueType: 'Technical problem',
          subject: 'Partial upload',
          message: 'The second screenshot should fail.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
        }),
      ).rejects.toThrow(
        'Screenshot upload failed. Please try again later or submit without screenshots.',
      );

      expect(destroyImageByPublicId).toHaveBeenCalledTimes(1);
      expect(destroyImageByPublicId).toHaveBeenCalledWith('kinmeet-dev/support-screenshots/first');
      expect(await SupportRequest.findOne({ message: 'The second screenshot should fail.' })).toBeNull();
    });

    it('cleans up all uploads when MongoDB save fails', async () => {
      const user = await createTestUser({ email: 'support-save-failure@example.com' });
      const saveSpy = vi.spyOn(SupportRequest.prototype, 'save').mockRejectedValueOnce(
        new Error('Mongo write failed'),
      );

      await expect(
        supportService.submitSupportRequest(user._id.toString(), {
          issueType: 'Profile issue',
          subject: 'Save failure',
          message: 'The database save should fail.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
        }),
      ).rejects.toThrow('Mongo write failed');

      expect(destroyImageByPublicId).toHaveBeenCalledTimes(2);
      expect(await SupportRequest.findOne({ message: 'The database save should fail.' })).toBeNull();

      saveSpy.mockRestore();
    });

    it('throws when the authenticated user no longer exists', async () => {
      await expect(
        supportService.submitSupportRequest('507f1f77bcf86cd799439011', {
          issueType: 'Account issue',
          subject: 'Missing user',
          message: 'User was deleted.',
          followUp: false,
        }),
      ).rejects.toThrow('User not found');
    });
  });
});
