import { defineConfig, devices } from '@playwright/test';

// Headless Chromium only (Eric uses this machine while tests run).
// E2E_BASE_URL=https://frontier-beat.github.io runs the suite against a
// deployed site instead of the local dev server + mock API.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: external || 'http://localhost:5173',
    headless: true,
    ...devices['Desktop Chrome'],
  },
  webServer: external ? undefined : [
    { command: 'node scripts/mock-api.mjs', url: 'http://localhost:8787/health', reuseExistingServer: false },
    { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: false, env: { VITE_API_BASE_URL: 'http://localhost:8787' } },
  ],
});
