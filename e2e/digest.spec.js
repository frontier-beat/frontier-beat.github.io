// Paper digest toggles (Eric 2026-10-19) against the mock API. Runs in
// Chromium and in WebKit (one browser per project, see playwright.config.js).
import { test, expect } from '@playwright/test';
import { VIEWPORTS, openPage } from './helpers';

const IMAGE_HOSTS = /^https:\/\/(arxiv\.org|ar5iv\.labs\.arxiv\.org|evil\.example)\//;
const PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600"><rect width="1200" height="600" fill="#ddd"/><path d="M0 600 L1200 0" stroke="#333" stroke-width="8"/></svg>';
// A $ that is not currency, or a TeX command name, left in visible text.
const RAW_TEX = /\\[A-Za-z]{2,}|\$(?!\d)/g;

// Serve figure images locally and record every image and digest request.
async function openDigestPage(browser, opts) {
  const ctx = await openPage(browser, opts);
  const images = [];
  const digests = [];
  await ctx.context.route(IMAGE_HOSTS, (route) => {
    images.push(route.request().url());
    return route.fulfill({ contentType: 'image/svg+xml', body: PLACEHOLDER });
  });
  ctx.page.on('request', (r) => { if (/\/data\/digests\/[^/]+\.json$/.test(r.url())) digests.push(r.url()); });
  return { ...ctx, images, digests };
}

const digestCard = (page) => page.locator('.card').filter({ has: page.locator('.digest') }).first();

// Chromium only: the expanded state the accessibility tree reports for a summary.
async function axExpanded(page, summary) {
  const cdp = await page.context().newCDPSession(page);
  await summary.evaluate((el) => el.setAttribute('data-ax-probe', ''));
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.querySelector("[data-ax-probe]")' });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId: result.objectId, fetchRelatives: false });
  await summary.evaluate((el) => el.removeAttribute('data-ax-probe'));
  await cdp.detach();
  return nodes[0]?.properties?.find((p) => p.name === 'expanded')?.value?.value ?? null;
}

// Opens every toggle in the card: top level first (fetches the digest),
// then the figures that appear inside the sections.
async function openAll(card) {
  await expect(card.locator('.digest')).toBeVisible(); // count() does not wait
  const top = card.locator('.digest > details > summary');
  for (let i = 0; i < await top.count(); i++) await top.nth(i).click();
  await expect(card.locator('.digest-loading')).toHaveCount(0);
  const figures = card.locator('details.figure > summary');
  for (let i = 0; i < await figures.count(); i++) await figures.nth(i).click();
}

async function audit(page) {
  return page.evaluate((re) => {
    const raw = new RegExp(re, 'g');
    const cards = [...document.querySelectorAll('.card')].map((card) => {
      const clone = card.cloneNode(true);
      clone.querySelectorAll('.katex, .sr-only, code').forEach((k) => k.remove());
      return {
        title: card.querySelector('.card-title')?.textContent.slice(0, 40),
        errors: card.querySelectorAll('.katex-error, .katex [style*="color:#cc0000"], .katex [style*="color: rgb(204, 0, 0)"]').length,
        raw: clone.textContent.match(raw) || [],
        overflow: card.scrollWidth > card.clientWidth + 1,
        wideImages: [...card.querySelectorAll('img')].filter((img) => img.getBoundingClientRect().width > card.clientWidth).length,
      };
    });
    return { cards, pageOverflow: document.documentElement.scrollWidth - window.innerWidth };
  }, RAW_TEX.source);
}

