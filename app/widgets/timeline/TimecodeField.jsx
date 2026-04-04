import { getT } from './timelinewidget-shared';

export function TimecodeField({
  fps,
  fpsWarnings = [],
  timecodeInput,
  setTimecodeInput,
  timecodeEditing: _timecodeEditing,
  setTimecodeEditing,
  commitTimecodeInput,
  useTimecodeView,
  toggleTimecodeView
}) {
  const t = getT();
  return (
    <div className="uu-timeline-timecode-left">
      <div className="uu-timeline-timecode-fps">
        FPS: {fps}
        {fpsWarnings.includes('missing') ? ' (non defini)' : ''}
      </div>
      <input
        className="uu-input uu-timeline-timecode-input"
        style={{ width: '90px' }}
        value={timecodeInput}
        onFocus={() => setTimecodeEditing(true)}
        onBlur={(e) => {
          setTimecodeEditing(false);
          commitTimecodeInput(e.target.value);
        }}
        onChange={(e) => setTimecodeInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          setTimecodeEditing(false);
          commitTimecodeInput(e.currentTarget.value);
          e.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="uu-btn uu-btn-sm uu-timeline-btn"
        style={{
          width: 36,
          height: 32,
          marginLeft: 6,
          background: useTimecodeView ? '#2ecc71' : '#2d3440'
        }}
        onClick={toggleTimecodeView}
        title={t('timeline.toggleTimecode') || 'Basculer frames / timecode'}
      >
        TC
      </button>
    </div>
  );
}
