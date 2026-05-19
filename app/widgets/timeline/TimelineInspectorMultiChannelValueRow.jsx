import {
  INSPECTOR_WIDTH_100_STYLE,
  INSPECTOR_WIDTH_180_STYLE
} from './timelineInspectorStyles.js';
import {
  getTimelineChannelValueLabel,
  getTimelineDeleteKeyframeLabel
} from './timelineInspectorI18n.js';

export function TimelineInspectorMultiChannelValueRow({
  t,
  selectedChannelLabel,
  isNumericValue,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  selectedChannelId,
  selectedKeyIndex,
  removeChannelKeyframeAt
}) {
  const channelValueLabel = getTimelineChannelValueLabel(t, selectedChannelLabel);
  const deleteKeyframeLabel = getTimelineDeleteKeyframeLabel(t);

  return (
    <div className="uu-row mt-6 uu-align-center uu-gap-8">
      <label className="uu-label" style={INSPECTOR_WIDTH_100_STYLE}>
        {channelValueLabel}
      </label>
      <input
        className={`uu-input${isNumericValue ? ' uu-input-arg' : ''}`}
        type="text"
        inputMode={isNumericValue ? 'decimal' : undefined}
        value={keyframeValueDraft}
        onChange={(e) => setKeyframeValueDraft(e.target.value)}
        onBlur={(e) => commitKeyframeValueDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          commitKeyframeValueDraft(e.currentTarget.value);
          e.currentTarget.blur();
        }}
        style={INSPECTOR_WIDTH_180_STYLE}
      />
      <button
        type="button"
        className="uu-kf-btn is-delete"
        title={deleteKeyframeLabel}
        onClick={() => removeChannelKeyframeAt(selectedChannelId, selectedKeyIndex)}
      >
        X
      </button>
    </div>
  );
}
