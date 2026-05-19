import { useCallback } from 'react';
import { createTimelinePlayer } from '../../../utils/timeline';
import { parseTcShorthand } from '../formatters';

export function useTimelinePlaybackControls({
  fpsWarnings,
  showStatus,
  timelineDraft,
  maxFrame,
  hosts,
  common,
  fps,
  editorPlayerRef,
  editorPausedRef,
  setEditorPaused,
  editorPlayheadRef,
  setPlayheadFrame,
  editorDirectionRef,
  setEditorPlaying,
  boundaryRef,
  editorPlaying,
  clampedMaxFrame,
  setTimecodeInput,
  useTimecodeView,
  playheadFrame,
  setUseTimecodeView,
  framesToTimecode,
}) {
  const clampFrame = useCallback(
    (frame) => Math.max(0, Math.min(clampedMaxFrame, frame)),
    [clampedMaxFrame]
  );

  const startEditorPlayback = useCallback((requestedStartFrame, initialDirection = 1) => {
    if (fpsWarnings.includes('missing')) {
      showStatus('FPS manquant sur la station serveur.');
      return;
    }
    if (!timelineDraft.tracks || timelineDraft.tracks.length === 0) {
      showStatus('Aucune piste.');
      return;
    }

    let startFrame = Number.isFinite(requestedStartFrame)
      ? requestedStartFrame
      : 0;
    if (timelineDraft.mode === 'single' && startFrame >= maxFrame) {
      startFrame = 0;
    }

    editorPlayerRef.current?.stop?.();
    editorPausedRef.current = false;
    setEditorPaused(false);
    editorPlayheadRef.current = startFrame;
    setPlayheadFrame(startFrame);
    editorDirectionRef.current = initialDirection || 1;
    const player = createTimelinePlayer({
      timeline: timelineDraft,
      widgets: Array.isArray(timelineDraft.widgets) ? timelineDraft.widgets : [],
      hosts,
      common,
      fps,
      startFrame,
      onFrame: (frame) => {
        editorPlayheadRef.current = frame;
        setPlayheadFrame(frame);
      },
      onError: (err) => {
        if (err?.type === 'fps') showStatus('FPS invalide.');
        if (err?.type === 'parse') showStatus('Valeur JSON invalide.');
        if (err?.type === 'transform') showStatus('Valeur Transform invalide.');
        if (err?.type === 'value') showStatus('Valeur hors limite.');
      },
      onStop: () => {
        setEditorPlaying(false);
        if (!editorPausedRef.current) setEditorPaused(false);
      },
      onBoundaryPause: (dir, frameAtBoundary) => {
        editorDirectionRef.current = dir;
        editorPlayheadRef.current = frameAtBoundary;
        setPlayheadFrame(frameAtBoundary);
        editorPausedRef.current = true;
        setEditorPlaying(false);
        setEditorPaused(true);
        boundaryRef.current = dir < 0 ? 'end' : 'start';
      },
      initialDirection
    });
    editorPlayerRef.current = player;
    setEditorPlaying(true);
    player.start();
  }, [
    fpsWarnings,
    showStatus,
    timelineDraft,
    maxFrame,
    editorPlayerRef,
    editorPausedRef,
    setEditorPaused,
    editorPlayheadRef,
    setPlayheadFrame,
    editorDirectionRef,
    hosts,
    common,
    fps,
    setEditorPlaying,
    boundaryRef,
  ]);

  const handleEditorPlay = useCallback(() => {
    editorDirectionRef.current = 1;
    startEditorPlayback(0, 1);
  }, [editorDirectionRef, startEditorPlayback]);

  const handleEditorPause = useCallback(() => {
    if (!editorPlaying) return;
    editorPausedRef.current = true;
    editorPlayerRef.current?.pause?.();
    setEditorPlaying(false);
    setEditorPaused(true);
  }, [
    editorPlaying,
    editorPausedRef,
    editorPlayerRef,
    setEditorPlaying,
    setEditorPaused,
  ]);

  const handleEditorContinue = useCallback(() => {
    if (editorPlaying) return;
    let dir = editorDirectionRef.current || 1;
    let startF = editorPlayheadRef.current || 0;
    if (timelineDraft.mode === 'flipstopflop') {
      if (boundaryRef.current === 'end') {
        dir = -1;
        startF = Math.max(0, clampedMaxFrame - 1);
      } else if (boundaryRef.current === 'start') {
        dir = 1;
        startF = Math.min(clampedMaxFrame, 1);
      }
      boundaryRef.current = null;
    }
    editorPausedRef.current = false;
    setEditorPaused(false);
    startEditorPlayback(startF, dir);
  }, [
    editorPlaying,
    editorDirectionRef,
    editorPlayheadRef,
    timelineDraft,
    boundaryRef,
    clampedMaxFrame,
    editorPausedRef,
    setEditorPaused,
    startEditorPlayback,
  ]);

  const handleEditorStop = useCallback(() => {
    editorPausedRef.current = false;
    editorPlayerRef.current?.stop?.();
    editorPlayerRef.current?.seek?.(0);
    editorPlayheadRef.current = 0;
    setPlayheadFrame(0);
    setEditorPlaying(false);
    setEditorPaused(false);
  }, [
    editorPausedRef,
    editorPlayerRef,
    editorPlayheadRef,
    setPlayheadFrame,
    setEditorPlaying,
    setEditorPaused,
  ]);

  const handleEditorStep = useCallback((delta) => {
    if (editorPlaying) return;
    setPlayheadFrame((prev) => {
      const base = Number.isFinite(prev) ? prev : 0;
      const next = Math.max(0, Math.min(clampedMaxFrame, base + delta));
      editorPlayheadRef.current = next;
      editorPlayerRef.current?.seek?.(next);
      return next;
    });
  }, [
    editorPlaying,
    setPlayheadFrame,
    clampedMaxFrame,
    editorPlayheadRef,
    editorPlayerRef,
  ]);

  const commitTimecodeInput = useCallback((raw) => {
    const value = String(raw ?? '').trim();
    if (!value) {
      setTimecodeInput(useTimecodeView ? framesToTimecode(playheadFrame, fps) : String(playheadFrame));
      return;
    }
    let next = null;
    if (useTimecodeView) {
      // Support shorthand & deltas
      const frames = parseTcShorthand(value, fps, playheadFrame, true);
      if (frames === null) {
        setTimecodeInput(framesToTimecode(playheadFrame, fps));
        return;
      }
      next = frames;
    } else if (/^[+-]/.test(value)) {
      const delta = Number(value);
      if (!Number.isFinite(delta)) {
        setTimecodeInput(String(playheadFrame));
        return;
      }
      next = Math.round(playheadFrame + delta);
    } else {
      const absolute = Number(value);
      if (!Number.isFinite(absolute)) {
        setTimecodeInput(String(playheadFrame));
        return;
      }
      next = Math.round(absolute);
    }
    const clamped = clampFrame(next);
    editorPlayheadRef.current = clamped;
    editorPlayerRef.current?.seek?.(clamped);
    setPlayheadFrame(clamped);
    setTimecodeInput(useTimecodeView ? framesToTimecode(clamped, fps) : String(clamped));
  }, [
    setTimecodeInput,
    useTimecodeView,
    framesToTimecode,
    playheadFrame,
    fps,
    clampFrame,
    editorPlayheadRef,
    editorPlayerRef,
    setPlayheadFrame,
  ]);

  const toggleTimecodeView = useCallback(() => {
    setUseTimecodeView((prev) => {
      const next = !prev;
      setTimecodeInput(
        next ? framesToTimecode(playheadFrame, fps) : String(playheadFrame)
      );
      return next;
    });
  }, [
    setUseTimecodeView,
    setTimecodeInput,
    framesToTimecode,
    playheadFrame,
    fps,
  ]);

  return {
    handleEditorPlay,
    handleEditorPause,
    handleEditorContinue,
    handleEditorStop,
    handleEditorStep,
    commitTimecodeInput,
    toggleTimecodeView,
  };
}
