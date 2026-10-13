import { describe, expect, it } from 'vitest';
import { normalizeSummary, normalizeTitle, tokenize } from './normalize';

const TAB = '\t';
const CR = '\r';

describe('control-character repair (JSON escape damage, any version)', () => {
  it('restores \\t eaten by JSON (TAB + letters)', () => {
    expect(normalizeSummary(`$\\${TAB}ext{IR}$`, 1)).toBe('$\\text{IR}$');
    expect(normalizeSummary(`$${TAB}heta$`, 2)).toBe('$\\theta$');
  });
  it('restores \\r and \\n command prefixes', () => {
    expect(normalizeSummary(`$\\left[x\\${CR}ight]$`, 1)).toBe('$\\left[x\\right]$');
    expect(normalizeSummary('$\\\nabla f$', 1)).toBe('$\\nabla f$');
  });
  it('normalises CRLF', () => {
    expect(normalizeSummary('a\r\nb', 2)).toBe('a\nb');
  });
});

describe('legacy (v1) normalisation', () => {
  it('collapses doubled backslashes before commands', () => {
    expect(normalizeSummary('$O(h \\\\log_2(k))$', 1)).toBe('$O(h \\log_2(k))$');
  });
  it('keeps \\\\ row breaks', () => {
    const s = '$$\n\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}\n$$';
    expect(normalizeSummary(s, 1)).toBe(s);
  });
  it('unescapes \\_ inside math only', () => {
    expect(normalizeSummary('$L\\_{total}$ and snake\\_case', 1)).toBe('$L_{total}$ and snake\\_case');
  });
  it('moves inline $$ onto their own lines', () => {
    expect(normalizeSummary('loss: $$x = 1$$ more', 1)).toBe('loss:\n\n$$\nx = 1\n$$\n\nmore');
  });
  it('drops a dangling backslash at the end of display math', () => {
    expect(normalizeSummary('$$\nx = 1\\\n$$', 1)).toBe('$$\nx = 1\n$$');
  });
  it('renders placeholder keys as plain text', () => {
    expect(normalizeSummary('see $loss_term$ here', 1)).toBe('see loss_term here');
    expect(normalizeSummary('see $y_i$ here', 1)).toBe('see $y_i$ here');
  });
  it('leaves v2 strings alone apart from safety fixes', () => {
    expect(normalizeSummary('$O(h \\\\log k)$', 2)).toBe('$O(h \\\\log k)$');
  });
});

describe('dollar balancing (any version)', () => {
  it('escapes an unmatched currency dollar', () => {
    expect(normalizeSummary('costs only $0.34.', 2)).toBe('costs only \\$0.34.');
  });
  it('escapes paired currency dollars around prose', () => {
    expect(normalizeSummary('between $5 and $10 per hour', 2)).toBe('between \\$5 and \\$10 per hour');
  });
  it('keeps math that starts with a digit', () => {
    expect(normalizeSummary('$2^n$ states and $10\\%$ more', 2)).toBe('$2^n$ states and $10\\%$ more');
  });
  it('escapes a trailing unmatched dollar', () => {
    expect(normalizeSummary('value $x and $y$ too', 2)).toBe('value \\$x and $y$ too');
  });
  it('ignores dollars in code spans and escaped dollars', () => {
    const s = 'run `echo $HOME` for \\$5 and $x$';
    expect(normalizeSummary(s, 2)).toBe(s);
  });
  it('is idempotent on valid v2 text', () => {
    const s = '**Main idea.** We use $\\mathbb{E}[x]$.\n\n$$\n\\frac{a}{b}\n$$\n\n- item $y_i$';
    expect(normalizeSummary(s, 2)).toBe(s);
    expect(normalizeSummary(normalizeSummary(s, 1), 1)).toBe(normalizeSummary(s, 1));
  });
  it('tolerates non-strings', () => {
    expect(normalizeSummary(null)).toBe('');
  });
});

describe('tokenize', () => {
  it('splits text, code, inline and display math', () => {
    expect(tokenize('a `b$` $c$ $$d$$').map((t) => t.type)).toEqual(
      ['text', 'code', 'text', 'inline', 'text', 'display'],
    );
  });
});

describe('normalizeTitle', () => {
  it('repairs math and escapes block markers', () => {
    expect(normalizeTitle(`$\\${TAB}exttt{metabench}$ -- A Benchmark`)).toBe('$\\texttt{metabench}$ -- A Benchmark');
    expect(normalizeTitle('1. Intro to things')).toBe('1\\. Intro to things');
    expect(normalizeTitle('# Hash title')).toBe('\\# Hash title');
  });
});

describe('delimiter repair', () => {
  it('rewrites \\( \\) and \\[ \\] as dollars', () => {
    expect(normalizeSummary('connections \\(\\frac{L}{2}\\) for \\(L\\) layers', 2)).toBe('connections $\\frac{L}{2}$ for $L$ layers');
    expect(normalizeSummary('cite \\[1\\] here', 2)).toBe('cite \\[1\\] here');
  });
  it('wraps undelimited TeX in v1', () => {
    expect(normalizeSummary('Equation: \\text{Loss} = \\sum_i \\ell_i, where it is used', 1))
      .toBe('Equation: $\\text{Loss} = \\sum_i \\ell_i$, where it is used');
    expect(normalizeSummary('intro\n\\min_{\\gamma} \\int c \\, d\\gamma\nafter', 1))
      .toBe('intro\n\n$$\n\\min_{\\gamma} \\int c \\, d\\gamma\n$$\n\nafter');
    expect(normalizeSummary('We use \\textbf in prose rarely', 1)).toBe('We use \\textbf in prose rarely');
  });
});

describe('identifiers in prose', () => {
  it('keeps __dunder__ names literal instead of bold', () => {
    expect(normalizeSummary('the __init__ hook and **bold**', 2)).toBe('the \\_\\_init\\_\\_ hook and **bold**');
  });
});

describe('review findings', () => {
  it('escapes currency pairs joined by short words', () => {
    expect(normalizeSummary('costs $5 to $10 per run', 2)).toBe('costs \\$5 to \\$10 per run');
    expect(normalizeSummary('from $100M vs $200M', 2)).toBe('from \\$100M vs \\$200M');
  });
  it('leaves \\( \\) inside code spans alone', () => {
    const s = 'regex `\\(foo_bar\\)` and math \\(x\\)';
    expect(normalizeSummary(s, 2)).toBe('regex `\\(foo_bar\\)` and math $x$');
  });
  it('keeps a real tab in prose as whitespace', () => {
    expect(normalizeSummary('Results:\tAccuracy 92', 2)).toBe('Results: Accuracy 92');
    expect(normalizeSummary(`$${TAB}imes$`, 1)).toBe('$\\times$');
  });
  it('does not wrap TeX inside fenced code', () => {
    const s = '```\nloss = \\alpha \\cdot \\ell_1\n```';
    expect(normalizeSummary(s, 1)).toBe(s);
  });
});
