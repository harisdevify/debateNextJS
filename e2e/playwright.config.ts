import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const frontend = 'http://localhost:3000';
const backend = 'http://localhost:8800';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  fullyParallel: false,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: './test-results',
  use: {
    baseURL: frontend,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  projects: [{
    name: 'chromium-fake-media',
    use: {
      ...devices['Desktop Chrome'],
      permissions: ['camera', 'microphone'],
      launchOptions: {
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
      },
    },
  }],
  webServer: [
    {
      command: 'npm --prefix api run dev',
      cwd: root,
      url: `${backend}/api/v1/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { PORT: '8800', CLIENT_URL: frontend },
    },
    {
      command: 'npm --prefix client run dev',
      cwd: root,
      url: frontend,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        API_PROXY_TARGET: `${backend}/api/v1`,
        NEXT_PUBLIC_API_URL: `${backend}/api/v1`,
        NEXT_PUBLIC_SOCKET_URL: backend,
      },
    },
  ],
});
