import { getT } from './timelinewidget-shared';
import { buildTimelineToolbarLabels } from './timelineToolbarI18n.js';

const ICON_SIZE = 14;

const ICONS = {
  constant: (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" stroke="currentColor" fill="currentColor" />
    </svg>
  ),
  linear: (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="4" stroke="currentColor" fill="currentColor" />
    </svg>
  ),
  bezier: (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M7 2 L12 7 L7 12 L2 7 Z"
        stroke="currentColor"
        fill="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  )
};

const IconCue = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="2" y="2" width="2" height="10" fill="currentColor" />
    <polygon points="9,2 3.5,7 9,12" fill="currentColor" />
  </svg>
);

const IconPlay = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <polygon points="4,2 12,7 4,12" fill="currentColor" />
  </svg>
);

const IconPause = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="3" y="2" width="3" height="10" fill="currentColor" />
    <rect x="8" y="2" width="3" height="10" fill="currentColor" />
  </svg>
);

const IconContinue = (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <polygon points="2,2 8,7 2,12" fill="currentColor" />
    <polygon points="7,2 13,7 7,12" fill="currentColor" />
  </svg>
);

const TIMELINE_TOOLBAR_SPACER_STYLE = { width: 70 };
const TIMELINE_TOOLBAR_BEZIER_INPUT_STYLE = { width: 70 };
const TIMELINE_TOOLBAR_DURATION_ROW_STYLE = { marginLeft: 'auto' };
const TIMELINE_TOOLBAR_DURATION_INPUT_STYLE = { width: '90px' };

export function TimelineToolbar({
  editorPlaying,
  editorPaused,
  keyframeType,
  onKeyframeTypeChange,
  hideKeyframeTypes = false,
  keyframeInTanDraft,
  keyframeOutTanDraft,
  onBezierTangentChange,
  keyframeInSpanDraft,
  keyframeOutSpanDraft,
  onBezierSpanChange,
  handleEditorCue,
  handleEditorPlay,
  handleEditorPause,
  handleEditorContinue,
  handleEditorStop: _handleEditorStop,
  handleEditorStep,
  useTimecodeView,
  durationDisplay,
  handleDurationChange,
  t
}) {
  const tt = t || getT();
  const labels = buildTimelineToolbarLabels(tt);
  const playBtnActive = !!editorPlaying;
  const pauseBtnActive = !!(!editorPlaying && editorPaused);
  const interpOptions = [
    { id: 'constant', title: labels.keyframeTypeConstant },
    { id: 'linear', title: labels.keyframeTypeLinear },
    { id: 'bezier', title: labels.keyframeTypeBezier }
  ];

  return (
    <div className="uu-row uu-align-center uu-timeline-controls uu-timeline-playback">
      <div className="uu-row uu-align-center uu-gap-8">
        <button type="button" className="uu-btn uu-btn-secondary uu-timeline-btn" onClick={handleEditorCue} onMouseDown={(e) => e.stopPropagation()} title={labels.cue}>
          {IconCue}
        </button>
        <button
          type="button"
          className={`uu-btn uu-btn-primary uu-timeline-btn${playBtnActive ? ' prod-toggle-active' : ''}`}
          onClick={handleEditorPlay}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={editorPlaying}
          title={labels.play}
        >
          {IconPlay}
        </button>
        <button
          type="button"
          className={`uu-btn uu-btn-secondary uu-timeline-btn${pauseBtnActive ? ' prod-toggle-active' : ''}`}
          onClick={handleEditorPause}
          onMouseDown={(e) => e.stopPropagation()}
          disabled={!editorPlaying}
          title={labels.pause}
        >
          {IconPause}
        </button>
        <button type="button" className="uu-btn uu-btn-secondary uu-timeline-btn" onClick={handleEditorContinue} onMouseDown={(e) => e.stopPropagation()} disabled={!editorPaused || editorPlaying} title={labels.continue}>
          {IconContinue}
        </button>
        <button type="button" className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn" onClick={() => handleEditorStep(-1)} onMouseDown={(e) => e.stopPropagation()} disabled={editorPlaying} title={labels.prevFrame}>
          {'<'}
        </button>
        <button type="button" className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn" onClick={() => handleEditorStep(1)} onMouseDown={(e) => e.stopPropagation()} disabled={editorPlaying} title={labels.nextFrame}>
          {'>'}
        </button>
        <div style={TIMELINE_TOOLBAR_SPACER_STYLE} />
      </div>
      {!hideKeyframeTypes && (
        <div className="uu-row uu-align-center uu-gap-8">
          <div className="uu-row">
            {interpOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`uu-btn uu-btn-sm uu-timeline-mode-btn${
                  keyframeType === opt.id ? ' is-active prod-toggle-active' : ''
                }`}
                onClick={() => onKeyframeTypeChange(opt.id)}
                title={opt.title}
              >
                {ICONS[opt.id]}
              </button>
            ))}
          </div>
          {keyframeType === 'bezier' && (
            <div className="uu-row uu-align-center uu-gap-10 uu-wrap">
              <div className="uu-row uu-align-center uu-gap-4">
                <span className="uu-muted">{labels.bezierIn}</span>
                <input
                  className="uu-input uu-input-arg"
                  style={TIMELINE_TOOLBAR_BEZIER_INPUT_STYLE}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  pattern="-?\\d+"
                  value={keyframeInTanDraft}
                  onChange={(e) => onBezierTangentChange('in', e.target.value)}
                  title={labels.bezierInSlope}
                />
                <input
                  className="uu-input uu-input-arg"
                  style={TIMELINE_TOOLBAR_BEZIER_INPUT_STYLE}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  pattern="\\d+"
                  value={keyframeInSpanDraft}
                  onChange={(e) => onBezierSpanChange('in', e.target.value)}
                  title={labels.bezierInSpan}
                />
              </div>
              <div className="uu-row uu-align-center uu-gap-4">
                <span className="uu-muted">{labels.bezierOut}</span>
                <input
                  className="uu-input uu-input-arg"
                  style={TIMELINE_TOOLBAR_BEZIER_INPUT_STYLE}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  pattern="-?\\d+"
                  value={keyframeOutTanDraft}
                  onChange={(e) => onBezierTangentChange('out', e.target.value)}
                  title={labels.bezierOutSlope}
                />
                <input
                  className="uu-input uu-input-arg"
                  style={TIMELINE_TOOLBAR_BEZIER_INPUT_STYLE}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  pattern="\\d+"
                  value={keyframeOutSpanDraft}
                  onChange={(e) => onBezierSpanChange('out', e.target.value)}
                  title={labels.bezierOutSpan}
                />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="uu-row uu-align-center uu-gap-8" style={TIMELINE_TOOLBAR_DURATION_ROW_STYLE}>
        <span className="uu-muted">
          {useTimecodeView ? labels.durationTc : labels.durationFrames}
        </span>
        <input
          className="uu-input uu-input-arg w-100"
          type={useTimecodeView ? 'text' : 'number'}
          min={useTimecodeView ? undefined : '1'}
          step={useTimecodeView ? undefined : '1'}
          placeholder={labels.durationAuto}
          style={TIMELINE_TOOLBAR_DURATION_INPUT_STYLE}
          value={durationDisplay}
          onChange={(e) => handleDurationChange(e.target.value)}
        />
      </div>
    </div>
  );
}
