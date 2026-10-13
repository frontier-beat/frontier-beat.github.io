import { describe, expect, it } from 'vitest';
import { categoryName, gainSpan, signed } from './strip';

describe('categoryName', () => {
  it('uses the readable names Eric asked for', () => {
    expect(categoryName('cs.CL')).toBe('Language (NLP)');
    expect(categoryName('cs.CV')).toBe('Computer Vision');
    expect(categoryName('stat.ML')).toBe('Machine Learning (Statistics)');
    expect(categoryName('eess.AS')).toBe('Audio and Speech');
  });
  it('covers the wider taxonomy', () => {
    expect(categoryName('q-bio.NC')).toBe('Neurons and Cognition');
    expect(categoryName('physics.optics')).toBe('Optics');
    expect(categoryName('quant-ph')).toBe('Quantum Physics');
  });
  it('falls back to the code', () => {
    expect(categoryName('xx.YY')).toBe('xx.YY');
    expect(categoryName(null)).toBe(null);
  });
});

describe('gainSpan', () => {
  const now = Date.parse('2026-10-13T18:30:00Z');
  const utc = (p, w) => gainSpan(p, w, now, 'UTC');
  it('uses the window label when no gained_since is known', () => {
    expect(utc({}, 'month')).toBe('30d');
  });
  it('parses Postgres-style timestamps', () => {
    expect(utc({ gained_since: '2026-10-13 16:05:00+00' }, 'month')).toBe('since Oct 13');
    expect(utc({ gained_since: 'not a date' }, 'week')).toBe('7d');
  });
  it('uses the window label when history covers the window', () => {
    expect(utc({ gained_since: '2026-09-13T18:00:00Z' }, 'month')).toBe('30d');
    expect(utc({ gained_since: '2026-10-12T18:40:00Z' }, 'day')).toBe('24h');
  });
  it('labels the real span when history is shorter than the window', () => {
    expect(utc({ gained_since: '2026-10-13T16:05:00Z' }, 'month')).toBe('since Oct 13');
    expect(utc({ gained_since: '2024-08-06T00:00:00Z' }, 'all')).toBe('since Aug 6, 2024');
  });
  it('formats the date in the given time zone', () => {
    expect(gainSpan({ gained_since: '2026-10-13T01:00:00Z' }, 'month', now, 'America/Los_Angeles')).toBe('since Oct 12');
  });
});

describe('signed', () => {
  it('prefixes a sign and never shows +-', () => {
    expect(signed('5')).toBe('+5');
    expect(signed('-5')).toBe('\u22125');
    expect(signed('0.0')).toBe('+0.0');
  });
});
