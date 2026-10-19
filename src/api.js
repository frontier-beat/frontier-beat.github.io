// Client for GET /top_papers (contracts.md "API contract").
// Production default is the Cloud Run service; tests and dev override it.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api-rcvqmjv3ua-ue.a.run.app').replace(/\/+$/, '');

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
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* not JSON */ }
    const err = new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function fetchPapers({ sort, window, page, signal }) {
  const params = new URLSearchParams({ sort, window, page: String(page), per_page: String(PER_PAGE) });
  return getJson(`${API_BASE_URL}/top_papers?${params}`, signal);
}

// GET /papers/<id>/digest (digest-contract.md), once per paper per page
// load: a card remounted by a ranking change reuses the response. A 404 is
// remembered (digestMissing) so the card stays on its paragraph; other
// failures are forgotten so Retry asks again.
const digests = new Map();
const missing = new Set();
export const digestMissing = (arxivId) => missing.has(arxivId);
export function fetchDigest(arxivId) {
  if (!digests.has(arxivId)) {
    const request = getJson(`${API_BASE_URL}/papers/${encodeURIComponent(arxivId)}/digest`);
    request.catch((err) => {
      if (err.status === 404) missing.add(arxivId);
      else digests.delete(arxivId);
    });
    digests.set(arxivId, request);
  }
  return digests.get(arxivId);
}
