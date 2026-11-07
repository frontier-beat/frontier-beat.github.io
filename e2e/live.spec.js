// Real data (the static snapshot in public/data, or the deployed site): data
// loads, ranking switches work, LaTeX renders, nothing calls the retired API,
// at 375 px and 1280 px in both themes. Screenshots go to
// docs/screenshots/<target>-<width>-<theme>.png.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const target = process.env.SHOT_PREFIX || (process.env.E2E_BASE_URL ? 'deployed' : 'live');
const TOP = /\/data\/top\/([a-z]+)\/([a-z]+)\/(\d+)\.json$/;
const sortOf = (url) => (new URL(url).pathname.match(TOP) || [])[1];
const katexErrors = (page) => page.locator('.card .katex-error, .card .katex [style*="color:#cc0000"]').count();

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`${target} ${name} ${theme}`, async ({ browser }) => {
      const { context, page, errors } = await openPage(browser, { theme, viewport });
      const apiCalls = [];
      page.on('request', (r) => { if (/run\.app/.test(r.url())) apiCalls.push(r.url()); });

      // Default view: trending + 30d. With 2024 seed data this is empty and
      // offers all time; once the jobs run it has cards. Accept either.
      await page.goto('/');
      const status = page.getByRole('status');
      await expect(page.locator('.card').first().or(status.getByRole('button', { name: 'Show all time' }))).toBeVisible({ timeout: 30_000 });
      if (await status.getByRole('button', { name: 'Show all time' }).isVisible()) {
        await page.screenshot({ path: `docs/screenshots/${target}-${name}-${theme}-empty-window.png` });
        await status.getByRole('button', { name: 'Show all time' }).click();
      }
      await expect(page.locator('.card')).toHaveCount(10, { timeout: 30_000 });
      // Capture before any long scroll: headless captures after scrolling
      // back to the top come out blank above the fold.
      await page.screenshot({ path: `docs/screenshots/${target}-${name}-${theme}.png` });

      // Each switch must request the new sort and reload the list. (Titles
      // can legitimately coincide: the top trending paper may also have the
      // most stars.) An empty windowed result falls back to all time.
      for (const [label, value] of [['Most stars', 'stars'], ['Stars gained', 'gained'], ['Newest', 'new'], ['Trending', 'trending']]) {
        const response = page.waitForResponse((r) => sortOf(r.url()) === value);
        await page.getByText(label, { exact: true }).click();
        const res = await response;
        expect(res.status()).toBe(200);
        const first = (await res.json()).repos[0];
        await expect(page.locator('.card').first().or(status.getByRole('button', { name: 'Show all time' }))).toBeVisible({ timeout: 30_000 });
        if (await status.getByRole('button', { name: 'Show all time' }).isVisible()) {
          await status.getByRole('button', { name: 'Show all time' }).click();
        }
        await expect(page.locator('.card')).toHaveCount(10, { timeout: 30_000 });
        // The list shows this sort's data, not the previous list.
        if (first) await expect(page.locator('.card-title a').first()).toHaveAttribute('href', first.html_link);
      }
      await page.mouse.wheel(0, 30000);
      await expect(page.locator('.card')).toHaveCount(20, { timeout: 30_000 });

      // Cards with a digest start closed, so the top rows may show no math at all.
      console.log(`[${name} ${theme}] KaTeX nodes / error nodes in 20 cards: ${await page.locator('.card .katex').count()} / ${await katexErrors(page)}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

      await expect(page.locator('.data-date')).toContainText(/Rankings as of \w+ \d+, \d{4}/);
      expect(apiCalls).toEqual([]);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

// Digest against the real data: rows carry the digest fields, and opening a
// real digest card's Abstract fetches its file from /data/digests (200) and
// renders it. (The 404 fallback is covered against the mock in digest.spec.js.)
test('live digest: rows carry the digest fields; a real digest opens from its static file', async ({ browser }) => {
  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    const { context, page, errors } = await openPage(browser, { viewport });
    const rows = [];
    page.on('response', async (r) => { if (TOP.test(r.url())) rows.push(...(await r.json()).repos); });
    const digestStatus = [];
    page.on('response', (r) => { if (/\/data\/digests\/[^/]+\.json$/.test(r.url())) digestStatus.push(r.status()); });
    await page.goto('/');
    await expect(page.locator('.card')).toHaveCount(10);
    await expect.poll(() => rows.length).toBeGreaterThanOrEqual(10);
    expect(rows.every((r) => typeof r.has_digest === 'boolean' && 'digest_headlines' in r)).toBe(true);
    const real = new Set(rows.filter((r) => r.has_digest).map((r) => r.arxiv_id)).size;
    expect(await page.locator('.card .digest').count()).toBe(real);
    expect(real, 'no digest among the first 10 rows').toBeGreaterThan(0);

    const card = page.locator('.card').filter({ has: page.locator('.digest') }).first();
    expect(digestStatus).toEqual([]); // nothing fetched before a toggle opens
    await card.locator('.digest > details > summary').first().click();
    await expect.poll(() => digestStatus).toEqual([200]);
    await expect(card.locator('.digest > details').first().locator('.digest-body')).not.toBeEmpty();
    await expect(card.locator('.digest-error')).toHaveCount(0);
    console.log(`[live digest ${viewport.width}] ${real} digest rows on page 1; abstract opened from its static file`);
    expect(errors).toEqual([]);
    await context.close();
  }
});
