import { useMemo } from 'react';
import { buildTimelineTrackEntries } from '../timelineTrackEntries';

export function useTimelineTrackEntries({ tracks, widgetMap }) {
  return useMemo(
    () => buildTimelineTrackEntries(tracks, widgetMap),
    [tracks, widgetMap]
  );
}
