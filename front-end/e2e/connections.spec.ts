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
});
