// Client for GET /top_papers (contracts.md "API contract").
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.frontier-beat.site').replace(/\/+$/, '');

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

// `stars` is a current total, so a time window does not change it.
export const sortUsesWindow = (sort) => sort !== 'stars';

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
