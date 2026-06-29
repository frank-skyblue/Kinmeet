import { test, expect } from '@playwright/test';
import { seedTestUser, seedMeetRequest, loginAs } from './helpers';

test.describe('Connection Request Flow', () => {
  test('accept a connection request', async ({ page }) => {
    const ts = Date.now();

    const sender = await seedTestUser({
      email: `conn-sender-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'Sender',
      lastName: 'One',
    });

    const receiver = await seedTestUser({
      email: `conn-receiver-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'Receiver',
      lastName: 'Two',
    });

    await seedMeetRequest(sender.token, receiver.user.id);

    await loginAs(page, `conn-receiver-${ts}@test.com`, 'TestPass1');

    await page.goto('/connections?tab=requests');
    await expect(page.getByText('Sender')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1 pending')).toBeVisible();

    await page.getByRole('button', { name: /accept/i }).click();

    await expect(page.getByText('No Pending Requests')).toBeVisible({ timeout: 5000 });

    await page.goto('/connections');
    await expect(page.getByText('Sender One')).toBeVisible({ timeout: 10000 });
  });

  test('profile shows age instead of raw date of birth', async ({ page }) => {
    const ts = Date.now();
    const password = 'TestPass1';

    await seedTestUser({
      email: `profile-age-${ts}@test.com`,
      password,
      firstName: 'Profile',
      lastName: 'Viewer',
    });

    await loginAs(page, `profile-age-${ts}@test.com`, password);
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: /^age$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1990-01-15')).toHaveCount(0);

    const now = new Date();
    const birthYear = 1990;
    const birthMonth = 1;
    const birthDay = 15;
    let expectedAge = now.getUTCFullYear() - birthYear;
    const todayMonth = now.getUTCMonth() + 1;
    const todayDay = now.getUTCDate();
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
      expectedAge -= 1;
    }

    await expect(page.getByText(String(expectedAge))).toBeVisible();
  });
});
