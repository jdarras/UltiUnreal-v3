import { useEffect } from 'react';

export function useTimelinePlayheadSyncEffects({
  playheadFrame,
  clampedMaxFrame,
  timecodeEditing,
  useTimecodeView,
  fps,
  editorPlayheadRef,
  setPlayheadFrame,
  setTimecodeInput,
  resetInlineDrafts,
  framesToTimecode,
}) {
  useEffect(() => {
    setPlayheadFrame((prev) => {
      const next = Number.isFinite(prev) ? prev : 0;
      if (next < 0) return 0;
      if (next > clampedMaxFrame) return clampedMaxFrame;
      return next;
    });
  }, [clampedMaxFrame, setPlayheadFrame]);

  useEffect(() => {
    editorPlayheadRef.current = playheadFrame;
  }, [editorPlayheadRef, playheadFrame]);

  useEffect(() => {
    if (timecodeEditing) return;
    setTimecodeInput(
      useTimecodeView ? framesToTimecode(playheadFrame, fps) : String(playheadFrame)
    );
  }, [
    fps,
    framesToTimecode,
    playheadFrame,
    setTimecodeInput,
    timecodeEditing,
    useTimecodeView,
  ]);

  useEffect(() => {
    resetInlineDrafts();
  }, [playheadFrame, resetInlineDrafts]);
}
