import { memo } from 'react';
import { FaStar } from 'react-icons/fa';
import { Summary, Title } from './Markdown';
import { categoryName, gainSpan } from '../lib/strip';

const fmt = new Intl.NumberFormat('en-US');
const fmtRate = (r) => (r >= 100 ? fmt.format(Math.round(r)) : r.toFixed(1));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
// API fields go into href; allow only web links.
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null);
const day = (iso) => (iso ? String(iso).slice(0, 10) : null);
const Star = () => <FaStar className="star" aria-label="stars" />;

// Departure-board strip: category and date on the left; the numbers on the
// right, with the one the list is sorted by in full contrast.
function Strip({ paper, sort, window }) {
  const stats = [
    isNum(paper.star_count) && {
      key: 'stars',
      body: <><Star /> {fmt.format(paper.star_count)}</>,
    },
    isNum(paper.hourly_rate) && fmtRate(paper.hourly_rate) !== '0.0' && {
      key: 'trending',
      body: (
        <>
          +{fmtRate(paper.hourly_rate)} <Star />/h
          {paper.rate_provisional && <span className="est" title="Estimate: less than 24 hours of star history so far">est.</span>}
        </>
      ),
    },
    isNum(paper.stars_gained) && {
      key: 'gained',
      body: <>+{fmt.format(paper.stars_gained)} <Star /> {gainSpan(paper, window)}</>,
    },
  ].filter(Boolean);
  return (
    <div className="strip">
      {paper.primary_category && (
        <span className="category" title={paper.primary_category}>{categoryName(paper.primary_category)}</span>
      )}
      {paper.published_date && <span className="date" data-active={sort === 'new' || undefined}>{day(paper.published_date)}</span>}
      <span className="strip-stats">
        {stats.map((s) => <span key={s.key} data-active={sort === s.key || undefined}>{s.body}</span>)}
      </span>
    </div>
  );
}

function PaperCard({ paper, sort, window, ...rest }) {
  const paperUrl = safeUrl(paper.html_link);
  const repoUrl = safeUrl(paper.html_url);
  return (
    <article className="card" {...rest}>
      <Strip paper={paper} sort={sort} window={window} />
      <h2 className="card-title">
        {paperUrl ? (
          <a href={paperUrl} target="_blank" rel="noopener noreferrer"><Title text={paper.title} /></a>
        ) : <Title text={paper.title} />}
      </h2>
      <Summary text={paper.paper_summary} version={paper.summary_version ?? 1} />
      {repoUrl && (
        <a className="repo" href={repoUrl} target="_blank" rel="noopener noreferrer">
          <span className="repo-label">GitHub</span>
          {paper.full_name || repoUrl.replace(/^https?:\/\/github\.com\//i, '')}
        </a>
      )}
    </article>
  );
}

// Paper objects are stable across page appends, so loaded cards (and their
// KaTeX) do not re-render when the next page arrives.
export default memo(PaperCard);
