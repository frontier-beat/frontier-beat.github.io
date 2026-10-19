// Every string in each digest fixture through the real renderers, plus the
// closed state of the card body. The browser gate is e2e/digest.spec.js.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Summary, TexText } from '../components/Markdown';
import Digest from '../components/Digest';
import { proseOnly } from './proseOnly';
import { unwrapDigestFixture as unwrap } from './digest';

const FIXTURES = new URL('../fixtures/', import.meta.url);
const local = readdirSync(FIXTURES).filter((f) => /digest.*\.json$/.test(f))
  .map((f) => unwrap(JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8')), f));

// Raw TeX a reader would see: a command name, or a $ that is not currency.
const RAW_TEX = /\\[A-Za-z]{2,}|\$(?!\d)/g;

function audit(html) {
  return { errors: (html.match(/#cc0000/g) || []).length, raw: proseOnly(html).match(RAW_TEX) || [] };
}

// Each extracted string (abstract, headings, captions, citing sentences)
// goes through TexText; each model-written body through Summary.
function checkDigest({ arxiv_id: id, digest }) {
  const items = [
    ['abstract', <TexText text={digest.abstract} paragraphs />],
    ...digest.sections.flatMap((s) => [
      [`${s.id} heading`, <TexText text={s.heading} />],
      [`${s.id} headline`, <>{s.headline}</>],
      [`${s.id} body`, <Summary text={s.body} version={2} />],
    ]),
    ...digest.figures.flatMap((f) => [
      [`${f.id} headline`, <>{f.headline}</>],
      [`${f.id} caption`, <TexText text={f.caption} />],
      ...f.citing_sentences.map((c, i) => [`${f.id} citing ${i}`, <TexText text={c} />]),
    ]),
  ];
  return items.map(([where, el]) => ({ id, where, ...audit(renderToStaticMarkup(el)) }))
    .filter((r) => r.errors || r.raw.length);
}

describe('digest fixtures', () => {
  it('exist (hand-made edge cases at least)', () => {
    expect(local.map((d) => d.arxiv_id)).toContain('edge.digest');
  });

  it('render with no KaTeX errors and no raw TeX', () => {
    expect(local.flatMap(checkDigest)).toEqual([]);
  });

  it('assign every figure to exactly one section', () => {
    for (const { digest } of local) {
      const placed = digest.sections.flatMap((s) => s.figure_ids);
      expect([...placed].sort()).toEqual(digest.figures.map((f) => f.id).sort());
    }
  });

  it('render closed: one toggle per section plus the abstract, no images, no bodies', () => {
    const { arxiv_id, digest } = local.find((d) => d.arxiv_id === 'edge.digest');
    const paper = {
      arxiv_id,
      has_digest: true,
      digest_headlines: digest.sections.map((s) => ({ id: s.id, heading: s.heading, headline: s.headline, figure_count: s.figure_ids.length })),
    };
    const html = renderToStaticMarkup(<Digest paper={paper} />);
    expect((html.match(/<details/g) || []).length).toBe(digest.sections.length + 1);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).not.toMatch(/<img/);
    expect(html).not.toMatch(/katex/);
    expect(html).toContain('Abstract');
    for (const s of digest.sections) expect(html).toContain(s.headline.replace(/'/g, '&#x27;'));
    expect(html).toContain('2 figures');
    expect(html).toContain('3 figures');
    expect(html).toContain('1 figure<');
    expect(html).not.toContain('0 figures');
  });
});

// Optional: live digests saved as JSON files (a file or a directory of them).
const liveDir = process.env.DIGEST_FIXTURES;
describe.runIf(liveDir && existsSync(liveDir))('live digests', () => {
  it('render with no KaTeX errors and no raw TeX', () => {
    const files = statSync(liveDir).isDirectory() ? readdirSync(liveDir).filter((f) => f.endsWith('.json')).map((f) => join(liveDir, f)) : [liveDir];
    const digests = files.flatMap((f) => {
      const data = JSON.parse(readFileSync(f, 'utf8'));
      return Array.isArray(data) ? data : [unwrap(data, f.split('/').pop())];
    });
    const bad = digests.flatMap(checkDigest);
    console.log(`live digests: ${digests.length}, ${new Set(bad.map((b) => b.id)).size} with problems`);
    for (const b of bad.slice(0, 30)) console.log('  ', b.id, b.where, b.errors, b.raw);
    expect(bad).toEqual([]);
  });
});
