import { defineConfig, devices } from '@playwright/test';

// Headless Chromium only (Eric uses this machine while tests run).
//   npm run test:e2e                        mock API: fixtures, cards, ranking
//   E2E_API=live npm run test:e2e           dev server against the live API
//   E2E_BASE_URL=https://frontier-beat.github.io npm run test:e2e   deployed site
export const LIVE_API = 'https://api-rcvqmjv3ua-ue.a.run.app';
const external = process.env.E2E_BASE_URL;
const live = Boolean(external || process.env.E2E_API === 'live');

const devServer = (apiBase) => ({
  command: 'npx vite --port 5173 --strictPort',
  url: 'http://localhost:5173',
  reuseExistingServer: false,
  env: { VITE_API_BASE_URL: apiBase },
});

export default defineConfig({
  testDir: 'e2e',
  ...(live ? { testMatch: 'live.spec.js' } : { testIgnore: 'live.spec.js' }),
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: external || 'http://localhost:5173',
    headless: true,
    ...devices['Desktop Chrome'],
  },
  webServer: external ? undefined : live ? [devServer(LIVE_API)] : [
    { command: 'node scripts/mock-api.mjs', url: 'http://localhost:8787/health', reuseExistingServer: false },
    devServer('http://localhost:8787'),
  ],
});
