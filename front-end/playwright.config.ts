import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../back-end',
      port: 8080,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        JWT_SECRET: process.env.JWT_SECRET || 'test-e2e-secret',
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/kinmeet-test',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'test',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || 'test',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'test',
        PORT: '8080',
      },
    },
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
