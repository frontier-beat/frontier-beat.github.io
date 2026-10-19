import { describe, expect, it } from 'vitest';
import { arxivLink, imageSrc, splitTex } from './digest';

const shape = (parts) => parts.map((p) => (p.type === 'math' ? `[${p.display ? '$$' : '$'}${p.value}]` : p.value)).join('');

describe('splitTex: verbatim text with $...$ math', () => {
  it('splits inline and display math', () => {
    expect(shape(splitTex('cost $O(n \\log n)$ and $$a = b$$ end'))).toBe('cost [$O(n \\log n)] and [$$a = b] end');
  });
  it('keeps plain text as one part', () => {
    expect(splitTex('no math here')).toEqual([{ type: 'text', value: 'no math here' }]);
  });
  it('treats \\$ as a literal dollar', () => {
    expect(shape(splitTex('under \\$5 per run and $x$'))).toBe('under $5 per run and [$x]');
  });
  it('leaves currency alone (Pandoc rule: no space inside, no digit after the closing $)', () => {
    expect(shape(splitTex('about $3 per hour and $10 per day'))).toBe('about $3 per hour and $10 per day');
    expect(shape(splitTex('costs $5 and $x$ here'))).toBe('costs $5 and [$x] here');
    expect(shape(splitTex('a lone $ sign'))).toBe('a lone $ sign');
  });
  it('does not end math at an escaped dollar inside it', () => {
    expect(shape(splitTex('$a \\$ b$'))).toBe('[$a \\$ b]');
  });
  it('handles empty and missing input', () => {
    expect(splitTex('')).toEqual([]);
    expect(splitTex(null)).toEqual([]);
    expect(shape(splitTex('$$'))).toBe('$$');
  });
});

describe('image and link allowlists', () => {
  it('allows only arxiv.org and ar5iv over https for images', () => {
    expect(imageSrc('https://arxiv.org/html/2610.13778v1/x1.png')).toBe('https://arxiv.org/html/2610.13778v1/x1.png');
    expect(imageSrc('https://ar5iv.labs.arxiv.org/html/2610.13778/assets/x1.png')).toBeTruthy();
    expect(imageSrc('http://arxiv.org/html/x.png')).toBeNull();
    expect(imageSrc('https://arxiv.org.evil.example/x.png')).toBeNull();
    expect(imageSrc('https://evil.example/https://arxiv.org/x.png')).toBeNull();
    expect(imageSrc('javascript:alert(1)')).toBeNull();
    expect(imageSrc('//arxiv.org/x.png')).toBeNull();
    expect(imageSrc(null)).toBeNull();
  });
  it('allows arXiv links for anchors', () => {
    expect(arxivLink('https://arxiv.org/html/2610.13778v1#S1.F1')).toBe('https://arxiv.org/html/2610.13778v1#S1.F1');
    expect(arxivLink('https://evil.example/#S1.F1')).toBeNull();
  });
});
