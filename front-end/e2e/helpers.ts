import type { Page } from '@playwright/test';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

interface SeedUserOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  homeCountry?: string;
  currentProvince?: string;
  currentCountry?: string;
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
    currentProvince: opts.currentProvince ?? 'Ontario',
    currentCountry: opts.currentCountry ?? 'Canada',
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
