// Eric's 2026-10-13 feedback: no rank numbers, logo centred and floating
// with even spacing, space/sky background with parallax.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const SIZES = { ...VIEWPORTS, narrow: { width: 700, height: 900 } };

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(SIZES)) {
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
          toggleOverlap: !(toggle.bottom + 8 <= logo.top || toggle.top >= logo.bottom + 8 || toggle.right <= logo.left || toggle.left >= logo.right),
          bgImage: getComputedStyle(document.querySelector('.background')).backgroundImage,
        };
      });
      console.log(`[${theme} ${name}]`, JSON.stringify(m));
      expect(Math.abs(m.left - m.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.above - m.below)).toBeLessThanOrEqual(1);
      expect(m.toggleOverlap).toBe(false);
      expect(m.bgImage).toContain(theme === 'dark' ? 'bg-dark' : 'bg-light');

      const bgY = () => page.locator('.background').evaluate((el) => getComputedStyle(el).backgroundPositionY);
      const before = await bgY();
      await page.mouse.wheel(0, 3000);
      await expect.poll(bgY).not.toBe(before);
      // Logo box is the same in both themes (no shift on toggle).
      expect(Math.round(m.height)).toBe(Math.round((await page.locator('.list').boundingBox()).width * 201 / 1276));

      expect(errors).toEqual([]);
      await context.close();
    });
  }
}
