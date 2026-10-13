// Live rendering gate: KaTeX errors, raw TeX, overflow and the v2 path on
// a deployed site. Headless Chromium only.
//
//   node scripts/live-gate.mjs [base-url] [cards]
//   default base https://frontier-beat.github.io, 50 cards per view
//
// Per view (Newest/All, Trending/All, Trending/30d) at 375 and 1280 px:
// KaTeX errors (.katex-error plus red unknown-command spans) and raw TeX
// left in prose, split by summary_version; overflowing cards; console
// errors. Then every v2 summary seen goes through normalizeSummary(text, 2)
// in Node: a valid v2 string must come back unchanged (no v1 side effects).
import { chromium } from '@playwright/test';
import { normalizeSummary } from '../src/lib/normalize.js';

const BASE = (process.argv[2] || 'https://frontier-beat.github.io').replace(/\/$/, '');
const CARDS = Number(process.argv[3] || 50);
const VIEWS = [['new', 'all'], ['trending', 'all'], ['trending', 'month']];
const WIDTHS = [375, 1280];

const browser = await chromium.launch({ headless: true });
const papers = new Map(); // html_link -> API row
let failed = false;

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  for (const [sort, window] of VIEWS) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('response', async (r) => {
      if (!r.url().includes('/top_papers') || r.status() !== 200) return;
      try { for (const p of (await r.json()).repos ?? []) papers.set(p.html_link, p); } catch { /* not JSON */ }
    });
    await page.goto(`${BASE}/?sort=${sort}&window=${window}`);
    await page.locator('.card').first().waitFor({ timeout: 30000 });
    for (let tries = 0; tries < 40 && (await page.locator('.card').count()) < CARDS; tries++) {
      await page.mouse.wheel(0, 20000);
      await page.waitForTimeout(400);
      if (await page.getByText(/End of list/).count()) break;
    }
    const cards = await page.locator('.card').evaluateAll((els, n) => els.slice(0, n).map((card) => {
      const clone = card.cloneNode(true);
      clone.querySelectorAll('.katex, .sr-only, code').forEach((k) => k.remove());
      return {
        link: card.querySelector('.card-title a')?.getAttribute('href') ?? null,
        errors: card.querySelectorAll('.katex-error, .katex [style*="color:#cc0000"], .katex [style*="color: rgb(204, 0, 0)"]').length,
        katex: card.querySelectorAll('.katex').length,
        rawTex: (clone.textContent.match(/\\[A-Za-z]{2,}|\$/g) || []).slice(0, 4),
        overflow: card.scrollWidth > card.clientWidth + 1,
      };
    }), CARDS);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const by = { 1: [], 2: [], '?': [] };
    for (const c of cards) by[papers.get(c.link)?.summary_version ?? '?'].push(c);
    const fmt = (list) => `${list.length} cards, ${list.reduce((a, c) => a + c.katex, 0)} equations, ` +
      `${list.filter((c) => c.errors).length} with KaTeX errors (${list.reduce((a, c) => a + c.errors, 0)} nodes), ` +
      `${list.filter((c) => c.rawTex.length).length} with raw TeX`;
    console.log(`\n[${width}px ${sort}/${window}] ${cards.length} cards | v2: ${fmt(by[2])} | v1: ${fmt(by[1])}` +
      (by['?'].length ? ` | unmatched ${by['?'].length}` : ''));
    for (const c of cards.filter((x) => x.errors || x.rawTex.length)) {
      const p = papers.get(c.link);
      console.log(`   v${p?.summary_version ?? '?'} ${p?.arxiv_id ?? c.link}: errors ${c.errors}, raw TeX ${JSON.stringify(c.rawTex)}`);
    }
    console.log(`   overflowing cards ${cards.filter((c) => c.overflow).length}, page overflow ${pageOverflow}px, console errors ${errors.length}`);
    if (by[2].some((c) => c.errors || c.rawTex.length) || cards.some((c) => c.overflow) || pageOverflow > 0 || errors.length) failed = true;
    await page.close();
  }
  await context.close();
}
await browser.close();

// v2 plain path: normalizeSummary(text, 2) must leave valid v2 text alone.
const v2 = [...papers.values()].filter((p) => p.summary_version === 2);
const changed = v2.filter((p) => normalizeSummary(p.paper_summary, 2) !== p.paper_summary.replace(/\r\n/g, '\n'));
console.log(`\nv2 plain path: ${v2.length} v2 summaries seen, ${changed.length} changed by normalizeSummary(text, 2)`);
for (const p of changed.slice(0, 10)) {
  const a = p.paper_summary.replace(/\r\n/g, '\n');
  const b = normalizeSummary(p.paper_summary, 2);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  console.log(`   ${p.arxiv_id}: first difference at ${i}: ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 30))} -> ${JSON.stringify(b.slice(Math.max(0, i - 30), i + 30))}`);
}
if (changed.length) failed = true;
console.log(failed ? '\nGATE: FAIL' : '\nGATE: PASS');
process.exit(failed ? 1 : 0);
