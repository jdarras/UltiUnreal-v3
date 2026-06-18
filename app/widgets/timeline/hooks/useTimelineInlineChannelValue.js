import { useCallback } from 'react';
import { coerceNumericValue, getNumericRange } from '../../../utils/timeline';
import { findFrameIndex } from '../selection';
import { getShiftedLocalFrame, toLocalFrameRounded } from '../frameUtils';
import { shiftTrackKeyframes } from '../keyframeUtils';

export function useTimelineInlineChannelValue({
  selectedKey,
  playheadFrame,
  keyframeType,
  updateTrack,
  updateChannelKeyframe,
  showStatus,
  setSelectedTrackId,
  setSelectedChannelId,
  setSelectedKey,
}) {
  return useCallback(
    (entry, channelId, raw, options = {}) => {
      if (!entry || !channelId) return;
      if (raw === '') return;

      const sanitized = String(raw).trim().replace(/,/g, '.');
      if (!sanitized || sanitized === '-' || sanitized === '.') return;

      const next = Number(sanitized);
      if (!Number.isFinite(next)) return;

      const useSelected =
        (options.useSelected ||
          (selectedKey &&
            selectedKey.trackId === entry.track.widgetId &&
            selectedKey.channelId === channelId &&
            Number.isFinite(selectedKey.idx))) &&
        selectedKey;

      const list = entry.channels?.[channelId] || [];
      const range =
        entry.sharedRange &&
        (entry.meta?.shape === 'vector' ||
          entry.meta?.shape === 'color' ||
          entry.meta?.shape === 'joystick')
          ? entry.sharedRange
          : entry.channelRanges?.[channelId] ||
            getNumericRange({ numericKind: 'float' }, list);

      const coerced = coerceNumericValue(next, { numericKind: 'float' }, range);
      if (coerced === null) {
        showStatus('Valeur hors limite.');
        return;
      }

      if (useSelected) {
        updateChannelKeyframe(entry.track.widgetId, channelId, selectedKey.idx, {
          value: coerced,
        });
        return;
      }

      const playhead = Number.isFinite(playheadFrame) ? Math.round(playheadFrame) : 0;
      let nextIndex = null;

      updateTrack(entry.track.widgetId, (track) => {
        const shiftInfo = getShiftedLocalFrame(track, playhead);
        if (!shiftInfo) return track;

        const { offset, scale, localFrame: _localFrame, shiftFrames } = shiftInfo;
        const localFrameRounded = toLocalFrameRounded(track, playhead);
        const baseTrack = shiftTrackKeyframes(track, shiftFrames, offset, scale);
        const channels =
          baseTrack.channels && typeof baseTrack.channels === 'object'
            ? { ...baseTrack.channels }
            : {};
        const nextList = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
        const idx = findFrameIndex(nextList, localFrameRounded);

        nextIndex = idx >= 0 ? idx : nextList.length;
        if (idx >= 0 && nextList[idx]) {
          nextList[idx] = { ...nextList[idx], frame: localFrameRounded, value: coerced };
        } else {
          nextList.push({ frame: localFrameRounded, value: coerced, interp: keyframeType });
        }

        channels[channelId] = nextList;
        return { ...baseTrack, channels };
      });

      if (nextIndex === null) return;
      setSelectedTrackId(entry.track.widgetId);
      setSelectedChannelId(channelId);
      setSelectedKey({
        trackId: entry.track.widgetId,
        channelId,
        idx: nextIndex,
      });
    },
    [
      keyframeType,
      playheadFrame,
      selectedKey,
      setSelectedChannelId,
      setSelectedKey,
      setSelectedTrackId,
      showStatus,
      updateChannelKeyframe,
      updateTrack,
    ]
  );
}
