import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port=3100 --strictPort',
    url: 'http://127.0.0.1:3100/poc',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
