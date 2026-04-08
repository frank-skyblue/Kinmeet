import { test, expect } from '@playwright/test';
import { seedTestUser, loginAs } from './helpers';

test.describe('Discover + Meet Flow', () => {
  test('user sees matches and can send a Meet request', async ({ page }) => {
    const ts = Date.now();

    const userA = await seedTestUser({
      email: `match-a-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'Alice',
      lastName: 'Aaaa',
      homeCountry: 'France',
      currentCountry: 'Canada',
    });

    await seedTestUser({
      email: `match-b-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'Bob',
      lastName: 'Bbbb',
      homeCountry: 'France',
      currentCountry: 'Canada',
    });

    await loginAs(page, `match-a-${ts}@test.com`, 'TestPass1');

    await expect(page.getByRole('heading', { name: 'Discover' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Bob')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /meet/i }).click();

    // After meeting the only match, Bob should disappear from the card
    await expect(page.getByText('Bob')).not.toBeVisible({ timeout: 10000 });
  });
});
