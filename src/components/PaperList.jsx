import { useEffect, useRef, useState } from 'react';
import PaperCard from './PaperCard';
import { PER_PAGE, fetchPapers } from '../api';

// Mounted with key={sort + window}, so a new ranking starts from a fresh
// list and the previous list's in-flight request is aborted on unmount.
export default function PaperList({ sort, window }) {
  const [papers, setPapers] = useState([]);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | idle | error | done
  const [error, setError] = useState('');
  const sentinel = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus('loading');
    fetchPapers({ sort, window, page, signal: ctrl.signal })
      .then((data) => {
        const repos = data.repos ?? [];
        setPapers((prev) => {
          const seen = new Set(prev.map((p) => p.arxiv_id));
          const next = [...prev, ...repos.filter((p) => !seen.has(p.arxiv_id))];
          const more = data.total != null ? page * PER_PAGE < data.total : repos.length === PER_PAGE;
          setStatus(more ? 'idle' : 'done');
          return next;
        });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setStatus('error');
      });
    return () => ctrl.abort();
  }, [sort, window, page, attempt]);

  useEffect(() => {
    if (status !== 'idle' || !sentinel.current) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage((p) => p + 1);
    }, { rootMargin: '800px 0px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [status]);

  return (
    <section className="list" aria-busy={status === 'loading'}>
      {papers.map((p, i) => (
        <PaperCard key={p.arxiv_id} paper={p} rank={i + 1} sort={sort} window={window} />
      ))}
      <div ref={sentinel} className="list-status" role="status">
        {status === 'loading' && 'Loading papers…'}
        {status === 'error' && (
          <>
            Could not load papers ({error}).{' '}
            <button type="button" className="button" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
          </>
        )}
        {status === 'done' && (papers.length ? `End of list · ${papers.length} papers` : 'No papers in this window. Try a longer one.')}
      </div>
    </section>
  );
}
