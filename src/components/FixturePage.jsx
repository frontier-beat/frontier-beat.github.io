// Dev page (/?fixtures=1): every fixture through the production card.
// e2e/fixtures.spec.js reads the data attributes to report failures by id.
import PaperCard from './PaperCard';
import edgeCases from '../fixtures/edge-cases.json';
import legacy from '../fixtures/summaries-2024.json';

const rows = [
  ...edgeCases.map((e) => ({ ...e, arxiv_id: `edge.${e.id}`, set: e.valid_v2 ? 'edge-v2' : 'edge-malformed' })),
  ...legacy.map((r) => ({ ...r, summary_version: 1, set: 'v1' })),
];

export default function FixturePage() {
  return (
    <section className="list">
      <p className="list-status">{rows.length} fixtures: {edgeCases.length} edge cases, then {legacy.length} v1 summaries.</p>
      {rows.map((r) => (
        <PaperCard key={r.arxiv_id} paper={r} data-fixture-id={r.arxiv_id} data-fixture-set={r.set} />
      ))}
    </section>
  );
}
