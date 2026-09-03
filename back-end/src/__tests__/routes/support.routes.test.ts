import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { SupportRequest } from '../../models/SupportRequest';
import { uploadImageAsset } from '../../services/cloudinaryService';

vi.mock('../../services/cloudinaryService', () => ({
  uploadImageAsset: vi.fn().mockImplementation((_buffer: Buffer, options: { publicId: string }) =>
    Promise.resolve({
      url: 'https://cloudinary.com/support-route.jpg',
      publicId: `kinmeet-dev/support-screenshots/${options.publicId}`,
    }),
  ),
  destroyImageByPublicId: vi.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

describe('Support Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/support', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).post('/api/support').send({
        issueType: 'Other',
        subject: 'Help',
        message: 'Need assistance.',
      });

      expect(res.status).toBe(401);
    });

    it('creates a support request using the authenticated user email', async () => {
      const user = await createTestUser({ email: 'support-route@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Technical problem')
        .field('subject', 'App crash')
        .field('message', 'The discover page crashed.')
        .field('email', 'forged@example.com');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.supportRequestId).toBeTruthy();

      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.userId.toString()).toBe(user._id.toString());
      expect(saved?.email).toBe('support-route@example.com');
      expect(saved?.issueType).toBe('Technical problem');
      expect(saved?.subject).toBe('App crash');
      expect(saved?.message).toBe('The discover page crashed.');
      expect(saved?.followUp).toBe(false);
      expect(saved?.screenshots).toEqual([]);
    });

    it('accepts followUp true from multipart form data', async () => {
      const user = await createTestUser({ email: 'support-followup@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Account issue')
        .field('subject', 'Account locked')
        .field('message', 'Please unlock my account.')
        .field('followUp', 'true');

      expect(res.status).toBe(201);
      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.followUp).toBe(true);
    });

    it('uploads optional screenshots', async () => {
      const user = await createTestUser({ email: 'support-upload@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Account issue')
        .field('subject', 'Cannot update email')
        .field('message', 'Email settings fail to save.')
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

      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.screenshots).toHaveLength(2);
    });

    it('returns a friendly error when screenshot upload fails', async () => {
      vi.mocked(uploadImageAsset).mockRejectedValueOnce(new Error('Unknown API key your_api_key'));
      const user = await createTestUser({ email: 'support-upload-failure@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Technical problem')
        .field('subject', 'Upload failure')
        .field('message', 'The screenshot upload should fail.')
        .attach('screenshots', Buffer.from('fake-image'), {
          filename: 'screenshot.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(502);
      expect(res.body.message).toBe(
        'Screenshot upload failed. Please try again later or submit without screenshots.',
      );
      expect(await SupportRequest.findOne({ message: 'The screenshot upload should fail.' })).toBeNull();
    });

    it('accepts a request without a subject', async () => {
      const user = await createTestUser({ email: 'support-no-subject@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issueType: 'Other',
          message: 'Need assistance without a subject.',
        });

      expect(res.status).toBe(201);
      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.subject).toBeUndefined();
      expect(saved?.email).toBe('support-no-subject@example.com');
      expect(saved?.followUp).toBe(false);
    });

    it('treats blank and whitespace-only subjects as omitted', async () => {
      const user = await createTestUser({ email: 'support-blank-subject@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Other')
        .field('subject', '   ')
        .field('message', 'Whitespace subject should be omitted.');

      expect(res.status).toBe(201);
      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.subject).toBeUndefined();
    });

    it('trims a provided subject', async () => {
      const user = await createTestUser({ email: 'support-trim-subject@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issueType: 'Other',
          subject: '  Need help  ',
          message: 'Please trim the subject.',
        });

      expect(res.status).toBe(201);
      const saved = await SupportRequest.findById(res.body.supportRequestId);
      expect(saved?.subject).toBe('Need help');
    });

    it('rejects a subject longer than 100 characters', async () => {
      const user = await createTestUser({ email: 'support-long-subject@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issueType: 'Other',
          subject: 'a'.repeat(101),
          message: 'This subject is too long.',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/subject/i);
    });

    it('rejects missing message', async () => {
      const user = await createTestUser({ email: 'support-missing@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .send({ issueType: 'Other' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/message/i);
    });

    it('rejects invalid issue type', async () => {
      const user = await createTestUser({ email: 'support-invalid-type@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issueType: 'Not a real type',
          subject: 'Invalid',
          message: 'This should not pass.',
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid screenshot type', async () => {
      const user = await createTestUser({ email: 'support-invalid-file@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Technical problem')
        .field('subject', 'Bad file')
        .field('message', 'This file is not an image.')
        .attach('screenshots', Buffer.from('not-image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Only JPEG, PNG, WebP, and GIF images are allowed');
    });

    it('rejects oversized screenshots', async () => {
      const user = await createTestUser({ email: 'support-large-file@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Technical problem')
        .field('subject', 'Large file')
        .field('message', 'This file is too large.')
        .attach('screenshots', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'large.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Image must be under 5 MB');
    });

    it('rejects more than three screenshots', async () => {
      const user = await createTestUser({ email: 'support-too-many-files@example.com' });
      const token = getAuthToken(user);

      const res = await request(app)
        .post('/api/support')
        .set('Authorization', `Bearer ${token}`)
        .field('issueType', 'Technical problem')
        .field('subject', 'Too many')
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
