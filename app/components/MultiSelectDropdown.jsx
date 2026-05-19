import React from 'react';

const MULTI_SELECT_ROOT_BASE_STYLE = { position: 'relative', flex: '1 1 220px', minWidth: '200px' };
const MULTI_SELECT_TRIGGER_STYLE = { width: '100%', height: '36px', textAlign: 'left', paddingRight: '28px' };
const MULTI_SELECT_CARET_STYLE = { position: 'absolute', right: '10px' };
const MULTI_SELECT_PANEL_STYLE = {
  position: 'absolute',
  zIndex: 30,
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  padding: '8px',
  gap: '4px',
  display: 'flex',
  flexDirection: 'column',
};
const MULTI_SELECT_NONE_LABEL_STYLE = { margin: '2px 0', fontWeight: 600 };
const MULTI_SELECT_OPTION_LABEL_STYLE = { margin: '2px 0' };

function buildMultiSelectRootStyle(style) {
  return { ...MULTI_SELECT_ROOT_BASE_STYLE, ...(style || {}) };
}

export default function MultiSelectDropdown({
  options = [],
  values = [],
  onChange,
  placeholder,
  noneLabel = '(none)',
  style
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (val) => {
    const set = new Set(Array.isArray(values) ? values : []);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    onChange(Array.from(set));
  };

  const selectedLabels = React.useMemo(() => {
    const selected = Array.isArray(values) ? values : [];
    if (selected.length <= 0) return [];
    const labelByValue = new Map(
      (Array.isArray(options) ? options : []).map((opt) => [
        String(opt?.value ?? ''),
        String(opt?.label ?? opt?.value ?? '').trim(),
      ])
    );
    const seen = new Set();
    const out = [];
    for (const value of selected) {
      const key = String(value ?? '');
      const label = String(labelByValue.get(key) || key).trim();
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
    return out;
  }, [options, values]);

  const title = selectedLabels.length > 0
    ? selectedLabels.join(', ')
    : (placeholder || noneLabel);

  return (
    <div
      ref={ref}
      className="uu-multi-select"
      style={buildMultiSelectRootStyle(style)}
    >
      <button
        type="button"
        className="uu-select"
        onClick={() => setOpen((v) => !v)}
        style={MULTI_SELECT_TRIGGER_STYLE}
      >
        <span>{title}</span>
        <span style={MULTI_SELECT_CARET_STYLE}>▾</span>
      </button>
      {open ? (
        <div
          className="uu-card"
          style={MULTI_SELECT_PANEL_STYLE}
        >
          <label className="uu-check" style={MULTI_SELECT_NONE_LABEL_STYLE}>
            <input
              type="checkbox"
              checked={Array.isArray(values) ? values.length === 0 : true}
              onChange={() => onChange([])}
            />
            {noneLabel}
          </label>
          {options.map((opt) => (
            <label key={opt.value} className="uu-check" style={MULTI_SELECT_OPTION_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={Array.isArray(values) && values.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              {opt.label || opt.value}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
