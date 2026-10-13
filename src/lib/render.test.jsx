// Fast server-side check of every fixture through the real renderer.
// The browser check (e2e/fixtures.spec.js) is the authoritative gate; this
// one runs in a second and prints the failure classes while iterating.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Summary, Title } from '../components/Markdown';
import edgeCases from '../fixtures/edge-cases.json';
import legacy from '../fixtures/summaries-2024.json';

// Drop KaTeX output (balanced <span class="katex...">) so only prose remains.
function proseOnly(html) {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const start = html.indexOf('<span class="katex', i);
    if (start === -1) { out += html.slice(i); break; }
    out += html.slice(i, start);
    let depth = 0;
    let j = start;
    const re = /<span\b|<\/span>/g;
    re.lastIndex = start;
    let m;
    while ((m = re.exec(html))) {
      depth += m[0] === '</span>' ? -1 : 1;
      if (depth === 0) { j = re.lastIndex; break; }
    }
    i = j > start ? j : html.length;
  }
  return out.replace(/<[^>]+>/g, '');
}

function check(row) {
  const html = renderToStaticMarkup(
    <>
      <Title text={row.title} />
      <Summary text={row.paper_summary} version={row.summary_version ?? 1} />
    </>,
  );
  // Parse errors become .katex-error; unknown commands become red text inside
  // .katex without that class. Both carry KaTeX's errorColor.
  const errors = (html.match(/#cc0000/g) || []).length;
  const prose = proseOnly(html);
  const strayTex = prose.match(/\\[A-Za-z]{2,}|\$/g) || [];
  return { id: row.id ?? row.arxiv_id, errors, strayTex };
}

describe('renderer over fixtures', () => {
  it('renders valid v2 edge cases with no KaTeX errors and no stray TeX', () => {
    const bad = edgeCases.filter((r) => r.valid_v2).map(check).filter((r) => r.errors || r.strayTex.length);
    expect(bad).toEqual([]);
  });

  it('survives malformed edge cases (report only)', () => {
    const results = edgeCases.filter((r) => !r.valid_v2).map(check);
    console.log('malformed edge cases:', results.filter((r) => r.errors || r.strayTex.length));
  });

  it('survives all 2024 v1 summaries (report only)', () => {
    const results = legacy.map(check);
    const withErrors = results.filter((r) => r.errors);
    const withStray = results.filter((r) => r.strayTex.length);
    console.log(`v1: ${results.length} rows, ${withErrors.length} with .katex-error, ${withStray.length} with visible TeX`);
    console.log('errors:', withErrors.map((r) => `${r.id}(${r.errors})`).join(' '));
    console.log('stray:', withStray.slice(0, 40).map((r) => `${r.id}[${r.strayTex.slice(0, 3).join(' ')}]`).join(' '));
  });
});
