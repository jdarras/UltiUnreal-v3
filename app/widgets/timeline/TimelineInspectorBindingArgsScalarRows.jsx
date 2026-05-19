import {
  buildInspectorEnumSelectStyle,
  buildInspectorNumericArgStyle
} from './timelineInspectorStyles.js';

export function TimelineInspectorBindingArgsNumberRow({
  name,
  label,
  current,
  min,
  max,
  onChange
}) {
  const width = 200;
  return (
    <div className="uu-row uu-binding-row" key={name}>
      <label className="uu-label w-160">{label}</label>
      <input
        className="uu-input uu-input-arg"
        type="number"
        value={current ?? ''}
        min={min}
        max={max}
        style={buildInspectorNumericArgStyle(width)}
        onChange={(e) => {
          const value = e.target.value;
          onChange(value === '' ? '' : Number(value));
        }}
      />
    </div>
  );
}

export function TimelineInspectorBindingArgsEnumRow({
  name,
  label,
  current,
  options,
  widthPx,
  onChange
}) {
  return (
    <div className="uu-row uu-binding-row" key={name}>
      <label className="uu-label w-160">{label}</label>
      <select
        className="uu-input"
        value={current ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={buildInspectorEnumSelectStyle(widthPx)}
      >
        {options.map((option, idx) => (
          <option key={`${name}-opt-${idx}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
