// Card strip (Eric 2026-10-13): star icons, readable category names with
// the code in a tooltip, honest gain span, one line on a phone.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

test('strip stays one line at 375 px for every sort', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser, { viewport: VIEWPORTS.mobile });
  for (const sort of ['trending', 'stars', 'gained', 'new']) {
    await page.goto(`/?sort=${sort}&window=all`);
    await expect(page.locator('.card')).toHaveCount(10);
    const strips = await page.locator('.strip').evaluateAll((els) => els.map((el) => {
      const line = parseFloat(getComputedStyle(el).lineHeight);
      const inner = el.getBoundingClientRect().height - parseFloat(getComputedStyle(el).paddingBottom);
      return { lines: Math.round(inner / line), overflow: el.scrollWidth > el.clientWidth + 1, text: el.textContent };
    }));
    const bad = strips.filter((s) => s.lines > 1 || s.overflow);
    expect(bad, `${sort}: ${JSON.stringify(bad)}`).toEqual([]);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test('icons, names and labels at 1280 px', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser);
  await page.goto('/?sort=gained&window=month');
  await expect(page.locator('.card')).toHaveCount(10);
  const strips = page.locator('.strip');
  // No word "stars"; one star icon per stat shown.
  expect(await strips.allTextContents()).not.toContainEqual(expect.stringMatching(/stars/i));
  expect(await page.locator('.strip .star').count()).toBeGreaterThanOrEqual(20);
  // Category: readable name, code in the tooltip.
  const cat = page.locator('.strip .category').first();
  expect(await cat.getAttribute('title')).toMatch(/^[a-z-]+(\.[A-Za-z-]+)?$/);
  expect(await cat.textContent()).not.toMatch(/^[a-z-]+\.[A-Za-z-]+$/);
  // Gain span: rows with 2 h of history say "since …", full history says "30D".
  const texts = (await strips.allTextContents()).join('\n');
  expect(texts).toMatch(/since [A-Z][a-z]{2} \d+/);
  expect(texts).toMatch(/30D/);
  // Provisional rates carry the "est." mark with an explanation.
  await page.goto('/?sort=trending&window=all');
  await expect(page.locator('.card')).toHaveCount(10);
  await page.mouse.wheel(0, 20000);
  await expect(page.locator('.card')).toHaveCount(20);
  await expect(page.locator('.strip .est').first()).toHaveAttribute('title', /less than 24 hours/);
  expect(errors).toEqual([]);
  await context.close();
});
