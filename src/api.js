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

export async function fetchPapers({ sort, window, page, signal }) {
  const params = new URLSearchParams({ sort, window, page: String(page), per_page: String(PER_PAGE) });
  const res = await fetch(`${API_BASE_URL}/top_papers?${params}`, { signal });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch { /* not JSON */ }
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return res.json();
}
