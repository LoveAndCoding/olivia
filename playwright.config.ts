import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/pwa/e2e',
  timeout: 45_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  webServer: [
    {
      command: 'npm run dev -w @olivia/api',
      port: 3001,
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: 'npm run dev -w @olivia/pwa',
      port: 4173,
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});
