import { getT } from './timelinewidget-shared';
import {
  getTimelineFpsDisplayText,
  getTimelineToggleTimecodeTitle
} from './timelineToolbarI18n.js';

const TIMECODE_INPUT_STYLE = { width: '90px' };

function buildTimecodeToggleButtonStyle(useTimecodeView) {
  return {
    width: 36,
    height: 32,
    marginLeft: 6,
    background: useTimecodeView ? '#2ecc71' : '#2d3440'
  };
}

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
  const fpsDisplayText = getTimelineFpsDisplayText(t, fps, fpsWarnings);
  const toggleTimecodeTitle = getTimelineToggleTimecodeTitle(t);
  return (
    <div className="uu-timeline-timecode-left">
      <div className="uu-timeline-timecode-fps">
        {fpsDisplayText}
      </div>
      <input
        className="uu-input uu-timeline-timecode-input"
        style={TIMECODE_INPUT_STYLE}
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
        style={buildTimecodeToggleButtonStyle(useTimecodeView)}
        onClick={toggleTimecodeView}
        title={toggleTimecodeTitle}
      >
        TC
      </button>
    </div>
  );
}
