// Eric's 2026-10-13 feedback: no rank numbers, logo centred and floating
// with even spacing, space/sky background with parallax.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`layout ${theme} ${name}`, async ({ browser }) => {
      const { context, page, errors } = await openPage(browser, { theme, viewport });
      await page.goto('/');
      await expect(page.locator('.card')).toHaveCount(10);
      await page.locator('.logo').evaluate((img) => img.decode());

      expect(await page.locator('.rank').count()).toBe(0);

      const m = await page.evaluate(() => {
        const r = (sel) => document.querySelector(sel).getBoundingClientRect();
        const logo = r('.logo');
        const title = r('.page-title');
        const col = r('.list');
        const toggle = r('.theme-toggle');
        return {
          left: logo.left - col.left, right: col.right - logo.right,
          above: logo.top, below: title.top - logo.bottom, height: logo.height,
          toggleOverlap: !(toggle.bottom <= logo.top || toggle.left >= logo.right),
          bgImage: getComputedStyle(document.querySelector('.background')).backgroundImage,
        };
      });
      console.log(`[${theme} ${name}]`, JSON.stringify(m));
      expect(Math.abs(m.left - m.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.above - m.below)).toBeLessThanOrEqual(1);
      expect(m.toggleOverlap).toBe(false);
      expect(m.bgImage).toContain(theme === 'dark' ? 'dark-background' : 'light-background');

      const before = await page.locator('.background').evaluate((el) => getComputedStyle(el).transform);
      await page.mouse.wheel(0, 3000);
      await expect.poll(() => page.locator('.background').evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);

      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
