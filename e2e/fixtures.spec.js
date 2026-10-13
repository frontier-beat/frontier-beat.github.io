// F2 gate: every fixture through the production card in a real browser.
// Fails on any KaTeX error in a valid-v2 edge case, any console error, or a
// card wider than the viewport. Prints failing fixture ids for the rest.
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

// Parse errors are .katex-error; unknown commands are red text inside .katex
// without that class. Both use KaTeX's errorColor.
const collect = () => [...document.querySelectorAll('[data-fixture-id]')].map((card) => ({
  id: card.dataset.fixtureId,
  set: card.dataset.fixtureSet,
  errors: card.querySelectorAll('.katex-error, .katex [style*="color:#cc0000"], .katex [style*="color: rgb(204, 0, 0)"]').length,
  overflow: card.scrollWidth > card.clientWidth + 1,
}));

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`fixture page ${name}`, async ({ browser }) => {
    const { context, page, errors } = await openPage(browser, { viewport });
    await page.goto('/?fixtures=1');
    await expect(page.locator('[data-fixture-id]')).toHaveCount(969, { timeout: 60_000 });
    const rows = await page.evaluate(collect);
    const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

    const by = (set) => rows.filter((r) => r.set === set);
    const fmt = (list) => list.map((r) => `${r.id}(${r.errors})`).join(' ') || 'none';
    console.log(`[${name}] edge-v2 with errors: ${fmt(by('edge-v2').filter((r) => r.errors))}`);
    console.log(`[${name}] edge-malformed with errors: ${fmt(by('edge-malformed').filter((r) => r.errors))}`);
    console.log(`[${name}] v1 with errors (${by('v1').filter((r) => r.errors).length}/${by('v1').length}): ${fmt(by('v1').filter((r) => r.errors))}`);
    console.log(`[${name}] cards overflowing: ${rows.filter((r) => r.overflow).map((r) => r.id).join(' ') || 'none'}; document overflow ${docOverflow}px`);

    expect(by('edge-v2').filter((r) => r.errors)).toEqual([]);
    expect(rows.filter((r) => r.overflow)).toEqual([]);
    expect(docOverflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
    await context.close();
  });
}
