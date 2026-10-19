// Copy a backend digest into src/fixtures for the mock API and the tests.
//
//   node scripts/import-digest.mjs <backend digest.json> --title "..." [--category cs.LG]
//
// Writes src/fixtures/<arxiv_id>.digest.json as {arxiv_id, title,
// primary_category, placeholder, digest}. Drops the extractor's per-section
// `text` (not part of the served contract). Empty model-written fields
// (headline, body) are filled with placeholders cut from the extracted text,
// and the file is marked `placeholder: true`, until the prompt worker's
// output replaces them.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { splitTex } from '../src/lib/digest.js';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1]; };
const src = args[0];
if (!src) throw new Error('usage: import-digest.mjs <digest.json> --title "..." [--category cs.LG]');
const digest = JSON.parse(readFileSync(src, 'utf8'));
const arxivId = basename(src).replace(/\.(extracted|digest)?\.?json$/, '');

// Sentences of the extracted text, without its "## subsection" markers.
const sentences = (text) => String(text ?? '').replace(/^#+ .*$/gm, '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [];
// The first n sentences, extended until no $...$ or $$...$$ is cut in half.
const whole = (text) => splitTex(text).every((p) => p.type === 'math' || !p.value.includes('$'));
const lead = (lines, n) => {
  const out = [];
  for (const line of lines) {
    out.push(line.trim());
    if (out.length >= n && whole(out.join(' '))) break;
  }
  return whole(out.join(' ')) ? out.join(' ') : '';
};
const plain = (s) => String(s ?? '').replace(/\$[^$]*\$/g, '').replace(/\s+([,.;:])/g, '$1').replace(/\s{2,}/g, ' ').trim();
const words = (s, n) => { const w = s.split(' '); return w.length > n ? `${w.slice(0, n).join(' ')}…` : s; };

let placeholder = false;
for (const s of digest.sections) {
  const lines = sentences(s.text);
  if (!s.headline) { placeholder = true; s.headline = words(plain(lines[0] ?? s.heading), 25) || s.id; }
  if (!s.body) { placeholder = true; s.body = lead(lines, 3) || s.heading || s.id; }
  delete s.text;
}
for (const f of digest.figures) {
  if (!f.headline) { placeholder = true; f.headline = words(plain(sentences(f.caption)[0] ?? f.caption), 25) || f.label || f.id; }
}

const out = {
  arxiv_id: arxivId,
  title: opt('title') ?? `arXiv ${arxivId}`,
  primary_category: opt('category') ?? 'cs.LG',
  placeholder,
  digest,
};
const dest = new URL(`../src/fixtures/${arxivId}.digest.json`, import.meta.url);
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`${dest.pathname}: ${digest.sections.length} sections, ${digest.figures.length} figures${placeholder ? ', placeholders filled' : ''}`);
