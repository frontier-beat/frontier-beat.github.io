// Local stand-in for the Frontier Beat API (contracts.md "API contract").
// Serves the 2024 fixtures with deterministic synthetic star data.
//
//   node scripts/mock-api.mjs            # http://localhost:8787
//   PORT=9000 MOCK_DELAY=800 node scripts/mock-api.mjs
//   MOCK_FAIL=1   -> every /top_papers call returns 500 (error state)
//   MOCK_EDGE=1   -> also serve src/fixtures/edge-cases.json rows as v2 papers
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 8787);
const DELAY = Number(process.env.MOCK_DELAY || 0);
const ORIGINS = ['https://frontier-beat.github.io', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
const SORTS = ['trending', 'stars', 'gained', 'new'];
const WINDOW_DAYS = { day: 1, week: 7, month: 30, all: Infinity };

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));

// Small deterministic PRNG keyed on the arXiv id.
function rand(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const rows = load('../src/fixtures/summaries-2024.json').map((r) => ({ ...r, summary_version: 1 }));
if (process.env.MOCK_EDGE) {
  for (const e of load('../src/fixtures/edge-cases.json')) {
    rows.push({ arxiv_id: `edge.${e.id}`, title: e.title, paper_summary: e.paper_summary, summary_version: e.summary_version, primary_category: 'cs.EDGE', published_date: '2024-08-05 00:00:00+00', html_link: '#' });
  }
}

// "Now" is the newest fixture date so the windows have data to filter.
const toIso = (d) => new Date(d.replace(' ', 'T').replace(/\+00$/, 'Z')).toISOString();
const NOW = Math.max(...rows.map((r) => Date.parse(toIso(r.published_date))));

const papers = rows.map((r) => {
  const rnd = rand(r.arxiv_id);
  const stars = Math.floor(20 + rnd() ** 3 * 40000);
  const rate = Number((rnd() ** 2 * 12).toFixed(2));
  const slug = r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 4).join('-') || 'repo';
  return {
    arxiv_id: r.arxiv_id,
    title: r.title,
    paper_summary: r.paper_summary,
    html_link: r.html_link,
    full_name: `lab-${r.arxiv_id.replace('.', '')}/${slug}`,
    html_url: `https://github.com/lab-${r.arxiv_id.replace('.', '')}/${slug}`,
    star_count: stars,
    hourly_rate: rate,
    // stars gained per window, monotone in the window length
    gained: { day: Math.round(rate * 24 * rnd()), week: Math.round(rate * 24 * 7 * (0.3 + rnd() * 0.7)), month: Math.round(rate * 24 * 30 * (0.2 + rnd() * 0.8)), all: Math.round(stars * (0.6 + rnd() * 0.4)) },
    published_date: toIso(r.published_date),
    primary_category: r.primary_category,
    summary_version: r.summary_version,
  };
});

function topPapers(q) {
  const sort = q.get('sort') ?? 'trending';
  const window = q.get('window') ?? 'month';
  const page = q.get('page') ?? '1';
  const perPage = q.get('per_page') ?? '10';
  if (!SORTS.includes(sort)) return [400, { error: `unknown sort: ${sort}` }];
  if (!(window in WINDOW_DAYS)) return [400, { error: `unknown window: ${window}` }];
  if (!/^\d+$/.test(page) || !/^\d+$/.test(perPage) || +page < 1 || +perPage < 1) return [400, { error: 'page and per_page must be positive integers' }];
  if (+perPage > 50) return [400, { error: 'per_page must be <= 50' }];

  let list = papers;
  const cutoff = NOW - WINDOW_DAYS[window] * 86400e3;
  if (sort === 'new') list = list.filter((p) => Date.parse(p.published_date) >= cutoff);
  const key = {
    trending: (p) => [p.hourly_rate, p.star_count],
    stars: (p) => [p.star_count, 0],
    gained: (p) => [p.gained[window], p.star_count],
    new: (p) => [Date.parse(p.published_date), 0],
  }[sort];
  list = [...list].sort((a, b) => {
    const [a1, a2] = key(a);
    const [b1, b2] = key(b);
    return b1 - a1 || b2 - a2;
  });
  const start = (page - 1) * perPage;
  const repos = list.slice(start, start + +perPage).map(({ gained, ...p }) => ({ ...p, stars_gained: gained[window] }));
  return [200, { page: +page, per_page: +perPage, sort, window, total: list.length, repos }];
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const origin = req.headers.origin;
  if (ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  const send = ([status, body]) => setTimeout(() => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  }, DELAY);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'GET') return send([405, { error: 'GET only' }]);
  if (url.pathname === '/health') return send([200, { status: 'ok', papers: papers.length, last_job_run: { name: 'mock', finished_at: new Date(NOW).toISOString(), status: 'succeeded' } }]);
  if (url.pathname === '/top_papers') return send(process.env.MOCK_FAIL ? [500, { error: 'mock failure' }] : topPapers(url.searchParams));
  return send([404, { error: 'not found' }]);
}).listen(PORT, () => console.log(`mock API on http://localhost:${PORT} (${papers.length} papers)`));
