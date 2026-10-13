import { Summary, Title } from './Markdown';
import { WINDOWS } from '../api';

const fmt = new Intl.NumberFormat('en-US');
const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

// Departure-board strip: rank, category, date on the left; the numbers on
// the right, with the one the list is sorted by in full contrast.
function Strip({ paper, rank, sort, window }) {
  const windowLabel = WINDOWS.find((w) => w.value === window)?.label;
  const stats = [
    paper.star_count != null && { key: 'stars', text: `${fmt.format(paper.star_count)} stars` },
    paper.hourly_rate > 0 && { key: 'trending', text: `+${paper.hourly_rate.toFixed(1)}/h` },
    paper.stars_gained != null && { key: 'gained', text: `+${fmt.format(paper.stars_gained)} ${windowLabel ?? ''}`.trim() },
  ].filter(Boolean);
  return (
    <div className="strip">
      {rank != null && <span className="rank">{String(rank).padStart(2, '0')}</span>}
      {paper.primary_category && <span>{paper.primary_category}</span>}
      {paper.published_date && <span data-active={sort === 'new' || undefined}>{day(paper.published_date)}</span>}
      <span className="strip-stats">
        {stats.map((s) => <span key={s.key} data-active={sort === s.key || undefined}>{s.text}</span>)}
      </span>
    </div>
  );
}

export default function PaperCard({ paper, rank, sort, window, ...rest }) {
  return (
    <article className="card" {...rest}>
      <Strip paper={paper} rank={rank} sort={sort} window={window} />
      <h2 className="card-title">
        {paper.html_link ? (
          <a href={paper.html_link} target="_blank" rel="noopener noreferrer"><Title text={paper.title} /></a>
        ) : <Title text={paper.title} />}
      </h2>
      <Summary text={paper.paper_summary} version={paper.summary_version ?? 1} />
      {paper.html_url && (
        <a className="repo" href={paper.html_url} target="_blank" rel="noopener noreferrer">{paper.full_name}</a>
      )}
    </article>
  );
}
