import { beforeEach, describe, expect, it, vi } from 'vitest';
import { feedbackService } from '../../services/feedbackService';
import { createTestUser } from '../helpers';
import { Feedback } from '../../models/Feedback';
import { destroyImageByPublicId, uploadImageAsset } from '../../services/cloudinaryService';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImageAsset: vi.fn().mockImplementation((_buffer: Buffer, options: { publicId: string }) =>
    Promise.resolve({
      url: `https://cloudinary.com/${options.publicId}.jpg`,
      publicId: `kinmeet-dev/feedback-screenshots/${options.publicId}`,
    }),
  ),
  destroyImageByPublicId: vi.fn().mockResolvedValue(undefined),
}));

describe('feedbackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('submitFeedback', () => {
    it('creates feedback without a screenshot', async () => {
      const user = await createTestUser({ email: 'feedback-service@example.com' });

      const result = await feedbackService.submitFeedback(user._id.toString(), {
        category: 'General App Experience',
        message: 'KinMeet feels welcoming.',
        followUp: false,
      });

      const feedback = await Feedback.findById(result.feedbackId);
      expect(feedback).not.toBeNull();
      expect(feedback?.userId.toString()).toBe(user._id.toString());
      expect(feedback?.category).toBe('General App Experience');
      expect(feedback?.message).toBe('KinMeet feels welcoming.');
      expect(feedback?.followUp).toBe(false);
      expect(feedback?.status).toBe('new');
      expect(feedback?.screenshots).toEqual([]);
      expect(uploadImageAsset).not.toHaveBeenCalled();
    });

    it('uploads and stores screenshot URLs and publicIds', async () => {
      const user = await createTestUser({ email: 'feedback-screenshot@example.com' });
      const userId = user._id.toString();

      const result = await feedbackService.submitFeedback(userId, {
        category: 'Bug or Technical Issue',
        message: 'The page flickered after refresh.',
        followUp: true,
        screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
      });

      expect(uploadImageAsset).toHaveBeenCalledTimes(2);
      expect(uploadImageAsset).toHaveBeenCalledWith(
        Buffer.from('fake-image-1'),
        expect.objectContaining({ subfolder: 'feedback-screenshots' }),
      );

      const feedback = await Feedback.findById(result.feedbackId);
      expect(feedback?.followUp).toBe(true);
      expect(feedback?.screenshots).toHaveLength(2);
      expect(feedback?.screenshots[0]).toEqual(expect.objectContaining({
        url: expect.stringContaining(userId),
        publicId: expect.stringContaining(`kinmeet-dev/feedback-screenshots/${userId}`),
      }));
      expect(feedback?.screenshots[1]).toEqual(expect.objectContaining({
        url: expect.stringContaining(userId),
        publicId: expect.stringContaining(`kinmeet-dev/feedback-screenshots/${userId}`),
      }));
    });

    it('cleans up earlier uploads when a later screenshot upload fails', async () => {
      vi.mocked(uploadImageAsset)
        .mockResolvedValueOnce({
          url: 'https://cloudinary.com/first.jpg',
          publicId: 'kinmeet-dev/feedback-screenshots/first',
        })
        .mockRejectedValueOnce(new Error('Unknown API key your_api_key'));

      const user = await createTestUser({ email: 'feedback-partial-upload@example.com' });

      await expect(
        feedbackService.submitFeedback(user._id.toString(), {
          category: 'Bug or Technical Issue',
          message: 'The second screenshot should fail.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
        }),
      ).rejects.toThrow(
        'Screenshot upload failed. Please try again later or submit without screenshots.',
      );

      expect(destroyImageByPublicId).toHaveBeenCalledTimes(1);
      expect(destroyImageByPublicId).toHaveBeenCalledWith('kinmeet-dev/feedback-screenshots/first');
      expect(await Feedback.findOne({ message: 'The second screenshot should fail.' })).toBeNull();
    });

    it('throws a friendly error when screenshot upload fails', async () => {
      vi.mocked(uploadImageAsset).mockRejectedValueOnce(new Error('Unknown API key your_api_key'));
      const user = await createTestUser({ email: 'feedback-upload-failure@example.com' });

      await expect(
        feedbackService.submitFeedback(user._id.toString(), {
          category: 'Bug or Technical Issue',
          message: 'The screenshot upload should fail.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image')],
        }),
      ).rejects.toThrow(
        'Screenshot upload failed. Please try again later or submit without screenshots.',
      );

      expect(destroyImageByPublicId).not.toHaveBeenCalled();
    });

    it('cleans up all uploads when MongoDB save fails', async () => {
      const user = await createTestUser({ email: 'feedback-save-failure@example.com' });
      const saveSpy = vi.spyOn(Feedback.prototype, 'save').mockRejectedValueOnce(
        new Error('Mongo write failed'),
      );

      await expect(
        feedbackService.submitFeedback(user._id.toString(), {
          category: 'Bug or Technical Issue',
          message: 'The database save should fail.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
        }),
      ).rejects.toThrow('Mongo write failed');

      expect(destroyImageByPublicId).toHaveBeenCalledTimes(2);
      expect(destroyImageByPublicId).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('kinmeet-dev/feedback-screenshots/'),
      );
      expect(destroyImageByPublicId).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('kinmeet-dev/feedback-screenshots/'),
      );
      expect(await Feedback.findOne({ message: 'The database save should fail.' })).toBeNull();

      saveSpy.mockRestore();
    });

    it('keeps the original error when Cloudinary cleanup fails', async () => {
      vi.mocked(uploadImageAsset)
        .mockResolvedValueOnce({
          url: 'https://cloudinary.com/first.jpg',
          publicId: 'kinmeet-dev/feedback-screenshots/first',
        })
        .mockRejectedValueOnce(new Error('upload boom'));
      vi.mocked(destroyImageByPublicId).mockRejectedValueOnce(new Error('cleanup boom'));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const user = await createTestUser({ email: 'feedback-cleanup-failure@example.com' });

      await expect(
        feedbackService.submitFeedback(user._id.toString(), {
          category: 'Bug or Technical Issue',
          message: 'Cleanup should not mask the upload error.',
          followUp: false,
          screenshotBuffers: [Buffer.from('fake-image-1'), Buffer.from('fake-image-2')],
        }),
      ).rejects.toThrow(
        'Screenshot upload failed. Please try again later or submit without screenshots.',
      );

      expect(destroyImageByPublicId).toHaveBeenCalledWith('kinmeet-dev/feedback-screenshots/first');
      expect(errorSpy).toHaveBeenCalledWith(
        '[feedbackService] Failed to clean up screenshot kinmeet-dev/feedback-screenshots/first:',
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });

    it('throws when the authenticated user no longer exists', async () => {
      await expect(
        feedbackService.submitFeedback('507f1f77bcf86cd799439011', {
          category: 'Feature Suggestion',
          message: 'Please add more filters.',
          followUp: false,
        }),
      ).rejects.toThrow('User not found');
    });
  });
});