for (const theme of ['light', 'dark']) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`digest ${theme} ${name}: closed on load, keyboard, lazy images, every toggle clean`, async ({ browser, browserName }) => {
      const { context, page, errors, images, digests } = await openDigestPage(browser, { theme, viewport });
      await page.goto('/');
      const card = digestCard(page);
      await expect(card).toBeVisible();

      // Closed on load: abstract + one toggle per section, no bodies, no requests.
      const toggles = card.locator('.digest > details');
      await expect(toggles.first().locator('summary')).toHaveText(/Abstract/);
      expect(await toggles.count()).toBeGreaterThanOrEqual(2);
      expect(await card.locator('details[open]').count()).toBe(0);
      expect(await card.locator('.katex, img').count()).toBe(0);
      expect(digests).toEqual([]);
      expect(images).toEqual([]);
      // Papers without a digest keep the v2 paragraph.
      const plain = page.locator('.card').filter({ hasNot: page.locator('.digest') }).first();
      await expect(plain.locator(':scope > .summary')).toBeVisible();

      // Keyboard: Enter opens, Space closes; open and the exposed state follow.
      const section = toggles.nth(1);
      const summary = section.locator(':scope > summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(section).toHaveJSProperty('open', true);
      if (browserName === 'chromium') expect(await axExpanded(page, summary)).toBe(true);
      await expect(section.locator('.digest-body')).toBeVisible();
      await page.keyboard.press(' ');
      await expect(section).toHaveJSProperty('open', false);
      if (browserName === 'chromium') expect(await axExpanded(page, summary)).toBe(false);
      await page.keyboard.press(' ');
      await expect(section).toHaveJSProperty('open', true);
      await page.keyboard.press('Enter');
      await expect(section).toHaveJSProperty('open', false);
      expect(digests).toHaveLength(1);

      // Open every section: still no image requests until a figure opens.
      const top = card.locator('.digest > details > summary');
      for (let i = 0; i < await top.count(); i++) await top.nth(i).click();
      await expect(card.locator('.digest-loading')).toHaveCount(0);
      await expect(card.locator('details.figure').first()).toBeVisible();
      expect(images).toEqual([]);
      expect(await card.locator('img').count()).toBe(0);

      // One figure: exactly its image.
      const first = card.locator('details.figure').first();
      await first.locator('summary').click();
      await expect(first.locator('img')).toBeVisible();
      await expect.poll(() => images.length).toBe(1);
      expect(images[0]).toBe(await first.locator('img').getAttribute('src'));

      // Everything open, on every card of the first page.
      const figures = card.locator('details.figure > summary');
      for (let i = 1; i < await figures.count(); i++) await figures.nth(i).click();
      const others = page.locator('.card').filter({ has: page.locator('.digest') });
      const cards = await others.count();
      for (let i = 1; i < cards; i++) await openAll(others.nth(i));
      expect(await page.locator('.digest details:not([open])').count()).toBe(0);
      await page.waitForLoadState('networkidle');
      expect(images.filter((u) => !/^https:\/\/(arxiv\.org|ar5iv\.labs\.arxiv\.org)\//.test(u))).toEqual([]);
      expect(digests).toHaveLength(cards);

      const result = await audit(page);
      const bad = result.cards.filter((c) => c.errors || c.raw.length || c.overflow || c.wideImages);
      expect(bad, JSON.stringify(bad)).toEqual([]);
      expect(result.pageOverflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      await context.close();
    });
  }
}

test('figures: inline SVG gets caption and arXiv link, foreign image never loads, caption and citing text verbatim', async ({ browser }) => {
  const { context, page, images, errors } = await openDigestPage(browser);
  await page.goto('/');
  const card = page.locator('.card').filter({ hasText: 'Edge cases for the paper digest renderer' });
  await openAll(card);

  const inline = card.locator('details.figure').filter({ hasText: 'Figure 3:' });
  await expect(inline.locator('img, svg')).toHaveCount(0);
  await expect(inline.getByRole('link', { name: 'View on arXiv' })).toHaveAttribute('href', 'https://arxiv.org/html/2610.00001v1#S3.F3');
  await expect(inline.locator('figcaption')).toHaveText('Figure 3: Accuracy on the five benchmarks (higher is better).');

  const foreign = card.locator('details.figure').filter({ hasText: 'Figure 5:' });
  await expect(foreign.locator('img')).toHaveCount(0);
  await expect(foreign.getByRole('link', { name: 'View on arXiv' })).toBeVisible();
  expect(images.filter((u) => u.includes('evil.example'))).toEqual([]);

  const none = card.locator('details.figure').filter({ hasText: 'Figure 6:' });
  await expect(none.locator('img')).toHaveCount(0);
  await expect(none.getByRole('link', { name: 'View on arXiv' })).toHaveAttribute('href', 'https://arxiv.org/html/2610.00001v1#S4.F7');

  // Multi-panel: every panel, in order, each lazy and from arXiv.
  const panels = card.locator('details.figure').filter({ hasText: 'Figure 2:' }).locator('img');
  await expect(panels).toHaveCount(2);
  expect(await panels.evaluateAll((els) => els.map((e) => [e.getAttribute('src'), e.loading]))).toEqual([
    ['https://arxiv.org/html/2610.00001v1/overview_figure.svg', 'lazy'],
    ['https://arxiv.org/html/2610.00001v1/x2b.png', 'lazy'],
  ]);

  const raster = card.locator('details.figure').filter({ hasText: 'Figure 1:' });
  await expect(raster.locator('img')).toHaveAttribute('loading', 'lazy');
  await expect(raster.locator('img')).toHaveAttribute('width', '1200');
  await expect(raster.locator('img')).toHaveAttribute('height', '600');
  await expect(raster.locator('.citing li')).toHaveCount(2);
  await expect(raster.locator('.citing li').first()).toHaveText('Figure 1 shows the attention pattern for one layer.');

  // Section with no figures has no figure mark; appendix carries its figure.
  await expect(card.locator('.digest > details').filter({ hasText: 'Each token looks at' }).locator('.figure-count')).toHaveCount(0);
  await expect(card.locator('.digest > details').filter({ hasText: 'Each token looks at' }).locator('details.figure')).toHaveCount(0);
  await expect(card.locator('.digest > details').last().locator('details.figure')).toHaveCount(1);
  // Abstract verbatim, two paragraphs, currency kept as text.
  const abstract = card.locator('.digest > details').first();
  await expect(abstract.locator('.digest-body p')).toHaveCount(2);
  await expect(abstract.locator('.digest-body')).toContainText('Training costs under $5 per run and about $3 per GPU-hour');
  expect(errors).toEqual([]);
  await context.close();
});

test('digest 404 falls back to the v2 paragraph; errors offer retry', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser);
  await page.route('**/data/digests/*.json', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no digest"}' }));
  await page.goto('/');
  const card = page.locator('.card').filter({ hasText: 'Edge cases for the paper digest renderer' });
  await card.locator('.digest > details > summary').nth(1).click();
  await expect(card.locator(':scope > .summary')).toContainText('Fallback v2 paragraph');
  await expect(card.locator('.digest')).toHaveCount(0);

  const other = await openPage(browser);
  await other.page.route('**/data/digests/*.json', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }));
  await other.page.goto('/');
  const card2 = other.page.locator('.card').filter({ hasText: 'Edge cases for the paper digest renderer' });
  await card2.locator('.digest > details > summary').first().click();
  await expect(card2.locator('.digest-error')).toContainText('HTTP 500: boom');
  await other.page.unroute('**/data/digests/*.json');
  await card2.getByRole('button', { name: 'Retry' }).click();
  await expect(card2.locator('.digest > details').first().locator('.digest-body')).toContainText('sparse attention');
  // The only console lines are the browser's own logs of the stubbed failures.
  const failures = /Failed to load resource: the server responded with a status of (404|500)/;
  expect([...errors, ...other.errors].filter((e) => !failures.test(e))).toEqual([]);
  await other.context.close();
  await context.close();
});

