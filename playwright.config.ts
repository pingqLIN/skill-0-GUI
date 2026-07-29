import { defineConfig, devices } from '@playwright/test';

const DEFAULT_PORT = 43190;
const configuredPort = process.env.PLAYWRIGHT_PORT;
const PORT = configuredPort === undefined ? DEFAULT_PORT : Number.parseInt(configuredPort, 10);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65_535) {
  throw new Error(`PLAYWRIGHT_PORT must be a valid TCP port; received "${configuredPort}".`);
}

const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: '.playwright-cli/test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1024 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
