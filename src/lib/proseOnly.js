// Test helper: drop KaTeX output (balanced <span class="katex...">) and tags
// from rendered HTML so only the prose a reader sees as text remains.
export function proseOnly(html) {
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
