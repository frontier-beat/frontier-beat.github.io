// Pre-render clean-up for paper summaries and titles.
//
// The renderer (react-markdown + remark-math + rehype-katex) handles valid
// v2 strings as-is. This module repairs the damage seen in real data before
// the string reaches the markdown parser. See docs/latex-edge-cases.md.

// JSON escape damage: "\text" stored without escaping becomes TAB + "ext",
// "\right" becomes CR + "ight", "\nabla" becomes LF + "abla".
const NEWLINE_COMMANDS = 'abla|eq|eg|u|i|ot|otin|onumber|ewline|leq|geq|mid|parallel|subseteq|exists';

function repairControlChars(s) {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\\?\t(?=[A-Za-z])/g, '\\t')
    .replace(/\\?\r(?=[A-Za-z])/g, '\\r')
    .replace(/\\?\f(?=[A-Za-z])/g, '\\f')
    .replace(/\\?\x08(?=[A-Za-z])/g, '\\b')
    .replace(new RegExp(`\\\\\\n(?=(?:${NEWLINE_COMMANDS})(?![A-Za-z]))`, 'g'), '\\n')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
}

const looksLikeTex = (str) => /\\[A-Za-z]+|[\^_]/.test(str);

// LLMs often emit LaTeX's own delimiters, which markdown reads as escaped
// brackets: \(x\) renders as "(x)". Rewrite them as dollars.
function convertLatexDelimiters(s) {
  return s
    .replace(/\\\[([\s\S]*?)\\\]/g, (m, tex) => (looksLikeTex(tex) ? `\n\n$$\n${tex.trim()}\n$$\n\n` : m))
    .replace(/\\\(([^\n]*?)\\\)/g, (m, tex) => (tex.trim() ? `$${tex.trim()}$` : m));
}

// v1 only: equations written with no delimiters at all, either as a whole
// line or after "Equation ...: ". Wrap a span only when it is TeX-dense
// (has commands, at most one prose word outside \text{}).
function isTexDense(str) {
  if (!/\\[A-Za-z]{2,}/.test(str)) return false;
  const prose = str
    .replace(/\\(?:text|mathrm|textbf|textit|operatorname|mbox)\s*\{[^{}]*\}/g, ' ')
    .replace(/\\[A-Za-z]+/g, ' ')
    .match(/(?:^|[\s(])[A-Za-z]{4,}(?=[\s,.;:)]|$)/g) || [];
  return prose.length <= 1;
}

