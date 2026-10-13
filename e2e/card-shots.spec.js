// One card at both widths and both themes, for design review.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`card ${theme} ${name}`, async ({ browser }) => {
      const { context, page, errors } = await openPage(browser, { theme, viewport });
      await page.goto('/');
      const card = page.locator('.card').filter({ has: page.locator('.katex-display') }).first();
      await expect(card).toBeVisible();
      await page.addStyleTag({ content: '.footer { display: none }' }); // fixed bar would overlap the capture
      await card.screenshot({ path: `docs/screenshots/card-${name}-${theme}.png` });
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
