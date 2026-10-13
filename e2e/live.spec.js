// Live API (or the deployed site): data loads, ranking switches work, LaTeX
// renders, at 375 px and 1280 px in both themes. Screenshots go to
// docs/screenshots/<target>-<width>-<theme>.png.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const target = process.env.E2E_BASE_URL ? 'deployed' : 'live';
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

      for (const sort of ['Most stars', 'Stars gained', 'Newest', 'Trending']) {
        const first = await page.locator('.card-title').first().textContent();
        await page.getByText(sort, { exact: true }).click();
        await expect(page.locator('.card')).toHaveCount(10, { timeout: 30_000 });
        if (sort !== 'Trending') await expect(page.locator('.card-title').first()).not.toHaveText(first);
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
