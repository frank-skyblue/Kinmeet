import { test, expect } from '@playwright/test';
import {
  loginAs,
  seedTestUser,
  selectCityOption,
  selectDropdownOption,
  selectTypeaheadOption,
} from './helpers';

test.describe('Auth Flow', () => {
  test('signup step 3 shows education level dropdown', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Join KinMeet')).toBeVisible();

    const email = `edu-${Date.now()}@test.com`;

    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPass1');
    await page.locator('#confirmPassword').fill('TestPass1');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Profile Information')).toBeVisible();
    await page.locator('#firstName').fill('Edu');
    await page.locator('#lastName').fill('Demo');
    await selectTypeaheadOption(page, 'Your Home Country', 'France', 'France');
    await selectCityOption(page, 'Toronto', /Toronto, Ontario, Canada/);
    await selectTypeaheadOption(page, /Province\/State/, 'Ontario', 'Ontario, Canada');
    await page.locator('#dateOfBirth').fill('1990-01-15');
    await selectDropdownOption(page, 'Gender', 'Female');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Work & Education')).toBeVisible();
    await expect(page.getByRole('combobox', { name: /education level/i })).toBeVisible();
    await expect(page.getByLabel(/institution/i)).toHaveCount(0);

    await selectDropdownOption(page, /education level/i, "Bachelor's Degree");
    await expect(page.getByRole('combobox', { name: /education level/i })).toContainText("Bachelor's Degree");
  });

  test('signup step 3 shows industry field only', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Join KinMeet')).toBeVisible();

    const email = `industry-${Date.now()}@test.com`;

    await page.locator('#email').fill(email);
    await page.locator('#password').fill('TestPass1');
    await page.locator('#confirmPassword').fill('TestPass1');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Profile Information')).toBeVisible();
    await page.locator('#firstName').fill('Industry');
    await page.locator('#lastName').fill('Tester');
    await selectTypeaheadOption(page, 'Your Home Country', 'France', 'France');
    await selectCityOption(page, 'Toronto', /Toronto, Ontario, Canada/);
    await selectTypeaheadOption(page, /Province\/State/, 'Ontario', 'Ontario, Canada');
    await page.locator('#dateOfBirth').fill('1995-01-15');
    await selectDropdownOption(page, 'Gender', 'Female');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Work & Education')).toBeVisible();
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

  test('user menu opens Settings & Privacy and Account delete flow', async ({ page }) => {
    const email = `settings-${Date.now()}@test.com`;
    await seedTestUser({
      email,
      password: 'TestPass1',
      firstName: 'Settings',
      lastName: 'User',
    });

    await loginAs(page, email, 'TestPass1');
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('link', { name: /settings & privacy/i }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: /settings & privacy/i })).toBeVisible();

    await page.getByRole('link', { name: /account:/i }).click();
    await expect(page).toHaveURL(/\/settings\/account/);
    await expect(page.getByRole('heading', { name: /^account$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible();
  });
});
