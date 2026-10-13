import { SORTS, WINDOWS, windowFiltersPublished } from '../api';

// Native radio groups: arrow keys, focus and form semantics come for free.
function Segmented({ name, label, hint, options, value, onChange }) {
  return (
    <fieldset className="segmented">
      <legend>{label}{hint && <span className="hint">{hint}</span>}</legend>
      <div className="segments">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function RankingControls({ sort, window, onChange }) {
  return (
    <div className="controls">
      <Segmented name="sort" label="Sort" options={SORTS} value={sort} onChange={(v) => onChange({ sort: v, window })} />
      <Segmented
        name="window"
        label="Window"
        options={WINDOWS}
        value={window}
        onChange={(v) => onChange({ sort, window: v })}
        hint={windowFiltersPublished(sort) ? 'published within' : undefined}
      />
    </div>
  );
}
