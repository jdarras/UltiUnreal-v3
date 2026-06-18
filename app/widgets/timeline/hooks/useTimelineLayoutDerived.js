import { useMemo } from 'react';
import {
  GRAPH_BOTTOM,
  GRAPH_LEFT,
  GRAPH_RIGHT,
  GRAPH_TOP,
  GRAPH_WIDTH,
  TRACK_HEIGHT,
  buildTrackLayout,
} from '../layout';

export function useTimelineLayoutDerived({ trackEntries, selectedTrackId }) {
  const layoutEntries = useMemo(() => {
    return buildTrackLayout(trackEntries, selectedTrackId);
  }, [selectedTrackId, trackEntries]);

  const trackById = useMemo(() => {
    const map = new Map();
    layoutEntries.forEach((entry) => {
      map.set(entry.track.widgetId, entry);
    });
    return map;
  }, [layoutEntries]);

  const trackAreaHeight = layoutEntries.length
    ? layoutEntries[layoutEntries.length - 1].bounds.bottom - GRAPH_TOP
    : TRACK_HEIGHT;
  const graphHeight = GRAPH_TOP + trackAreaHeight + GRAPH_BOTTOM;
  const innerWidth = GRAPH_WIDTH - GRAPH_LEFT - GRAPH_RIGHT;

  return {
    layoutEntries,
    trackById,
    trackAreaHeight,
    graphHeight,
    innerWidth,
  };
}
