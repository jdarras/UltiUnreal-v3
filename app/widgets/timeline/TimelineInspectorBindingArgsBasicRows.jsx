function autoSizeTextArea(target) {
  if (!target) return;
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
}

export function TimelineInspectorBindingArgsTextAreaRow({
  name,
  label,
  current,
  onChange
}) {
  return (
    <div className="uu-row uu-binding-row" key={name}>
      <label className="uu-label w-160">{label}</label>
      <textarea
        className="uu-input uu-input-textarea"
        rows={1}
        value={current ?? ''}
        ref={(el) => autoSizeTextArea(el)}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => autoSizeTextArea(e.target)}
      />
    </div>
  );
}

export function TimelineInspectorBindingArgsCheckboxRow({
  name,
  label,
  current,
  onChange
}) {
  return (
    <div className="uu-row uu-binding-row" key={name}>
      <label className="uu-label w-160">{label}</label>
      <input
        type="checkbox"
        checked={!!current}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

export function TimelineInspectorBindingArgsTextRow({
  name,
  label,
  current,
  onChange
}) {
  return (
    <div className="uu-row uu-binding-row" key={name}>
      <label className="uu-label w-160">{label}</label>
      <input
        className="uu-input"
        type="text"
        value={current ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
