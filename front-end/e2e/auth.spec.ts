import { test, expect } from '@playwright/test';
import { loginAs, seedTestUser } from './helpers';

test.describe('Auth Flow', () => {
  test('signup, logout, and login', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByText('Join KinMeet')).toBeVisible();
  });

  test('signup step 3 shows industry field only', async ({ page }) => {
    await page.goto('/signup');

    await expect(page.getByText('Join KinMeet')).toBeVisible();

    // Step 1
    await page.getByLabel('Email').fill(`signup-${Date.now()}@test.com`);
    await page.getByLabel('Password', { exact: true }).fill('TestPass1');
    await page.getByLabel('Confirm Password').fill('TestPass1');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 2
    await page.getByLabel('First Name').fill('Industry');
    await page.getByLabel('Last Name').fill('Tester');

    const homeCountry = page.getByRole('combobox', { name: 'Your Home Country' });
    await homeCountry.click();
    await homeCountry.pressSequentially('fra');
    await page.getByRole('option', { name: 'France' }).click();

    const province = page.getByRole('combobox', { name: /Province\/State/i });
    await province.click();
    await province.pressSequentially('ont');
    await page.getByRole('option', { name: /Ontario/i }).click();

    await page.getByLabel('Date of birth').fill('1995-01-15');

    const gender = page.getByRole('combobox', { name: 'Gender' });
    await gender.click();
    await page.getByRole('option', { name: 'Female' }).click();

    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 3 — industry only (no job title / company)
    await expect(page.getByLabel(/industry or field of work/i)).toBeVisible();
    await expect(page.getByLabel(/job title/i)).toHaveCount(0);
    await expect(page.getByLabel(/company/i)).toHaveCount(0);
  });

  test('login with valid credentials redirects to discover', async ({ page }) => {
    const email = `auth-${Date.now()}@test.com`;
    await seedTestUser({
      email,
      password: 'TestPass1',
      firstName: 'AuthUser',
      lastName: 'Test',
    });

    await loginAs(page, email, 'TestPass1');
    await expect(page).toHaveURL(/\/discover/);
  });

  test('login with bad password shows error', async ({ page }) => {
    const email = `bad-${Date.now()}@test.com`;
    await seedTestUser({
      email,
      password: 'TestPass1',
      firstName: 'Bad',
      lastName: 'Login',
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('WrongPass1');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/discover');
    await expect(page).toHaveURL(/\/login/);
  });
});
