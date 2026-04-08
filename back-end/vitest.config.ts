import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './src',
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
