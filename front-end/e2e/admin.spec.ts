import { test, expect } from '@playwright/test';
import { ADMIN_E2E_PASSWORD } from './helpers';
import type { AdminFeedbackItem, AdminFeedbackListResponse } from '../src/types';

test.describe('Admin feedback', () => {
  test('does not hydrate the ordinary-user session when opening /admin', async ({ page }) => {
    const captured: Array<{ path: string; authorization?: string }> = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      const isApi = url.pathname.startsWith('/api/');
      const isSocket = url.pathname.includes('socket.io');
      if (!isApi && !isSocket) return;
      captured.push({
        path: url.pathname,
        authorization: request.headers().authorization,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('token', 'user-jwt-must-not-hydrate');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'user-1',
          email: 'user@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          profileComplete: true,
        }),
      );
    });

    await page.goto('/admin');
    await expect(page.getByLabel(/^password$/i)).toBeVisible();

    expect(captured.length).toBeGreaterThan(0);
    expect(captured.every((request) => request.path.startsWith('/api/admin/'))).toBe(true);
    expect(captured.every((request) => !request.authorization)).toBe(true);
    expect(captured.some((request) => request.path === '/api/admin/session')).toBe(true);
  });

  test('rejects a wrong password, then lists in-memory feedback over a real cookie session', async ({ page }) => {
    const fixtures: AdminFeedbackItem[] = Array.from({ length: 21 }, (_, index) => ({
      id: `admin-fixture-${index + 1}`,
      email: `admin-fixture-${index + 1}@example.test`,
      category: 'Bug or Technical Issue',
      message: `Feedback fixture ${index + 1}: ${'The discover cards are blank after refresh. '.repeat(5)}`.trim(),
      screenshots: [{ url: 'https://example.test/feedback-screenshot.png' }],
      followUp: true,
      status: 'new',
      createdAt: '2026-09-17T12:00:00.000Z',
    }));
    const { email, message: feedbackMessage } = fixtures[0];
    const requestedPages: number[] = [];
    await page.route((url) => url.pathname === '/api/admin/feedback', async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toBeUndefined();
      const currentPage = Number(new URL(request.url()).searchParams.get('page'));
      expect([1, 2]).toContain(currentPage);
      requestedPages.push(currentPage);
      const response: AdminFeedbackListResponse = {
        success: true,
        feedback: fixtures.slice((currentPage - 1) * 20, currentPage * 20),
        pagination: { page: currentPage, pageSize: 20, total: fixtures.length, totalPages: 2 },
      };
      await route.fulfill({ status: 200, json: response });
    });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'user-jwt-must-not-be-sent');
    });

    const apiRequests: Array<{
      url: string;
      path: string;
      authorization?: string;
      adminHeader?: string;
    }> = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) return;
      const headers = request.headers();
      apiRequests.push({
        url: request.url(),
        path: url.pathname,
        authorization: headers.authorization,
        adminHeader: headers['x-kinmeet-admin-request'],
      });
    });

    await page.goto('/admin');
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /kinmeet admin/i })).toBeVisible();

    await page.getByLabel(/^password$/i).fill('incorrect-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText(/invalid credentials/i);

    await page.getByLabel(/^password$/i).fill(ADMIN_E2E_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('heading', { name: /^feedback$/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
    await expect(page.getByText(/metrics|feature flags/i)).toHaveCount(0);

    const row = page.getByRole('row').filter({ hasText: feedbackMessage });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: email, exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Bug or Technical Issue' })).toBeVisible();
    await expect(row.getByRole('cell', { name: /^new$/i })).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Requested' })).toBeVisible();

    const cookies = await page.context().cookies();
    const adminCookie = cookies.find((cookie) => cookie.name === 'kinmeet_admin_session');
    expect(adminCookie).toBeDefined();
    expect(adminCookie?.httpOnly).toBe(true);
    expect(adminCookie?.path).toBe('/api/admin');

    // Session restoration still uses the real backend; only the feedback GET is mocked.
    await page.reload();
    await expect(row).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toHaveCount(0);

    await row.getByRole('button', { name: `View details for ${email}` }).click();
    const dialog = page.getByRole('dialog', { name: /feedback details/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(feedbackMessage)).toBeVisible();
    const attachment = dialog.getByRole('link', { name: fixtures[0].screenshots[0].url });
    await expect(attachment).toHaveAttribute('href', fixtures[0].screenshots[0].url);
    await expect(attachment).toHaveAttribute('target', '_blank');
    await expect(attachment).toHaveAttribute('rel', 'noopener noreferrer');
    await dialog.getByRole('button', { name: /close details/i }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByText('Showing 1 to 20 of 21 feedback')).toBeVisible();
    await expect(page.getByRole('button', { name: /previous page/i })).toBeDisabled();
    // StrictMode repeats mount effects; verify the user-triggered pagination sequence separately.
    requestedPages.length = 0;
    await page.getByRole('button', { name: /next page/i }).click();
    await expect(page.getByText('Showing 21 to 21 of 21 feedback')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: fixtures[20].message })).toBeVisible();
    await expect(page.getByRole('button', { name: /next page/i })).toBeDisabled();
    await page.getByRole('button', { name: /previous page/i }).click();
    await expect(row).toBeVisible();
    expect(requestedPages).toEqual([2, 1]);

    await page.getByRole('button', { name: /^log out$/i }).click();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByText(feedbackMessage)).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();

    expect(apiRequests.length).toBeGreaterThan(0);
    const adminRequests = apiRequests.filter((request) => request.path.startsWith('/api/admin/'));
    expect(adminRequests.length).toBeGreaterThan(0);
    expect(adminRequests.every((request) => !request.authorization)).toBe(true);
    expect(apiRequests.every((request) => request.path.startsWith('/api/admin/'))).toBe(true);

    const loginRequest = adminRequests.find((request) => request.url.includes('/admin/login'));
    const logoutRequest = adminRequests.find((request) => request.url.includes('/admin/logout'));
    expect(loginRequest?.adminHeader).toBe('1');
    expect(logoutRequest?.adminHeader).toBe('1');
  });
});
