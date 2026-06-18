import { useCallback } from 'react';
import { sampleNumericValue } from '../../../utils/timeline';
import { findFrameIndex } from '../selection';

export function useTimelineChannelKeyframeActions({
  selectedTrack,
  selectedBundle,
  keyframeType,
  updateTrack,
  setSelectedKey,
  pickDefaultChannelValue,
}) {
  const addChannelKeyframeAt = useCallback(
    (channelId, frame) => {
      if (!selectedTrack || !selectedBundle || !channelId) return;

      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        const list = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
        const existingIdx = findFrameIndex(list, frame);
        if (existingIdx >= 0) return track;

        const sourceList = Array.isArray(selectedTrack.channels?.[channelId])
          ? [...selectedTrack.channels[channelId]].sort((a, b) => a.frame - b.frame)
          : [];
        let value = sampleNumericValue(sourceList, frame);
        if (!Number.isFinite(value)) {
          value = pickDefaultChannelValue(selectedTrack, channelId, frame);
        }

        list.push({ frame, value, interp: keyframeType });
        list.sort((a, b) => a.frame - b.frame);
        channels[channelId] = list;
        return { ...track, channels };
      });

      const list = selectedTrack.channels?.[channelId] || [];
      const idx = findFrameIndex(list, frame);
      const nextIdx = idx >= 0 ? idx : list.length;
      setSelectedKey({
        trackId: selectedTrack.track.widgetId,
        channelId,
        idx: nextIdx,
      });
    },
    [
      keyframeType,
      pickDefaultChannelValue,
      selectedBundle,
      selectedTrack,
      setSelectedKey,
      updateTrack,
    ]
  );

  const removeChannelKeyframeAt = useCallback(
    (channelId, idx) => {
      if (!selectedTrack || selectedTrack.meta.kind !== 'multi') return;

      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        const list = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
        if (!list[idx]) return track;
        list.splice(idx, 1);
        channels[channelId] = list;
        return { ...track, channels };
      });

      setSelectedKey(null);
    },
    [selectedTrack, setSelectedKey, updateTrack]
  );

  return {
    addChannelKeyframeAt,
    removeChannelKeyframeAt,
  };
}
