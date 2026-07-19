import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { Feedback } from '../../models/Feedback';
import { uploadImageAsset } from '../../services/cloudinaryService';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImageAsset: vi.fn().mockImplementation((_buffer: Buffer, options: { publicId: string }) =>
    Promise.resolve({
      url: 'https://cloudinary.com/feedback-route.jpg',
      publicId: `kinmeet-dev/feedback-screenshots/${options.publicId}`,
    }),
  ),
  destroyImageByPublicId: vi.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

describe('Feedback Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/feedback', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).post('/api/feedback').send({
        category: 'General App Experience',
        message: 'Nice app.',
      });

      expect(res.status).toBe(401);
    });

    it('accepts valid feedback without a screenshot', async () => {
      const user = await createTestUser({ email: 'feedback-route@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'General App Experience',
          message: 'I like the clean design.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.feedbackId).toBeTruthy();

      const feedback = await Feedback.findById(res.body.feedbackId);
      expect(feedback?.userId.toString()).toBe(user._id.toString());
      expect(feedback?.followUp).toBe(false);
      expect(feedback?.message).toBe('I like the clean design.');
      expect(feedback?.screenshots).toEqual([]);
    });

    it('accepts followUp true from multipart form data', async () => {
      const user = await createTestUser({ email: 'feedback-followup@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Feature Suggestion')
        .field('message', 'Please add saved filters.')
        .field('followUp', 'true');

      expect(res.status).toBe(201);
      const feedback = await Feedback.findById(res.body.feedbackId);
      expect(feedback?.followUp).toBe(true);
    });

    it('uploads optional screenshots', async () => {
      const user = await createTestUser({ email: 'feedback-upload@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Bug or Technical Issue')
        .field('message', 'The menu overlaps on mobile.')
        .attach('screenshots', Buffer.from('fake-image-1'), {
          filename: 'screenshot-1.png',
          contentType: 'image/png',
        })
        .attach('screenshots', Buffer.from('fake-image-2'), {
          filename: 'screenshot-2.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(201);
      expect(uploadImageAsset).toHaveBeenCalledTimes(2);

      const feedback = await Feedback.findById(res.body.feedbackId);
      expect(feedback?.screenshots).toEqual([
        expect.objectContaining({
          url: 'https://cloudinary.com/feedback-route.jpg',
          publicId: expect.stringContaining('kinmeet-dev/feedback-screenshots/'),
        }),
        expect.objectContaining({
          url: 'https://cloudinary.com/feedback-route.jpg',
          publicId: expect.stringContaining('kinmeet-dev/feedback-screenshots/'),
        }),
      ]);
    });

    it('returns a friendly error when screenshot upload fails', async () => {
      vi.mocked(uploadImageAsset).mockRejectedValueOnce(new Error('Unknown API key your_api_key'));
      const user = await createTestUser({ email: 'feedback-upload-failure-route@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Bug or Technical Issue')
        .field('message', 'The screenshot upload should fail.')
        .attach('screenshots', Buffer.from('fake-image'), {
          filename: 'screenshot.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(502);
      expect(res.body.message).toBe('Screenshot upload failed. Please try again later or submit without screenshots.');
      expect(await Feedback.findOne({ message: 'The screenshot upload should fail.' })).toBeNull();
    });

    it('rejects missing message', async () => {
      const user = await createTestUser({ email: 'feedback-missing@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'Messaging Feedback' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/message/i);
    });

    it('rejects invalid category', async () => {
      const user = await createTestUser({ email: 'feedback-invalid-category@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({
          category: 'Other',
          message: 'This should not pass.',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid screenshot type', async () => {
      const user = await createTestUser({ email: 'feedback-invalid-file@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Bug or Technical Issue')
        .field('message', 'This file is not an image.')
        .attach('screenshots', Buffer.from('not-image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Only JPEG, PNG, WebP, and GIF images are allowed');
    });

    it('rejects oversized screenshots', async () => {
      const user = await createTestUser({ email: 'feedback-large-file@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Bug or Technical Issue')
        .field('message', 'This file is too large.')
        .attach('screenshots', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'large.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Image must be under 5 MB');
    });

    it('rejects more than three screenshots', async () => {
      const user = await createTestUser({ email: 'feedback-too-many-files@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .field('category', 'Bug or Technical Issue')
        .field('message', 'Too many files.')
        .attach('screenshots', Buffer.from('one'), {
          filename: 'one.png',
          contentType: 'image/png',
        })
        .attach('screenshots', Buffer.from('two'), {
          filename: 'two.png',
          contentType: 'image/png',
        })
        .attach('screenshots', Buffer.from('three'), {
          filename: 'three.png',
          contentType: 'image/png',
        })
        .attach('screenshots', Buffer.from('four'), {
          filename: 'four.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Up to 3 screenshots are allowed');
    });
  });
});
