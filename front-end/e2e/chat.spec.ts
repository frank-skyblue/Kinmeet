import { test, expect } from '@playwright/test';
import { seedTestUser, seedConnection, loginAs } from './helpers';

test.describe('Chat Flow', () => {
  test('send a message in a conversation', async ({ page }) => {
    const ts = Date.now();

    const userA = await seedTestUser({
      email: `chat-a-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'ChatAlice',
      lastName: 'Aaaa',
    });

    const userB = await seedTestUser({
      email: `chat-b-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'ChatBob',
      lastName: 'Bbbb',
    });

    await seedConnection(userA.token, userB.token, userB.user.id);

    await loginAs(page, `chat-a-${ts}@test.com`, 'TestPass1');

    await page.goto('/connections');
    await expect(page.getByText('ChatBob Bbbb')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /^message chatbob bbbb$/i }).click();
    await expect(page).toHaveURL(/\/chat\//);

    await page.getByPlaceholder('Type a message...').fill('Hello from E2E!');
    await page.getByRole('button', { name: /send message/i }).click();

    await expect(page.getByText('Hello from E2E!')).toBeVisible({ timeout: 10000 });
  });
});
