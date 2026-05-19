import {
  getTimelineModeLabel,
  getTimelineZoomInTitle,
  getTimelineZoomLabel,
  getTimelineZoomOutTitle,
} from './timelineHeaderI18n.js';

const TIMELINE_ZOOM_ROW_STYLE = {
  flex: 1,
  justifyContent: 'flex-start',
  marginLeft: -110
};

const TIMELINE_ZOOM_VALUE_STYLE = { minWidth: 40, textAlign: 'right' };

const TIMELINE_MODE_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'loop', label: 'Loop' },
  { id: 'flipflop', label: 'Flip/Flop' },
  { id: 'flipstopflop', label: 'FF/Stop' }
];

export function TimelineEditorHeaderControls({
  t,
  addMenuRef,
  showAddMenu,
  setShowAddMenu,
  typeOptions,
  onAddTrackType,
  label,
  onLabelChange,
  zoomFactor,
  onZoomOut,
  onZoomIn,
  mode,
  onModeChange,
}) {
  const zoomLabel = getTimelineZoomLabel(t);
  const zoomOutTitle = getTimelineZoomOutTitle(t);
  const zoomInTitle = getTimelineZoomInTitle(t);
  const modeLabel = getTimelineModeLabel(t);
  return (
    <div className="uu-row uu-align-center uu-gap-12 uu-timeline-header">
      <div className="uu-timeline-add" ref={addMenuRef}>
        <button
          type="button"
          className="uu-btn uu-btn-sm"
          onClick={() => setShowAddMenu((prev) => !prev)}
        >
          + Add Widget
        </button>
        {showAddMenu && (
          <div className="uu-timeline-add-menu">
            {typeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="uu-timeline-add-item"
                onClick={() => onAddTrackType(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="uu-row uu-align-center uu-gap-8 uu-timeline-title">
        <label className="uu-label">{t('widgets.common.label')}</label>
        <input
          className="uu-input uu-input-label uu-timeline-title-input"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>
      <div
        className="uu-row uu-align-center uu-gap-6"
        style={TIMELINE_ZOOM_ROW_STYLE}
      >
        <span className="uu-muted">{zoomLabel}</span>
        <button
          type="button"
          className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn"
          onClick={onZoomOut}
          onMouseDown={(e) => e.stopPropagation()}
          title={zoomOutTitle}
        >
          -
        </button>
        <button
          type="button"
          className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn"
          onClick={onZoomIn}
          onMouseDown={(e) => e.stopPropagation()}
          title={zoomInTitle}
        >
          +
        </button>
        <span className="uu-muted" style={TIMELINE_ZOOM_VALUE_STYLE}>
          {zoomFactor.toFixed ? zoomFactor.toFixed(2) : zoomFactor}
        </span>
      </div>
      <div className="uu-row uu-align-center uu-gap-8 uu-timeline-modes">
        <span className="uu-muted">{modeLabel}</span>
        <div className="uu-row">
          {TIMELINE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`uu-btn uu-btn-sm uu-timeline-mode-btn${
                mode === opt.id ? ' is-active prod-toggle-active' : ''
              }`}
              onClick={() => onModeChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
