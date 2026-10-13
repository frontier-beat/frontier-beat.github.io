// Fetch every summary_version 2 row from the API (sort=new, window=all)
// into a JSON file for the Node render check:
//   node scripts/fetch-v2.mjs out.json && V2_FIXTURES=out.json npx vitest run src/lib/render.test.jsx
import { writeFileSync } from 'node:fs';

const API = process.env.API || 'https://api-rcvqmjv3ua-ue.a.run.app';
const out = process.argv[2] || 'v2.json';
const rows = [];
let total = Infinity;
for (let page = 1; (page - 1) * 50 < total; page++) {
  const res = await fetch(`${API}/top_papers?sort=new&window=all&per_page=50&page=${page}`);
  const data = await res.json();
  total = data.total;
  rows.push(...data.repos.filter((r) => r.summary_version === 2));
}
writeFileSync(out, JSON.stringify(rows, null, 1));
console.log(`${rows.length} v2 rows of ${total} papers -> ${out}`);
