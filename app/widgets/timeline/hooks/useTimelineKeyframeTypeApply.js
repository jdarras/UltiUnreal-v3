import { useCallback } from 'react';
import {
  applyKeyframeTypeToTrack,
  groupSelectionByTrackChannel,
  resolveKeyframeTypeTargets,
} from '../timelineKeyframeTypeHelpers';

export function useTimelineKeyframeTypeApply({
  setKeyframeType,
  multiSelection,
  selectedKey,
  updateTrack,
}) {
  return useCallback(
    (type) => {
      setKeyframeType(type);
      const targets = resolveKeyframeTypeTargets(multiSelection, selectedKey);
      if (!targets.length) return;
      const grouped = groupSelectionByTrackChannel(targets);
      Object.entries(grouped).forEach(([trackId, perChannelSelection]) => {
        updateTrack(trackId, (track) =>
          applyKeyframeTypeToTrack(track, perChannelSelection, type)
        );
      });
    },
    [multiSelection, selectedKey, setKeyframeType, updateTrack]
  );
}
