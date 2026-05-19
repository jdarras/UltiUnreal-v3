import { useEffect, useMemo, useRef, useState } from 'react';
import { getT, getTimelineLabel } from './timelinewidget-shared.js';
import {
  buildTimelineRuntimeStatusLabels,
  buildTimelineRuntimeTransportLabels,
  resolveTimelineRuntimeErrorStatusLabel
} from './timelineRuntimeI18n.js';
import {
  createTimelinePlayer,
  getTimelineMaxFrame,
  normalizeTimeline,
  resolveTimelineFps
} from '../../utils/timeline';

export default function TimelineWidget({
  widget,
  hosts,
  common,
  editMode,
  onDelete
}) {
  if (!widget) return null;

  const t = getT();
  const transportLabels = buildTimelineRuntimeTransportLabels(t);
  const statusLabels = buildTimelineRuntimeStatusLabels(t);
  const displayLabel = getTimelineLabel(widget, t);
  const timeline = useMemo(
    () => normalizeTimeline(widget.ui?.timeline),
    [widget.ui?.timeline]
  );
  const timelineWidgets = useMemo(
    () => (Array.isArray(timeline.widgets) ? timeline.widgets : []),
    [timeline.widgets]
  );
  const [statusMsg, setStatusMsg] = useState('');
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  const statusTimerRef = useRef(null);
  const playerRef = useRef(null);
  const playheadRef = useRef(0);
  const pausedRef = useRef(false);
  const directionRef = useRef(1);
  const boundaryRef = useRef(null);
  const transportHandlersRef = useRef({
    cue: () => {},
    play: () => {},
    pause: () => {},
    resume: () => {}
  });

  const { fps, warnings: fpsWarnings } = useMemo(
    () => resolveTimelineFps(hosts),
    [hosts]
  );

  const maxFrame = useMemo(() => getTimelineMaxFrame(timeline), [timeline]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      playerRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    playerRef.current?.stop?.();
    playheadRef.current = 0;
    setPlaying(false);
    setPaused(false);
    pausedRef.current = false;
    directionRef.current = 1;
    boundaryRef.current = null;
  }, [widget.ui?.timeline]);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMsg('');
    }, 2000);
  };

  const startPlayback = (requestedStartFrame, initialDirection = 1) => {
    if (fpsWarnings.includes('missing')) {
      showStatus(statusLabels.fpsMissing);
      return;
    }
    if (!timeline.tracks || timeline.tracks.length === 0) {
      showStatus(statusLabels.noTracks);
      return;
    }

    let startFrame = Number.isFinite(requestedStartFrame)
      ? requestedStartFrame
      : 0;
    if (timeline.mode === 'single' && startFrame >= maxFrame) {
      startFrame = 0;
    }

    playerRef.current?.stop?.();
    pausedRef.current = false;
    setPaused(false);
    playheadRef.current = startFrame;
    directionRef.current = initialDirection || 1;
    const player = createTimelinePlayer({
      timeline,
      widgets: timelineWidgets,
      hosts,
      common,
      fps,
      startFrame,
      initialDirection,
      onFrame: (frame) => {
        playheadRef.current = frame;
      },
      onError: (err) => {
        const errorStatus = resolveTimelineRuntimeErrorStatusLabel(
          statusLabels,
          err?.type
        );
        if (errorStatus) showStatus(errorStatus);
      },
      onStop: () => {
        setPlaying(false);
        if (!pausedRef.current) {
          setPaused(false);
          boundaryRef.current = null;
        }
      },
      onBoundaryPause: (dir, frameAtBoundary) => {
        playheadRef.current = frameAtBoundary;
        directionRef.current = dir || 1;
        boundaryRef.current = dir < 0 ? 'end' : 'start';
        pausedRef.current = true;
        setPlaying(false);
        setPaused(true);
      }
    });
    playerRef.current = player;
    setPlaying(true);
    player.start();
  };

  const handlePlay = () => {
    directionRef.current = 1;
    boundaryRef.current = null;
    startPlayback(0, 1);
  };

  const handlePause = () => {
    if (!playing) return;
    pausedRef.current = true;
    playerRef.current?.pause?.();
    setPlaying(false);
    setPaused(true);
  };

  const handleContinue = () => {
    if (playing) return;
    let dir = directionRef.current || 1;
    let startF = playheadRef.current || 0;
    if (timeline.mode === 'flipstopflop') {
      if (boundaryRef.current === 'end') {
        dir = -1;
        startF = Math.max(0, maxFrame - 1);
      } else if (boundaryRef.current === 'start') {
        dir = 1;
        startF = Math.min(maxFrame, 1);
      }
      boundaryRef.current = null;
    }
    pausedRef.current = false;
    setPaused(false);
    startPlayback(startF, dir);
  };

  const handleCue = () => {
    playerRef.current?.seek?.(0, {
      triggerEvents: true,
      eventMode: 'state',
      forceEvents: true
    });
    playheadRef.current = 0;
    directionRef.current = 1;
    boundaryRef.current = null;
    pausedRef.current = false;
    setPaused(false);
  };

  useEffect(() => {
    transportHandlersRef.current = {
      cue: handleCue,
      play: handlePlay,
      pause: handlePause,
      resume: handleContinue
    };
  });

  useEffect(() => {
    const subscribe = window?.electron?.onTimelineCompanionCommand;
    if (typeof subscribe !== 'function') return undefined;
    return subscribe((payload) => {
      const incomingId = String(payload?.widgetId || '').trim();
      if (!incomingId || incomingId !== String(widget.id || '').trim()) return;
      const command = String(payload?.command || '').trim().toLowerCase();
      if (!command) return;
      const fn = transportHandlersRef.current?.[command];
      if (typeof fn === 'function') fn();
    });
  }, [widget.id]);

  const playBtnActive = playing;
  const pauseBtnActive = !playing && paused;

  return (
    <div className="uu-timeline-widget">
      <div className="uu-row uu-align-center uu-space-between">
        <div>
          <div className="uu-item-title">{displayLabel}</div>
        </div>
        {editMode && onDelete && (
          <button
            className="uu-btn-delete"
            type="button"
            title={t('widgets.common.deleteWidget')}
            aria-label={t('widgets.common.deleteWidget')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            X
          </button>
        )}
      </div>

        {statusMsg && <div className="uu-alert uu-alert-error">{statusMsg}</div>}

        <div className="uu-row uu-align-center uu-timeline-controls">
        <div className="uu-row uu-align-center uu-gap-8">
      <button
        type="button"
        className="uu-btn uu-btn-secondary uu-timeline-btn"
        onClick={handleCue}
        onMouseDown={(e) => e.stopPropagation()}
        title={transportLabels.cue}
      >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="2" height="10" fill="currentColor" /><polygon points="9,2 3.5,7 9,12" fill="currentColor" /></svg>
          </button>
          <button
            type="button"
            className={`uu-btn uu-btn-primary uu-timeline-btn${playBtnActive ? ' prod-toggle-active' : ''}`}
            onClick={handlePlay}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={playing}
            title={transportLabels.play}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><polygon points="4,2 12,7 4,12" fill="currentColor" /></svg>
          </button>
          <button
            type="button"
            className={`uu-btn uu-btn-secondary uu-timeline-btn${pauseBtnActive ? ' prod-toggle-active' : ''}`}
            onClick={handlePause}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!playing}
            title={transportLabels.pause}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="2" width="3" height="10" fill="currentColor" /><rect x="8" y="2" width="3" height="10" fill="currentColor" /></svg>
          </button>
          <button type="button" className="uu-btn uu-btn-secondary uu-timeline-btn" onClick={handleContinue} onMouseDown={(e) => e.stopPropagation()} disabled={!paused || playing} title={transportLabels.continue}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><polygon points="2,2 8,7 2,12" fill="currentColor" /><polygon points="7,2 13,7 7,12" fill="currentColor" /></svg>
          </button>
        </div>
      </div>
  </div>
  );
}
