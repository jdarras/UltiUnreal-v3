import { useCallback } from 'react';
import {
  getCurrentValueDisplayAtFrame,
  getTrackValueSummaryAtFrame,
} from '../timelineValueDisplayHelpers';
import { buildCurveVisibilityTrackPatch } from '../timelineKeyControlsHelpers';

export function useTimelineValueDisplayActions({ playheadFrame, updateTrack }) {
  const getTrackValueSummary = useCallback(
    (entry) => getTrackValueSummaryAtFrame(entry, playheadFrame),
    [playheadFrame]
  );

  const getCurrentValueDisplay = useCallback(
    (entry, channelId = null) => getCurrentValueDisplayAtFrame(entry, playheadFrame, channelId),
    [playheadFrame]
  );

  const toggleCurveVisibility = useCallback((entry, channelId = null) => {
    if (!entry) return;
    updateTrack(entry.track.widgetId, (track) => {
      return buildCurveVisibilityTrackPatch(track, entry.meta.kind, channelId);
    });
  }, [updateTrack]);

  return {
    getTrackValueSummary,
    getCurrentValueDisplay,
    toggleCurveVisibility,
  };
}
