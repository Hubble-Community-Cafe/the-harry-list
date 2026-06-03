import { defineConfig, devices } from '@playwright/test';

/**
 * Service URLs. Defaults match docker-compose.e2e.yml's published ports, but can be
 * overridden (e.g. when pointing the suite at an already-running stack or staging).
 */
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173';
export const ADMIN_BASE_URL = process.env.ADMIN_BASE_URL ?? 'http://localhost:5174';
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080';
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

// CI builds all images from scratch, so allow plenty of time for the stack to come up.
const WEBSERVER_TIMEOUT = process.env.CI ? 600_000 : 240_000;

export default defineConfig({
  testDir: './tests',
  // The suite shares one backend + database, so tests run serially for isolation.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        // Inline annotations on failing lines.
        ['github'],
        // A readable per-test summary table on the GitHub Actions run page
        // (no need to download the HTML report just to see what passed/failed).
        ['@estruyf/github-actions-reporter', { title: 'Playwright E2E results', useDetails: true, showError: true }],
        ['html', { open: 'never' }],
        ['list'],
      ]
    : [['html', { open: 'never' }], ['list']],
  use: {
    // Capture a full, replayable trace for every run (pass or fail) so each spec
    // is self-documenting in the HTML report. Specs also attach curated
    // screenshots + email/DB snapshots at key moments (see fixtures/evidence.ts).
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /**
   * Boot the full e2e stack (MariaDB + backend[e2e] + Mailpit + frontends) before the run.
   * Set E2E_NO_WEBSERVER=1 to skip this when the stack is already running locally
   * (e.g. `npm run stack:up` in another terminal) for faster iteration.
   */
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : [
        {
          // Boots the whole stack. Backend health gates that the API is ready.
          command: 'docker compose -f ../docker-compose.e2e.yml up --build',
          url: `${BACKEND_URL}/actuator/health`,
          reuseExistingServer: !process.env.CI,
          timeout: WEBSERVER_TIMEOUT,
        },
        {
          // Wait for the public frontend nginx to actually serve before testing
          // (it comes up after the backend, so gating only on the API races).
          command: 'node -e "setInterval(() => {}, 1 << 30)"',
          url: PUBLIC_BASE_URL,
          reuseExistingServer: true,
          timeout: WEBSERVER_TIMEOUT,
        },
        {
          // Likewise for the admin frontend.
          command: 'node -e "setInterval(() => {}, 1 << 30)"',
          url: ADMIN_BASE_URL,
          reuseExistingServer: true,
          timeout: WEBSERVER_TIMEOUT,
        },
      ],

  projects: [
    {
      name: 'public',
      testDir: './tests/public',
      use: { ...devices['Desktop Chrome'], baseURL: PUBLIC_BASE_URL },
    },
    {
      name: 'admin',
      testDir: './tests/admin',
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_BASE_URL },
    },
    {
      // Pixel 5 is a Chromium-based mobile device, so the suite only needs the
      // chromium browser (iPhone devices would require WebKit).
      name: 'mobile-public',
      testDir: './tests/mobile-public',
      use: { ...devices['Pixel 5'], baseURL: PUBLIC_BASE_URL },
    },
  ],
});
