// Static data (since 2026-11-06 the site has no API): the backend's
// scripts/export_static.py writes the old API responses as files under
// public/data, refreshed by its scripts/refresh-static.sh.
//   top/<sort>/<window>/<page>.json   was GET /top_papers?sort&window&page&per_page=10
//   digests/<arxiv id>.json           was GET /papers/<id>/digest
//   meta.json                         when the snapshot was taken
// Tests point VITE_DATA_BASE_URL at the mock server.
export const DATA_BASE_URL = (import.meta.env.VITE_DATA_BASE_URL || `${import.meta.env.BASE_URL}data`).replace(/\/+$/, '');

export const SORTS = [
  { value: 'trending', label: 'Trending' },
  { value: 'stars', label: 'Most stars' },
  { value: 'gained', label: 'Stars gained' },
  { value: 'new', label: 'Newest' },
];

export const WINDOWS = [
  { value: 'day', label: '24h' },
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
  { value: 'all', label: 'All' },
];

export const DEFAULT_SORT = 'trending';
export const DEFAULT_WINDOW = 'month';
export const PER_PAGE = 10;

// For `stars` and `new` the window filters papers by arXiv published date
// (contracts.md); for `trending` and `gained` it limits the star samples.
export const windowFiltersPublished = (sort) => sort === 'stars' || sort === 'new';

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  // A static host may answer a missing file with its HTML page (a dev
  // server's SPA fallback): that is a 404 too.
  if (res.ok && !(res.headers.get('content-type') || '').includes('json')) {
    const err = new Error('HTTP 404');
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* not JSON */ }
    const err = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Each page file holds PER_PAGE rows; `total` is the number of rows exported.
export function fetchPapers({ sort, window, page, signal }) {
  return getJson(`${DATA_BASE_URL}/top/${sort}/${window}/${page}.json`, signal);
}

// Old-style ids (hep-th/9901001) carry a slash; export_static.py replaces it the same way.
export const digestFile = (arxivId) => `${encodeURIComponent(arxivId.replace(/\//g, '_'))}.json`;

export const fetchMeta = () => getJson(`${DATA_BASE_URL}/meta.json`);

// A paper's digest (digest-contract.md), once per paper per page
// load: a card remounted by a ranking change reuses the response. A 404 is
// remembered (digestMissing) so the card stays on its paragraph; other
// failures are forgotten so Retry asks again.
const digests = new Map();
const missing = new Set();
export const digestMissing = (arxivId) => missing.has(arxivId);
export function fetchDigest(arxivId) {
  if (!digests.has(arxivId)) {
    const request = getJson(`${DATA_BASE_URL}/digests/${digestFile(arxivId)}`);
    request.catch((err) => {
      if (err.status === 404) missing.add(arxivId);
      else digests.delete(arxivId);
    });
    digests.set(arxivId, request);
  }
  return digests.get(arxivId);
}
