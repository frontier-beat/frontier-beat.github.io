import { defineConfig, devices } from '@playwright/test';

// Headless only (Eric uses this machine while tests run): Chromium for
// everything, plus one WebKit browser for the digest toggles.
//   npm run test:e2e                        mock data server: fixtures, cards, ranking
//   E2E_API=live npm run test:e2e           dev server on the real snapshot in public/data
//   E2E_BASE_URL=https://frontier-beat.github.io npm run test:e2e   deployed site
//   SHOTS=1 npm run test:e2e -- digest-shots   review screenshots (loads figures from arxiv.org)
const external = process.env.E2E_BASE_URL;
const live = Boolean(external || process.env.E2E_API === 'live');

const devServer = (dataBase) => ({
  command: 'npx vite --port 5173 --strictPort',
  url: 'http://localhost:5173',
  reuseExistingServer: false,
  env: dataBase ? { VITE_DATA_BASE_URL: dataBase } : {},
});

export default defineConfig({
  testDir: 'e2e',
  ...(live ? { testMatch: 'live.spec.js' } : { testIgnore: process.env.SHOTS ? ['live.spec.js'] : ['live.spec.js', 'digest-shots.spec.js'] }),
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: external || 'http://localhost:5173',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(live ? [] : [{ name: 'webkit', testMatch: 'digest.spec.js', use: { ...devices['Desktop Safari'] } }]),
  ],
  webServer: external ? undefined : live ? [devServer()] : [
    { command: 'node scripts/mock-api.mjs', url: 'http://localhost:8787/health', reuseExistingServer: false },
    devServer('http://localhost:8787/data'),
  ],
});
