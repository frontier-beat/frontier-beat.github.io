import { useRef, useState } from 'react';
import { Summary, TexText } from './Markdown';
import { fetchDigest } from '../api';
import { arxivLink, imageSrc } from '../lib/digest';

// Paper digest (digest-contract.md, Eric 2026-10-19): an Abstract toggle,
// then one toggle per section whose closed line is a plain sentence; read
// top to bottom the closed lines are the summary. Sections hold their
// figures as nested toggles. Everything starts closed. The list row's
// digest_headlines draw the closed state; the first open on a card fetches
// the full digest.

export const hasDigest = (paper) => Boolean(
  paper.has_digest && paper.arxiv_id && Array.isArray(paper.digest_headlines) && paper.digest_headlines.length,
);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const isSize = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isDigest = (d) => Boolean(d && Array.isArray(d.sections) && Array.isArray(d.figures));
const figureCount = (s) => (Array.isArray(s.figure_ids) ? s.figure_ids.length : 0);

// One row per toggle. Rows keep the list row's ids and order, so a toggle
// the reader opened is never remounted (and shut) when the full digest
// arrives; sections that only the full digest has come after them.
function rows(headlines, digest) {
  if (!digest) return headlines.map((h) => ({ ...h, section: null }));
  const byId = new Map(digest.sections.map((s) => [s.id, s]));
  const listed = new Set(headlines.map((h) => h.id));
  return [
    ...headlines.map((h) => {
      const section = byId.get(h.id) ?? null;
      return { ...h, section, figure_count: section ? figureCount(section) : h.figure_count };
    }),
    ...digest.sections.filter((s) => !listed.has(s.id))
      .map((s) => ({ id: s.id, headline: s.headline, figure_count: figureCount(s), section: s })),
  ];
}

// A <details> whose contents (a render function) run on first open and
// stay rendered.
function Toggle({ className, label, onOpen, children }) {
  const [opened, setOpened] = useState(false);
  const onToggle = (e) => {
    if (e.target !== e.currentTarget || !e.currentTarget.open) return; // nested toggles
    setOpened(true);
    onOpen?.();
  };
  return (
    <details className={className} onToggle={onToggle}>
      <summary>{label}</summary>
      {opened && children()}
    </details>
  );
}

// Panels in order: `images` when present (multi-panel figures), else the
// single image_url. Kinds "inline-svg" and "none" have no file.
function panels(figure) {
  const list = Array.isArray(figure.images) && figure.images.length ? figure.images
    : [{ url: figure.image_url, kind: figure.image_kind, width: figure.width, height: figure.height }];
  return list.filter((p) => p && p.url && p.kind !== 'inline-svg' && p.kind !== 'none');
}

function Panel({ panel, alt, onFail }) {
  const sized = isSize(panel.width) && isSize(panel.height);
  return (
    <img
      className="figure-image"
      data-kind={panel.kind}
      src={panel.src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={sized ? panel.width : undefined}
      height={sized ? panel.height : undefined}
      style={sized ? { aspectRatio: `${panel.width} / ${panel.height}`, '--w': panel.width } : undefined}
      onError={onFail}
    />
  );
}

// Every allowed panel; the arXiv link when any panel cannot be shown
// (inline SVG, no image, outside the allowlist, failed to load). Inline
// SVG markup is never injected.
function FigureImages({ figure }) {
  const [failed, setFailed] = useState(() => new Set());
  const all = panels(figure).map((p) => ({ ...p, src: imageSrc(p.url) }));
  const shown = all.filter((p, i) => p.src && !failed.has(i));
  const link = arxivLink(figure.anchor_url);
  const label = figure.headline || figure.label || '';
  return (
    <>
      {all.map((p, i) => (p.src && !failed.has(i) ? (
        <Panel
          key={i}
          panel={p}
          alt={all.length > 1 ? `${label} (panel ${i + 1} of ${all.length})` : label}
          onFail={() => setFailed((f) => new Set(f).add(i))}
        />
      ) : null))}
      {(shown.length < all.length || all.length === 0) && (
        <p className="figure-missing">
          {failed.size > 0 && 'Image unavailable. '}
          {link && <a href={link} target="_blank" rel="noopener noreferrer">View on arXiv</a>}
        </p>
      )}
    </>
  );
}

function Figure({ figure }) {
  const citing = (figure.citing_sentences ?? []).filter((s) => typeof s === 'string' && s.trim());
  return (
    <Toggle
      className="figure"
      label={<span className="toggle-text"><span className="figure-label">{figure.label}:</span> <TexText text={figure.headline} /></span>}
    >
      {() => (
        <figure className="figure-body">
          <FigureImages figure={figure} />
          <figcaption><TexText text={figure.caption} /></figcaption>
          {citing.length > 0 && (
            <div className="citing">
              <p className="digest-meta">In the text</p>
              <ul>{citing.map((s, i) => <li key={i}><TexText text={s} /></li>)}</ul>
            </div>
          )}
        </figure>
      )}
    </Toggle>
  );
}

export default function Digest({ paper, onMissing }) {
  const [state, setState] = useState({ status: 'idle' }); // idle | loading | ready | error
  const busy = useRef(false);

  const load = () => {
    if (busy.current) return;
    busy.current = true;
    setState({ status: 'loading' });
    fetchDigest(paper.arxiv_id).then(
      (digest) => {
        if (isDigest(digest)) setState({ status: 'ready', digest });
        else onMissing?.();
      },
      (err) => {
        busy.current = false;
        if (err.status === 404) onMissing?.();
        else setState({ status: 'error', error: err.message });
      },
    );
  };

  const { status, digest } = state;
  const body = (render) => {
    if (status === 'ready') return <div className="digest-body">{render()}</div>;
    if (status === 'error') {
      return (
        <div className="digest-body">
          <p className="digest-error">
            Could not load the details ({state.error}).{' '}
            <button type="button" className="button" onClick={load}>Retry</button>
          </p>
        </div>
      );
    }
    return <div className="digest-body"><p className="digest-loading">Loading…</p></div>;
  };
  const figures = new Map((digest?.figures ?? []).map((f) => [f.id, f]));

  return (
    <div className="digest">
      <Toggle className="digest-abstract" label={<span className="toggle-text digest-meta">Abstract</span>} onOpen={load}>
        {() => body(() => <TexText text={digest.abstract} paragraphs />)}
      </Toggle>
      {rows(paper.digest_headlines, digest).map((row) => (
        <Toggle
          key={row.id}
          className="digest-section"
          onOpen={load}
          label={(
            <>
              <span className="toggle-text"><TexText text={row.headline} /></span>
              {row.figure_count > 0 && <span className="figure-count digest-meta">{plural(row.figure_count, 'figure')}</span>}
            </>
          )}
        >
          {() => body(() => (row.section ? (
            <>
              {row.section.heading && <p className="digest-meta digest-heading"><TexText text={row.section.heading} /></p>}
              <Summary text={row.section.body} version={2} />
              {(row.section.figure_ids ?? []).map((id) => figures.get(id)).filter(Boolean).map((f) => <Figure key={f.id} figure={f} />)}
            </>
          ) : <p className="digest-meta">This section is not in the latest version of the digest.</p>))}
        </Toggle>
      ))}
    </div>
  );
}
