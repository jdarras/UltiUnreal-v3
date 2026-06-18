import { useMemo } from 'react';
import {
  getTimelineMaxFrame,
  resolveTimelineFps,
} from '../../../utils/timeline';
import { framesToTimecode } from '../formatters';

export function useTimelineTimingDerived({ hosts, timelineDraft, useTimecodeView }) {
  const { fps, warnings: fpsWarnings } = useMemo(
    () => resolveTimelineFps(hosts),
    [hosts]
  );

  const maxFrame = useMemo(
    () => getTimelineMaxFrame(timelineDraft),
    [timelineDraft]
  );

  const clampedMaxFrame = Math.max(1, maxFrame);
  const durationValue = Number.isFinite(timelineDraft.duration)
    ? timelineDraft.duration
    : '';
  const durationDisplay =
    useTimecodeView && Number.isFinite(timelineDraft.duration)
      ? framesToTimecode(timelineDraft.duration, fps)
      : durationValue;

  return {
    fps,
    fpsWarnings,
    maxFrame,
    clampedMaxFrame,
    durationDisplay,
  };
}
