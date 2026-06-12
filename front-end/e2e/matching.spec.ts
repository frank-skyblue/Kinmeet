import { test, expect } from '@playwright/test';
import { seedTestUser, loginAs } from './helpers';

test.describe('Discover + Meet Flow', () => {
  test('user sees matches and can send a Meet request', async ({ page }) => {
    const ts = Date.now();

    await seedTestUser({
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

  test('profile dropdown shows icons for My Profile and Sign Out', async ({ page }) => {
    const ts = Date.now();

    await seedTestUser({
      email: `menu-${ts}@test.com`,
      password: 'TestPass1',
      firstName: 'MenuUser',
      lastName: 'Test',
    });

    await loginAs(page, `menu-${ts}@test.com`, 'TestPass1');

    await page.getByRole('button', { name: 'User menu' }).click();

    const profileLink = page.getByRole('link', { name: /my profile/i });
    const signOutButton = page.getByRole('button', { name: /sign out/i });

    await expect(profileLink).toBeVisible();
    await expect(signOutButton).toBeVisible();
    await expect(profileLink.locator('svg')).toBeVisible();
    await expect(signOutButton.locator('svg')).toBeVisible();
  });
});
