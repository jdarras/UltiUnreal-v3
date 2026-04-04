import { useMemo } from 'react';
import { TimecodeField } from './TimecodeField.jsx';

export function TimelineTimecodeBar({
  fps,
  fpsWarnings,
  timecodeInput,
  setTimecodeInput,
  timecodeEditing,
  setTimecodeEditing,
  commitTimecodeInput,
  useTimecodeView,
  toggleTimecodeView,
  timecodeRef,
  clampedMaxFrame,
  playheadFrame,
  framesToTimecode: _framesToTimecode,
  onTimecodeDown,
  onTimecodeMove,
  onTimecodeUp,
  graphLeft,
  graphRight,
  graphWidth,
  viewStart = 0,
  viewFrames = null,
  onViewportPointerDown
}) {
  const timecodeColumns = useMemo(
    () => `${graphLeft}fr ${graphWidth - graphLeft - graphRight}fr ${graphRight}fr`,
    [graphLeft, graphRight, graphWidth]
  );

  const playheadRatio = useMemo(
    () => (clampedMaxFrame ? Math.max(0, Math.min(1, playheadFrame / clampedMaxFrame)) : 0),
    [clampedMaxFrame, playheadFrame]
  );

  const windowStartRatio = useMemo(() => {
    if (!clampedMaxFrame) return 0;
    return Math.max(0, Math.min(1, viewStart / clampedMaxFrame));
  }, [viewStart, clampedMaxFrame]);

  const windowWidthRatio = useMemo(() => {
    if (!clampedMaxFrame || !viewFrames) return 1;
    return Math.max(0, Math.min(1, viewFrames / clampedMaxFrame));
  }, [viewFrames, clampedMaxFrame]);

  return (
    <div
      className="uu-timeline-timecode-row"
      style={{ gridTemplateColumns: timecodeColumns }}
    >
      <TimecodeField
        fps={fps}
        fpsWarnings={fpsWarnings}
        timecodeInput={timecodeInput}
        setTimecodeInput={setTimecodeInput}
        timecodeEditing={timecodeEditing}
        setTimecodeEditing={setTimecodeEditing}
        commitTimecodeInput={commitTimecodeInput}
        useTimecodeView={useTimecodeView}
        toggleTimecodeView={toggleTimecodeView}
      />
      <div
        ref={timecodeRef}
        className="uu-timeline-timecode-track"
      >
        <div
          className="uu-timeline-timecode-window"
          style={{
            left: `${windowStartRatio * 100}%`,
            width: `${windowWidthRatio * 100}%`
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onViewportPointerDown?.(e);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onViewportPointerDown?.(e);
          }}
        />
        <div
          className="uu-timeline-timecode-fill"
          style={{ width: `${playheadRatio * 100}%` }}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <div
          className="uu-timeline-timecode-thumb"
          style={{ left: `${playheadRatio * 100}%` }}
          onPointerDown={onTimecodeDown}
          onPointerMove={onTimecodeMove}
          onPointerUp={onTimecodeUp}
          onPointerLeave={onTimecodeUp}
        />
      </div>
      <div className="uu-timeline-timecode-spacer" />
    </div>
  );
}
