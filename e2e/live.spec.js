// Live API (or the deployed site): data loads, ranking switches work, LaTeX
// renders, at 375 px and 1280 px in both themes. Screenshots go to
// docs/screenshots/<target>-<width>-<theme>.png.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const target = process.env.SHOT_PREFIX || (process.env.E2E_BASE_URL ? 'deployed' : 'live');
const katexErrors = (page) => page.locator('.card .katex-error, .card .katex [style*="color:#cc0000"]').count();

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`${target} ${name} ${theme}`, async ({ browser }) => {
      const { context, page, errors } = await openPage(browser, { theme, viewport });

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
        const response = page.waitForResponse((r) => r.url().includes('/top_papers') && new URL(r.url()).searchParams.get('sort') === value);
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

      expect(await page.locator('.card .katex').count()).toBeGreaterThan(0);
      console.log(`[${name} ${theme}] KaTeX error nodes in 20 cards: ${await katexErrors(page)}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

// Digest against the live API. Until digests are built every row has
// has_digest false, so the first row is marked as having one (list
// response only); its GET /papers/<id>/digest goes to the real API.
test('live digest: rows carry the digest fields; a 404 digest falls back to the paragraph', async ({ browser }) => {
  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    const { context, page, errors } = await openPage(browser, { viewport });
    const rows = [];
    let marked = null;
    await page.route(/\/top_papers\?/, async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      rows.push(...body.repos.map((r) => ({ ...r })));
      // Marked by id in every response: dev mode's double mount aborts the first request.
      if (!marked && body.repos[0] && !body.repos[0].has_digest) marked = { ...body.repos[0] };
      for (const r of body.repos.filter((x) => marked && x.arxiv_id === marked.arxiv_id)) {
        r.has_digest = true;
        r.digest_headlines = [{ id: 'S1', heading: 'Introduction', headline: 'A headline for the 404 check.', figure_count: 1 }];
      }
      await route.fulfill({ response: res, json: body });
    });
    const digestStatus = [];
    page.on('response', (r) => { if (/\/papers\/[^/]+\/digest$/.test(r.url())) digestStatus.push(r.status()); });
    await page.goto('/');
    await expect(page.locator('.card')).toHaveCount(10);
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(rows.every((r) => typeof r.has_digest === 'boolean' && 'digest_headlines' in r)).toBe(true);
    const real = new Set(rows.filter((r) => r.has_digest).map((r) => r.arxiv_id)).size;

    const card = page.locator('.card').first();
    expect(marked, 'first row already has a real digest; nothing to mark').not.toBeNull();
    await expect(card.locator('.digest > details')).toHaveCount(2); // Abstract + the marked section
    expect(digestStatus).toEqual([]); // nothing fetched before a toggle opens
    await card.locator('.digest > details > summary').nth(1).click();
    await expect.poll(() => digestStatus.length).toBe(1);
    if (digestStatus[0] === 404) {
      await expect(card.locator(':scope > .summary')).toBeVisible();
      await expect(card.locator('.digest')).toHaveCount(0);
    }
    // Cards without a real digest keep the paragraph.
    expect(await page.locator('.card .digest').count()).toBe(real + (digestStatus[0] === 404 ? 0 : 1));
    console.log(`[live digest ${viewport.width}] ${marked.arxiv_id}: digest HTTP ${digestStatus[0]}, ${real} real digest rows on page 1, ` +
      `fallback paragraph shown ${await card.locator(':scope > .summary').count() === 1}`);
    // The browser logs the expected 404; nothing else may reach the console.
    expect(errors.filter((e) => !/status of 404/.test(e))).toEqual([]);
    await context.close();
  }
});
