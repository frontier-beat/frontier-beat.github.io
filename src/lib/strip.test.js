import { describe, expect, it } from 'vitest';
import { categoryName, gainSpan } from './strip';

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
  it('uses the window label when no gained_since is known', () => {
    expect(gainSpan({}, 'month', now)).toBe('30D');
  });
  it('uses the window label when history covers the window', () => {
    expect(gainSpan({ gained_since: '2026-09-13T18:00:00Z' }, 'month', now)).toBe('30D');
    expect(gainSpan({ gained_since: '2026-10-12T18:40:00Z' }, 'day', now)).toBe('24H');
  });
  it('labels the real span when history is shorter than the window', () => {
    expect(gainSpan({ gained_since: '2026-10-13T16:05:00Z' }, 'month', now)).toBe('since Oct 13');
    expect(gainSpan({ gained_since: '2024-08-06T00:00:00Z' }, 'all', now)).toBe('since Aug 6, 2024');
  });
});
