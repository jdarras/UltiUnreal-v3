import { useCallback } from 'react';
import { parseTcShorthand } from '../formatters';

export function useTimelineDurationChange({
  setTimelineDraft,
  useTimecodeView,
  fps,
}) {
  return useCallback(
    (raw) => {
      const value = String(raw ?? '').trim();
      if (!value) {
        setTimelineDraft((prev) => {
          if (!('duration' in prev)) return prev;
          const next = { ...prev };
          delete next.duration;
          return next;
        });
        return;
      }

      let frame = null;
      if (useTimecodeView) {
        const tcFrames = parseTcShorthand(value, fps, 0, false);
        if (tcFrames === null) return;
        frame = tcFrames;
      } else {
        const next = Number(value);
        if (!Number.isFinite(next)) return;
        frame = Math.max(0, Math.round(next));
      }

      setTimelineDraft((prev) => ({ ...prev, duration: frame }));
    },
    [fps, setTimelineDraft, useTimecodeView]
  );
}
