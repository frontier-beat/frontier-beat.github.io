// Helpers for the paper digest (digest-contract.md): verbatim text with
// $...$ math, and the arXiv-only allowlist for figure images and links.

// Digest fixtures are {arxiv_id, title, ..., digest} or a bare digest as
// the backend writes it (<arxiv_id>.digest.json / .extracted.json).
export function unwrapDigestFixture(data, fileName) {
  return data.digest ? data : { arxiv_id: fileName.replace(/\.(digest|extracted)\.json$/, ''), digest: data };
}

const ARXIV_HOSTS = new Set(['arxiv.org', 'ar5iv.labs.arxiv.org']);

// The URL when it is https on an arXiv host, else null. Figures are
// hotlinked from arXiv only; nothing else is ever requested.
export function imageSrc(url) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return null;
  try {
    return ARXIV_HOSTS.has(new URL(url).hostname) ? url : null;
  } catch {
    return null;
  }
}

export const arxivLink = imageSrc;

const isSpace = (c) => c === undefined || /\s/.test(c);

// Index of the $ that closes inline math opened before `from`, or -1.
// Pandoc's rule: no space just inside either delimiter, no digit right
// after the closing one ("$5 and $10" stays text). A bare $ that cannot
// close, or a blank line, ends the attempt.
function closeInline(text, from) {
  if (isSpace(text[from])) return -1;
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n' && text[j + 1] === '\n') return -1;
    if (c !== '$') continue;
    if (j === from || isSpace(text[j - 1]) || /\d/.test(text[j + 1] ?? '')) return -1;
    return j;
  }
  return -1;
}

function closeDisplay(text, from) {
  for (let j = from; j < text.length - 1; j++) {
    if (text[j] === '\\') { j++; continue; }
    if (text[j] === '$' && text[j + 1] === '$') return text.slice(from, j).trim() ? j : -1;
  }
  return -1;
}

// Extracted text (abstract, captions, citing sentences) is not markdown:
// split it into plain text and math, with \$ as a literal dollar.
export function splitTex(text) {
  if (typeof text !== 'string' || !text) return [];
  const parts = [];
  let buf = '';
  const flush = () => { if (buf) parts.push({ type: 'text', value: buf }); buf = ''; };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && text[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (text[i] !== '$') { buf += text[i++]; continue; }
    const display = text[i + 1] === '$';
    const width = display ? 2 : 1;
    const close = display ? closeDisplay(text, i + 2) : closeInline(text, i + 1);
    if (close === -1) { buf += text.slice(i, i + width); i += width; continue; }
    flush();
    parts.push({ type: 'math', value: text.slice(i + width, close), display });
    i = close + width;
  }
  flush();
  return parts;
}
