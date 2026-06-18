import { useMemo } from 'react';
import { normalizeTimeline } from '../../../utils/timeline';

export function useTimelineInitialDraft(timeline) {
  return useMemo(
    () => normalizeTimeline(timeline),
    [timeline]
  );
}
