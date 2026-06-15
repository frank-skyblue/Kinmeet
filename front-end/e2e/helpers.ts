import type { Page } from '@playwright/test';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8080/api';

interface SeedUserOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  homeCountry?: string;
  currentProvince?: string;
  currentCountry?: string;
  currentCity?: string;
  languages?: string[];
  lookingFor?: string[];
}

interface SeedResult {
  token: string;
  user: { id: string; email: string; firstName: string };
}

export const seedTestUser = async (opts: SeedUserOptions): Promise<SeedResult> => {
  const payload = {
    email: opts.email,
    password: opts.password,
    firstName: opts.firstName,
    lastName: opts.lastName,
    homeCountry: opts.homeCountry ?? 'France',
    currentLocation: {
      province: opts.currentProvince ?? 'Ontario',
      country: opts.currentCountry ?? 'Canada',
      city: opts.currentCity ?? 'Toronto',
    },
    languages: opts.languages ?? ['English'],
    interests: ['Hiking'],
    lookingFor: opts.lookingFor ?? ['Friendship'],
    dateOfBirth: '1990-01-15',
    gender: 'female',
  };

  const res = await axios.post(`${API_URL}/auth/register`, payload);
  return { token: res.data.token, user: res.data.user };
};

export const seedMeetRequest = async (senderToken: string, receiverId: string) => {
  await axios.post(
    `${API_URL}/matching/meet`,
    { receiverId },
    { headers: { Authorization: `Bearer ${senderToken}` } },
  );
};

export const seedConnection = async (senderToken: string, receiverToken: string, receiverId: string) => {
  await seedMeetRequest(senderToken, receiverId);

  const requestsRes = await axios.get(`${API_URL}/connections/requests`, {
    headers: { Authorization: `Bearer ${receiverToken}` },
  });

  const requestId = requestsRes.data.requests[0]._id;
  await axios.post(
    `${API_URL}/connections/requests/${requestId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${receiverToken}` } },
  );
};

export const selectTypeaheadOption = async (
  page: Page,
  comboboxName: string | RegExp,
  typeText: string,
  optionName: string | RegExp,
) => {
  await page.getByRole('combobox', { name: comboboxName }).click();
  await page.keyboard.type(typeText);
  await page.getByRole('option', { name: optionName }).click();
};

export const selectDropdownOption = async (
  page: Page,
  comboboxName: string | RegExp,
  optionName: string | RegExp,
) => {
  await page.getByRole('combobox', { name: comboboxName }).click();
  await page.getByRole('option', { name: optionName }).click();
};

export const selectCityOption = async (
  page: Page,
  typeText: string,
  optionName: string | RegExp,
) => {
  const input = page.getByRole('textbox', { name: /city or town/i });
  await input.fill(typeText);
  const option = page.getByRole('option', { name: optionName });
  await option.waitFor({ state: 'visible' });
  await option.click();
};

export const loginAs = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/discover');
};

/**
 * E2E tests use unique timestamps in emails to avoid collisions,
 * so explicit DB cleanup between tests is not required.
 * If needed, add a dedicated backend endpoint for test cleanup.
 */