test('an open toggle stays open when the digest arrives, even if its sections differ from the list row', async ({ browser }) => {
  const { context, page, errors } = await openPage(browser);
  await page.route('**/data/digests/edge.digest.json', async (route) => {
    const res = await route.fetch();
    const digest = await res.json();
    digest.sections.push({ id: 'X9', heading: 'Late section', headline: 'A section the list row did not have.', body: 'Body of the late section.', figure_ids: [] });
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ response: res, json: digest });
  });
  await page.goto('/');
  const card = page.locator('.card').filter({ hasText: 'Edge cases for the paper digest renderer' });
  const section = card.locator('.digest > details').nth(2);
  await section.locator('summary').click();
  await expect(section.locator('.digest-loading')).toBeVisible();
  await expect(section.locator('.digest-body .summary')).toContainText('For a query');
  await expect(section).toHaveJSProperty('open', true);
  await expect(card.locator('.digest > details').last()).toContainText('A section the list row did not have.');
  // Math in a heading keeps its case (the meta label is uppercase).
  const scaling = card.locator('.digest > details').filter({ hasText: 'On five long-text benchmarks' });
  await scaling.locator('summary').click();
  expect(await scaling.locator('.digest-heading .katex').first().evaluate((el) => getComputedStyle(el).textTransform)).toBe('none');
  expect(errors).toEqual([]);
  await context.close();
});

test('a 404 digest is remembered: after a ranking switch the card starts on its paragraph', async ({ browser }) => {
  const { context, page } = await openPage(browser);
  const requests = [];
  await page.route('**/data/digests/edge.digest.json', (r) => { requests.push(r.request().url()); return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no digest"}' }); });
  await page.goto('/');
  const card = () => page.locator('.card').filter({ hasText: 'Edge cases for the paper digest renderer' });
  await card().locator('.digest > details > summary').first().click();
  await expect(card().locator(':scope > .summary')).toBeVisible();
  await page.getByText('Most stars', { exact: true }).click();
  await expect(page).toHaveURL(/sort=stars/);
  await expect(card().locator(':scope > .summary')).toBeVisible();
  await expect(card().locator('.digest')).toHaveCount(0);
  expect(requests).toHaveLength(1);
  await context.close();
});
