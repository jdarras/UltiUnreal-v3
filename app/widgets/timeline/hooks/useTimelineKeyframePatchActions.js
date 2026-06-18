import { useCallback } from 'react';

export function useTimelineKeyframePatchActions({
  selectedTrack,
  selectedKey,
  selectedKeyframeArgs,
  updateTrack,
}) {
  const updateKeyframe = useCallback(
    (trackId, idx, patch) => {
      updateTrack(trackId, (track) => {
        const list = Array.isArray(track.keyframes) ? [...track.keyframes] : [];
        if (!list[idx]) return track;
        list[idx] = { ...list[idx], ...patch };
        return { ...track, keyframes: list };
      });
    },
    [updateTrack]
  );

  const updateChannelKeyframe = useCallback(
    (trackId, channelId, idx, patch) => {
      updateTrack(trackId, (track) => {
        const channels = { ...(track.channels || {}) };
        const list = Array.isArray(channels[channelId])
          ? [...channels[channelId]]
          : [];
        if (!list[idx]) return track;
        list[idx] = { ...list[idx], ...patch };
        channels[channelId] = list;
        return { ...track, channels };
      });
    },
    [updateTrack]
  );

  const updateSelectedKeyframeArgs = useCallback(
    (next) => {
      if (!selectedTrack || !selectedKey || selectedKey.idx == null) return;
      const base =
        typeof next === 'function'
          ? next(selectedKeyframeArgs || {})
          : next || {};
      const nextArgs = base && typeof base === 'object' ? { ...base } : {};
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
        args: nextArgs,
      });
    },
    [selectedKey, selectedKeyframeArgs, selectedTrack, updateKeyframe]
  );

  return {
    updateKeyframe,
    updateChannelKeyframe,
    updateSelectedKeyframeArgs,
  };
}
