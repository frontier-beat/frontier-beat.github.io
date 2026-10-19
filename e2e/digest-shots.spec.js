// Digest card for Eric's review: closed, sections open, a figure open, at
// both widths and both themes. Uses the 2610.13778 fixture; figure images
// load from arxiv.org as they will on the site, so this spec only runs with
// SHOTS=1 (playwright.config.js).
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const PAPER = 'ReplaySSM: Cache SSM Inputs, Not State';

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`digest shots ${theme} ${name}`, async ({ browser }) => {
      const { context, page, errors } = await openPage(browser, { theme, viewport });
      await page.goto('/');
      const card = page.locator('.card').filter({ hasText: PAPER });
      await expect(card.locator('.digest')).toBeVisible();
      await page.addStyleTag({ content: '.footer { display: none }' }); // fixed bar would overlap the capture
      const shot = async (state) => {
        await page.mouse.move(0, 0); // no hover underline in the capture
        await card.evaluate((el) => el.querySelectorAll('summary').forEach((s) => s.blur()));
        await card.screenshot({ path: `docs/screenshots/digest-${state}-${name}-${theme}.png` });
      };

      await shot('closed');

      const sections = card.locator('.digest > details');
      await sections.nth(1).locator('summary').click();
      await sections.nth(2).locator('summary').click();
      await expect(sections.nth(1).locator('.digest-body .summary')).toBeVisible();
      await shot('sections');

      await sections.nth(2).locator('summary').click(); // keep one section open, with its figure
      const figure = sections.nth(1).locator('details.figure').first();
      await figure.locator('summary').click();
      const img = figure.locator('img').first();
      await expect(img).toBeVisible();
      await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 20000 }).toBe(true);
      await shot('figure');

      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
