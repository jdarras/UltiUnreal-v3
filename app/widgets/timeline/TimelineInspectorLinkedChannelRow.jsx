import {
  getTimelineAddKeyframeLabel,
  getTimelineDeleteKeyframeLabel,
  getTimelineNoKeyframePlaceholder
} from './timelineInspectorI18n.js';

export function TimelineInspectorLinkedChannelRow({
  t,
  label,
  labelClassName = 'uu-muted',
  hasKey,
  value,
  inputWidthStyle,
  rowStyle,
  onChange,
  onBlur,
  onKeyDown,
  onToggleKeyframe,
  deleteTitleFallback = ''
}) {
  const noKeyframePlaceholder = getTimelineNoKeyframePlaceholder(t);
  const deleteKeyframeTitle =
    deleteTitleFallback || getTimelineDeleteKeyframeLabel(t);
  const addKeyframeTitle = getTimelineAddKeyframeLabel(t);

  return (
    <div
      className="uu-row uu-align-center uu-gap-6"
      style={rowStyle}
    >
      <span className={labelClassName}>{label}</span>
      <input
        className="uu-input uu-input-arg"
        type="text"
        inputMode="decimal"
        disabled={!hasKey}
        placeholder={hasKey ? '' : noKeyframePlaceholder}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        style={inputWidthStyle}
      />
      <button
        type="button"
        className={`uu-kf-btn ${hasKey ? 'is-delete' : 'is-add'}`}
        title={
          hasKey
            ? deleteKeyframeTitle
            : addKeyframeTitle
        }
        onClick={onToggleKeyframe}
      >
        {hasKey ? 'X' : '●'}
      </button>
    </div>
  );
}