function wrapBareTex(s) {
  let inDisplay = false;
  return s.split('\n').map((line) => {
    if ((line.match(/\$\$/g) || []).length % 2) inDisplay = !inDisplay;
    if (inDisplay || /[$`]/.test(line)) return line;
    const bullet = line.match(/^(\s*(?:[-*+]|\d+[.)])\s+)?(.*)$/);
    const [, marker = '', body] = bullet;
    if (isTexDense(body)) return marker ? `${marker}$${body.trim()}$` : `$$\n${body.trim()}\n$$`;
    const colon = body.indexOf(': ');
    if (colon === -1) return line;
    const tail = body.slice(colon + 2);
    const cut = tail.search(/,\s+where\b|\.\s|\.$/);
    const tex = cut === -1 ? tail : tail.slice(0, cut);
    if (!isTexDense(tex)) return line;
    return `${marker}${body.slice(0, colon + 2)}$${tex.trim()}$${cut === -1 ? '' : tail.slice(cut)}`;
  }).join('\n');
}

// A "$...$" candidate that wraps plain words and either opens on a digit
// ("$5 and $10") or has a space just inside a dollar ("$x and $y$") is not
// math: the dollars are currency or mispaired.
const isProse = (content) =>
  !/[\\^_{}=]/.test(content) && /(^|\s)[A-Za-z]{3,}(\s|$)/.test(content);
const isMispaired = (content) => isProse(content) && /^\d|^\s|\s$/.test(content);

// Index of the "$" closing an inline span opened just before `from`, or -1.
// Inline math may wrap a line but never crosses a blank line.
function findInlineClose(s, from) {
  for (let j = from; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n' && s[j + 1] === '\n') return -1;
    if (c === '$') return j;
  }
  return -1;
}

// Split markdown into text / code / inline-math / display-math tokens,
// escaping any "$" that cannot open valid math (currency, unmatched).
export function tokenize(s) {
  const out = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ type: 'text', value: buf });
    buf = '';
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      buf += s.slice(i, i + 2);
      i += 2;
    } else if (c === '`') {
      let n = 1;
      while (s[i + n] === '`') n++;
      const fence = '`'.repeat(n);
      let j = s.indexOf(fence, i + n);
      while (j !== -1 && s[j + n] === '`') j = s.indexOf(fence, j + n + 1);
      if (j === -1) {
        buf += fence;
        i += n;
      } else {
        flush();
        out.push({ type: 'code', value: s.slice(i, j + n) });
        i = j + n;
      }
    } else if (c === '$' && s[i + 1] === '$') {
      const j = s.indexOf('$$', i + 2);
      if (j === -1) {
        buf += '\\$\\$';
        i += 2;
      } else {
        flush();
        out.push({ type: 'display', value: s.slice(i + 2, j) });
        i = j + 2;
      }
    } else if (c === '$') {
      const j = findInlineClose(s, i + 1);
      const content = j === -1 ? '' : s.slice(i + 1, j);
      if (j === -1 || isMispaired(content)) {
        buf += '\\$';
        i += 1;
      } else {
        flush();
        out.push({ type: 'inline', value: content });
        i = j + 1;
      }
    } else {
      buf += c;
      i += 1;
    }
  }
  flush();
  return out;
}

// Map each unescaped occurrence of `ch` through `fn`, skipping \x escapes.
const mapUnescaped = (tex, ch, fn) =>
  tex.replace(new RegExp(`\\\\[\\s\\S]|\\${ch}`, 'g'), (m) => (m === ch ? fn(m) : m));

const GREEK = 'alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega';
// Math-only symbols that turn up inside \text{} and are undefined in text mode.
const MATH_IN_TEXT = new RegExp(`\\\\(?:${GREEK}|cdot|times|leq?|geq?|neq|in|infty|pm|to|rightarrow|approx|sim|cdots)(?![A-Za-z])`, 'g');

// Inside \text{...} the content is text mode, where "_" is a parse error and
// math symbols are undefined: escape the one, re-enter math for the other.
function escapeTextArgs(tex) {
  const re = /\\(?:text|textrm|textbf|textit|texttt|textsf|mbox)\s*\{/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(tex))) {
    let depth = 1;
    let j = re.lastIndex;
    for (; j < tex.length && depth; j++) {
      if (tex[j] === '\\') j++;
      else if (tex[j] === '{') depth++;
      else if (tex[j] === '}') depth--;
    }
    const arg = mapUnescaped(tex.slice(re.lastIndex, j), '_', () => '\\_').replace(MATH_IN_TEXT, (c) => `\\(${c}\\)`);
    out += tex.slice(last, re.lastIndex) + arg;
    last = j;
    re.lastIndex = j;
  }
  return out + tex.slice(last);
}

function balanceBraces(tex) {
  let depth = 0;
  let missingOpen = 0;
  tex.replace(/\\[\s\S]|[{}]/g, (m) => {
    if (m === '{') depth++;
    else if (m === '}') depth ? depth-- : missingOpen++;
    return m;
  });
  return '{'.repeat(missingOpen) + tex + '}'.repeat(depth);
}

// Fixes that never change valid KaTeX input, only make invalid input parse.
function mathSafety(tex) {
  let t = tex.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, '~');
  t = t.replace(/\\(?:label|ref|eqref)\{[^{}]*\}/g, '');
  // Numbered environments are display-only in KaTeX; summaries never need numbers.
  t = t.replace(/\\(begin|end)\{(?:equation|displaymath)\*?\}/g, '')
    .replace(/\\(begin|end)\{(align|gather)\*?\}/g, '\\$1{$2ed}');
  t = mapUnescaped(t, '%', () => '\\%'); // a comment is never intended in a summary
  if (!/\\begin\{/.test(t)) t = mapUnescaped(t, '&', () => '\\&'); // "&" only aligns inside environments
  return balanceBraces(escapeTextArgs(t));
}

const PLACEHOLDER = /^[a-z]{3,}(?:_[a-z0-9]+)+$/;

// Commands seen in v1 data that KaTeX lacks, mapped to the nearest it has.
const LEGACY_ALIASES = [
  [/\\textunderscore\b/g, '\\_'],
  [/\\mathbbm\b/g, '\\mathbb'],
  [/\\bigints+\b/g, '\\int'],
  [/\\\*/g, '*'],
];
const legacyMath = (tex) => LEGACY_ALIASES.reduce(
  (t, [re, to]) => t.replace(re, to),
  tex.replace(/\\{2,}(?=[A-Za-z])/g, '\\').replace(/\\_/g, '_'),
);
const fixMath = (tex, legacy) => mathSafety(legacy ? legacyMath(tex) : tex);

const BARE_GREEK = new RegExp(`\\\\(?:${GREEK})(?![A-Za-z])(?:_\\{[^{}$]*\\}|_[A-Za-z0-9])?`, 'g');

function joinTokens(tokens, legacy) {
  const parts = tokens.map((t) => {
    switch (t.type) {
      case 'inline':
        if (legacy && PLACEHOLDER.test(t.value)) return t.value;
        return `$${fixMath(t.value, legacy)}$`;
      case 'display':
        if (!legacy) return `$$${fixMath(t.value, false)}$$`;
        // Display math on its own lines, surrounded by blank lines (contract rule 2).
        return `\u0000$$\n${fixMath(t.value.trim().replace(/\\+$/, '').trimEnd(), true)}\n$$\u0000`;
      case 'text': {
        // "__init__" is a Python name, not bold (the contract's bold is **).
        const v = t.value.replace(/(^|[^\w\\])__([A-Za-z][\w]*?)__(?![\w])/g, (m, pre, name) => `${pre}\\_\\_${name}\\_\\_`);
        // v1: a lone Greek command in prose ("with \theta fixed").
        return legacy ? v.replace(BARE_GREEK, (m) => `$${m}$`) : v;
      }
      default:
        return t.value;
    }
  });
  let s = parts.join('');
  if (legacy) {
    s = s
      .replace(/[ \t]*\n?[ \t]*\u0000/g, '\u0000')
      .replace(/\u0000[ \t]*\n?[ \t]*/g, '\u0000')
      .replace(/\u0000+/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return s;
}

export function normalizeSummary(text, version = 2) {
  if (typeof text !== 'string') return '';
  const legacy = version < 2;
  let s = convertLatexDelimiters(repairControlChars(text));
  if (legacy) s = wrapBareTex(s.replace(/\\{2,}(?=[A-Za-z])/g, '\\'));
  return joinTokens(tokenize(s), legacy);
}

export function normalizeTitle(title) {
  if (typeof title !== 'string') return '';
  const s = joinTokens(tokenize(repairControlChars(title).replace(/\s+/g, ' ').trim()), false);
  // A title is one inline run: neutralise markers that would start a block.
  return s.replace(/^(#{1,6}|[-+*>])(?=\s)/, '\\$1').replace(/^(\d+)([.)])(?=\s)/, '$1\\$2');
}
