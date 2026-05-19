import {
  INSPECTOR_WIDTH_100_STYLE,
  INSPECTOR_WIDTH_140_STYLE
} from './timelineInspectorStyles.js';

export function TimelineInspectorFrameRow({
  t,
  useTimecodeView,
  keyframeFrameDraft,
  setKeyframeFrameDraft,
  commitKeyframeFrameDraft,
  rowClassName = 'uu-row mt-6 uu-align-center uu-gap-8',
  labelClassName = 'uu-label',
  labelStyle = INSPECTOR_WIDTH_100_STYLE,
  showDelete = false,
  deleteTitle = '',
  onDelete
}) {
  return (
    <div className={rowClassName}>
      <label className={labelClassName} style={labelStyle}>
        {useTimecodeView ? t('timeline.timecode') : t('timeline.frame')}
      </label>
      <input
        className="uu-input uu-input-arg"
        value={keyframeFrameDraft}
        onChange={(e) => setKeyframeFrameDraft(e.target.value)}
        onBlur={(e) => commitKeyframeFrameDraft(e.target.value)}
        style={INSPECTOR_WIDTH_140_STYLE}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          commitKeyframeFrameDraft(e.currentTarget.value);
          e.currentTarget.blur();
        }}
      />
      {showDelete ? (
        <button
          type="button"
          className="uu-kf-btn is-delete"
          title={deleteTitle}
          onClick={() => onDelete?.()}
        >
          X
        </button>
      ) : null}
    </div>
  );
}
