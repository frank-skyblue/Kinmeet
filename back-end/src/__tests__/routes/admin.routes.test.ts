import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp, createTestUser, getAuthToken } from '../helpers';
import { ADMIN_COOKIE_NAME } from '../../controllers/adminController';
import { Feedback } from '../../models/Feedback';
import { Report } from '../../models/Report';
import { JWT_SECRET, resolveAdminPassKey } from '../../config/env';
import { adminLoginSchema } from '../../middleware/schemas';

const ADMIN_JWT_TYP = 'kinmeet-admin+jwt';
const ADMIN_REQUEST_HEADER = 'X-KinMeet-Admin-Request';
const ADMIN_REQUEST_HEADER_VALUE = '1';

const TRUSTED_ORIGIN = 'http://localhost:5173';
const ADMIN_PASSWORD = process.env.ADMIN_PASS_KEY!;

const adminHeaders = {
  Origin: TRUSTED_ORIGIN,
  [ADMIN_REQUEST_HEADER]: ADMIN_REQUEST_HEADER_VALUE,
};

const cookieHeader = (res: request.Response): string[] => {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
};

const sessionCookie = (res: request.Response): string => {
  const match = cookieHeader(res).find((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`));
  expect(match).toBeDefined();
  return match!.split(';')[0];
};

const cookieSecurityAttrs = (setCookie: string) => ({
  httpOnly: /(?:^|;)\s*HttpOnly(?:;|$)/i.test(setCookie),
  path: /(?:^|;)\s*Path=\/api\/admin(?:;|$)/i.test(setCookie),
  sameSite: /(?:^|;)\s*SameSite=([^;]+)/i.exec(setCookie)?.[1]?.trim().toLowerCase() ?? '',
  secure: /(?:^|;)\s*Secure(?:;|$)/i.test(setCookie),
});

describe('Admin Routes', () => {
  const app = createTestApp();

  it('rejects missing, short and blank configuration while preserving the exact password', () => {
    for (const value of [undefined, ADMIN_PASSWORD.slice(0, 14), ' '.repeat(15)]) {
      expect(() => resolveAdminPassKey(value)).toThrow('ADMIN_PASS_KEY must be at least 15 characters and must not be blank.');
    }
    const password = ` ${ADMIN_PASSWORD} `;
    expect(resolveAdminPassKey(ADMIN_PASSWORD.slice(0, 15))).toBe(ADMIN_PASSWORD.slice(0, 15));
    expect(resolveAdminPassKey(password)).toBe(password);
    expect(adminLoginSchema.parse({ password }).password).toBe(password);
  });

  it('allows CORS preflight for trusted Origin, Content-Type, and the admin request header', async () => {
    const res = await request(app)
      .options('/api/admin/login')
      .set('Origin', TRUSTED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,X-KinMeet-Admin-Request');

    expect([200, 204]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBe(TRUSTED_ORIGIN);
    const allowHeaders = String(res.headers['access-control-allow-headers'] ?? '').toLowerCase();
    expect(allowHeaders).toContain('content-type');
    expect(allowHeaders).toContain('x-kinmeet-admin-request');
  });

  describe('POST /api/admin/login', () => {
    it('sets an HttpOnly admin cookie and does not return a token', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Admin login successful',
      });
      expect(res.body.token).toBeUndefined();
      expect(res.headers['cache-control']).toBe('no-store');

      const cookie = cookieHeader(res).find((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`));
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Path=\/api\/admin/i);
      expect(cookie).toMatch(/Max-Age=1800/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).not.toMatch(/Secure/i);
      expect(cookie).not.toMatch(/Domain=/i);
    });

    it('returns 401 for an incorrect password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: 'incorrect-password' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Invalid credentials' });
      expect(res.headers['cache-control']).toBe('no-store');
      expect(cookieHeader(res).some((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`))).toBe(false);
    });

    it('returns 400 for an empty password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('returns 403 without a trusted Origin or admin request header', async () => {
      const missingOrigin = await request(app)
        .post('/api/admin/login')
        .set(ADMIN_REQUEST_HEADER, ADMIN_REQUEST_HEADER_VALUE)
        .send({ password: ADMIN_PASSWORD });
      expect(missingOrigin.status).toBe(403);
      expect(missingOrigin.body).toEqual({ success: false, message: 'Invalid admin request origin' });
      expect(missingOrigin.headers['cache-control']).toBe('no-store');

      const untrustedOrigin = await request(app)
        .post('/api/admin/login')
        .set('Origin', 'https://evil.example')
        .set(ADMIN_REQUEST_HEADER, ADMIN_REQUEST_HEADER_VALUE)
        .send({ password: ADMIN_PASSWORD });
      expect(untrustedOrigin.status).toBe(403);

      const missingHeader = await request(app)
        .post('/api/admin/login')
        .set('Origin', TRUSTED_ORIGIN)
        .send({ password: ADMIN_PASSWORD });
      expect(missingHeader.status).toBe(403);
    });
  });

  describe('GET /api/admin/session', () => {
    it('returns authenticated true for a valid admin cookie', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });

      const res = await request(app)
        .get('/api/admin/session')
        .set('Cookie', sessionCookie(loginRes));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, authenticated: true });
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('returns 401 without a cookie, with a user JWT, or with invalid admin claims', async () => {
      const missing = await request(app).get('/api/admin/session');
      expect(missing.status).toBe(401);
      expect(missing.body).toEqual({ success: false, message: 'Admin authentication required' });
      expect(missing.headers['cache-control']).toBe('no-store');

      const tampered = await request(app)
        .get('/api/admin/session')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=invalid.signature`);
      expect(tampered.status).toBe(401);

      const user = await createTestUser({ email: 'admin-user-jwt@example.com' });
      const userJwt = getAuthToken(user);
      const userCookie = await request(app)
        .get('/api/admin/session')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${userJwt}`);
      expect(userCookie.status).toBe(401);

      const wrongTyp = jwt.sign(
        { scope: 'admin' },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          expiresIn: '30m',
          issuer: 'kinmeet-admin',
          audience: 'kinmeet-admin-api',
          subject: 'shared-admin',
        },
      );
      const wrongTypRes = await request(app)
        .get('/api/admin/session')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${wrongTyp}`);
      expect(wrongTypRes.status).toBe(401);

      const expired = jwt.sign(
        { scope: 'admin' },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          expiresIn: '-1s',
          issuer: 'kinmeet-admin',
          audience: 'kinmeet-admin-api',
          subject: 'shared-admin',
          header: { alg: 'HS256', typ: ADMIN_JWT_TYP },
        },
      );
      const expiredRes = await request(app)
        .get('/api/admin/session')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${expired}`);
      expect(expiredRes.status).toBe(401);
    });
  });

  describe('POST /api/admin/logout', () => {
    it('clears the admin cookie', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });

      const res = await request(app)
        .post('/api/admin/logout')
        .set(adminHeaders)
        .set('Cookie', sessionCookie(loginRes));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Admin logout successful' });
      expect(res.headers['cache-control']).toBe('no-store');

      const loginCookie = cookieHeader(loginRes).find((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`));
      const cleared = cookieHeader(res).find((value) => value.startsWith(`${ADMIN_COOKIE_NAME}=`));
      expect(loginCookie).toBeDefined();
      expect(cleared).toBeDefined();
      expect(cleared).toMatch(/Max-Age=0|Expires=/i);
      expect(cookieSecurityAttrs(cleared!)).toEqual(cookieSecurityAttrs(loginCookie!));
    });

    it('is idempotent without an existing cookie', async () => {
      const res = await request(app)
        .post('/api/admin/logout')
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 without CSRF headers', async () => {
      const res = await request(app).post('/api/admin/logout');
      expect(res.status).toBe(403);
      expect(res.headers['cache-control']).toBe('no-store');
    });
  });

  describe('GET /api/admin/feedback', () => {
    it('returns 401 for a missing cookie or a user JWT', async () => {
      const missing = await request(app).get('/api/admin/feedback');
      expect(missing.status).toBe(401);
      expect(missing.headers['cache-control']).toBe('no-store');

      const user = await createTestUser({ email: 'feedback-user-jwt@example.com' });
      const forbidden = await request(app)
        .get('/api/admin/feedback')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${getAuthToken(user)}`);
      expect(forbidden.status).toBe(401);
    });

    it('lists feedback for a valid admin session and rejects invalid pages', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });
      const cookie = sessionCookie(loginRes);

      const user = await createTestUser({ email: 'admin-list@example.com' });
      await Feedback.create({
        userId: user._id,
        email: user.email,
        category: 'Bug or Technical Issue',
        message: 'Something broke.',
        screenshots: [
          { url: 'https://res.cloudinary.com/ok.png', publicId: 'hidden' },
          { url: 'http://example.com/image.png', publicId: 'insecure' },
          { url: 'not-a-url', publicId: 'invalid' },
        ],
        followUp: false,
      });

      const res = await request(app)
        .get('/api/admin/feedback')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
      expect(res.body.feedback[0]).toMatchObject({
        email: 'admin-list@example.com',
        screenshots: [{ url: 'https://res.cloudinary.com/ok.png' }],
      });
      expect(JSON.stringify(res.body)).not.toContain('hidden');
      expect(res.body.feedback[0].userId).toBeUndefined();
      expect(res.body.feedback[0].updatedAt).toBeUndefined();
      expect(res.body.feedback[0].__v).toBeUndefined();
      expect(res.body.feedback[0].screenshots[0].publicId).toBeUndefined();

      const invalidPage = await request(app)
        .get('/api/admin/feedback')
        .query({ page: '1.5' })
        .set('Cookie', cookie);
      expect(invalidPage.status).toBe(400);

      const zeroPage = await request(app)
        .get('/api/admin/feedback')
        .query({ page: 0 })
        .set('Cookie', cookie);
      expect(zeroPage.status).toBe(400);

      const arrayPage = await request(app)
        .get('/api/admin/feedback?page=1&page=2')
        .set('Cookie', cookie);
      expect(arrayPage.status).toBe(400);

      const pastLastPage = await request(app)
        .get('/api/admin/feedback')
        .query({ page: 2 })
        .set('Cookie', cookie);
      expect(pastLastPage.status).toBe(200);
      expect(pastLastPage.body.feedback).toEqual([]);
      expect(pastLastPage.body.pagination.page).toBe(2);
    });

    it('paginates by server total with stable createdAt and id ordering', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });
      const cookie = sessionCookie(loginRes);
      const user = await createTestUser({ email: 'admin-pages@example.com' });
      const docs = await Feedback.insertMany(Array.from({ length: 21 }, (_, index) => ({
        userId: user._id,
        email: user.email,
        category: 'General App Experience',
        message: `Submission ${index}`,
        createdAt: new Date(index === 0 ? '2026-01-01T00:00:00Z' : '2026-02-01T00:00:00Z'),
      })));
      const expected = docs.slice(1).map((doc) => doc._id.toString()).sort().reverse();

      const first = await request(app).get('/api/admin/feedback?page=1').set('Cookie', cookie);
      expect(first.status).toBe(200);
      expect(first.headers['cache-control']).toBe('no-store');
      expect(first.body.pagination).toEqual({ page: 1, pageSize: 20, total: 21, totalPages: 2 });
      expect(first.body.feedback.map((item: { id: string }) => item.id)).toEqual(expected);

      const second = await request(app).get('/api/admin/feedback?page=2').set('Cookie', cookie);
      expect(second.status).toBe(200);
      expect(second.body.pagination).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
      expect(second.body.feedback.map((item: { id: string }) => item.id)).toEqual([docs[0]._id.toString()]);

      const beyond = await request(app).get('/api/admin/feedback?page=3').set('Cookie', cookie);
      expect(beyond.body.feedback).toEqual([]);
      expect(beyond.body.pagination).toEqual({ page: 3, pageSize: 20, total: 21, totalPages: 2 });
    });

    it('keeps Cache-Control no-store on an internal 500', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });

      const spy = vi.spyOn(Feedback, 'countDocuments').mockRejectedValueOnce(new Error('db unavailable'));
      const res = await request(app)
        .get('/api/admin/feedback')
        .set('Cookie', sessionCookie(loginRes));

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ success: false, message: 'Internal server error' });
      expect(res.headers['cache-control']).toBe('no-store');
      spy.mockRestore();
    });
  });

  describe('GET /api/admin/reports', () => {
    it('requires an admin session', async () => {
      const missing = await request(app).get('/api/admin/reports');
      expect(missing.status).toBe(401);

      const user = await createTestUser({ email: 'reports-user-jwt@example.com' });
      const withUserJwt = await request(app)
        .get('/api/admin/reports')
        .set('Cookie', `${ADMIN_COOKIE_NAME}=${getAuthToken(user)}`);
      expect(withUserJwt.status).toBe(401);
    });

    it('lists reports with both parties resolved, and rejects invalid pages', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });
      const cookie = sessionCookie(loginRes);

      const reporter = await createTestUser({ email: 'reporter@example.com' });
      const reported = await createTestUser({
        email: 'reported@example.com',
        firstName: 'Tomas',
      });
      await Report.create({
        reporter: reporter._id,
        reported: reported._id,
        reason: 'Harassment or bullying',
        details: 'Unwanted messages',
      });

      const res = await request(app).get('/api/admin/reports').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
      expect(res.body.reports[0]).toMatchObject({
        reporterEmail: 'reporter@example.com',
        reportedEmail: 'reported@example.com',
        reportedName: 'Tomas',
        reason: 'Harassment or bullying',
        details: 'Unwanted messages',
        status: 'new',
      });
      // internal fields must not leak
      expect(res.body.reports[0].updatedAt).toBeUndefined();
      expect(res.body.reports[0].__v).toBeUndefined();

      const badPage = await request(app)
        .get('/api/admin/reports?page=0')
        .set('Cookie', cookie);
      expect(badPage.status).toBe(400);

      const pastLastPage = await request(app)
        .get('/api/admin/reports?page=99')
        .set('Cookie', cookie);
      expect(pastLastPage.status).toBe(200);
      expect(pastLastPage.body.reports).toEqual([]);
    });

    it('omits details when a report has none', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });
      const cookie = sessionCookie(loginRes);

      const reporter = await createTestUser({ email: 'r2@example.com' });
      const reported = await createTestUser({ email: 'r3@example.com' });
      await Report.create({
        reporter: reporter._id,
        reported: reported._id,
        reason: 'Spam or scam',
      });

      const res = await request(app).get('/api/admin/reports').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.reports[0].details).toBeUndefined();
    });
  });


  describe('PATCH /api/admin/reports/:reportId/status', () => {
    const createReport = async () => {
      const reporter = await createTestUser({ email: `rep-${Date.now()}@example.com` });
      const reported = await createTestUser({ email: `tgt-${Date.now()}@example.com` });
      return Report.create({
        reporter: reporter._id,
        reported: reported._id,
        reason: 'Safety concern',
      });
    };

    const adminCookie = async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: ADMIN_PASSWORD });
      return sessionCookie(loginRes);
    };

    it('requires an admin session', async () => {
      const created = await createReport();
      const res = await request(app)
        .patch(`/api/admin/reports/${created._id}/status`)
        .set(adminHeaders)
        .send({ status: 'reviewing' });
      expect(res.status).toBe(401);
    });

    it('rejects a mutation without the admin CSRF headers', async () => {
      const cookie = await adminCookie();
      const created = await createReport();

      const res = await request(app)
        .patch(`/api/admin/reports/${created._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'reviewing' });

      expect(res.status).toBe(403);
    });

    it('moves a report through reviewing and resolved', async () => {
      const cookie = await adminCookie();
      const created = await createReport();

      const reviewing = await request(app)
        .patch(`/api/admin/reports/${created._id}/status`)
        .set(adminHeaders)
        .set('Cookie', cookie)
        .send({ status: 'reviewing' });

      expect(reviewing.status).toBe(200);
      expect(reviewing.body.report).toMatchObject({ id: created._id.toString(), status: 'reviewing' });

      const resolved = await request(app)
        .patch(`/api/admin/reports/${created._id}/status`)
        .set(adminHeaders)
        .set('Cookie', cookie)
        .send({ status: 'resolved' });

      expect(resolved.status).toBe(200);
      expect(resolved.body.report.status).toBe('resolved');

      const persisted = await Report.findById(created._id);
      expect(persisted?.status).toBe('resolved');
    });

    it('rejects an unknown status and a malformed id', async () => {
      const cookie = await adminCookie();
      const created = await createReport();

      const badStatus = await request(app)
        .patch(`/api/admin/reports/${created._id}/status`)
        .set(adminHeaders)
        .set('Cookie', cookie)
        .send({ status: 'archived' });
      expect(badStatus.status).toBe(400);

      const badId = await request(app)
        .patch('/api/admin/reports/not-an-id/status')
        .set(adminHeaders)
        .set('Cookie', cookie)
        .send({ status: 'resolved' });
      expect(badId.status).toBe(400);
    });

    it('returns 404 for a report that does not exist', async () => {
      const cookie = await adminCookie();
      const res = await request(app)
        .patch('/api/admin/reports/000000000000000000000000/status')
        .set(adminHeaders)
        .set('Cookie', cookie)
        .send({ status: 'resolved' });

      expect(res.status).toBe(404);
    });
  });

});

describe('Admin login rate limit', () => {
  it('returns 429 after five failed login attempts', async () => {
    const app = createTestApp();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await request(app)
        .post('/api/admin/login')
        .set(adminHeaders)
        .send({ password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    const limited = await request(app)
      .post('/api/admin/login')
      .set(adminHeaders)
      .send({ password: 'wrong-password' });

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      success: false,
      message: 'Too many login attempts. Please try again later.',
    });
    expect(limited.headers['cache-control']).toBe('no-store');
  });

});
