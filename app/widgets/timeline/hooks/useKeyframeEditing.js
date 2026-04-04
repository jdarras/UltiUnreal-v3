import { useCallback } from 'react';
import { parseTcShorthand } from '../formatters';
import { sampleNumericValue } from '../../../utils/timeline';

export function useKeyframeEditing({
  selectedTrack,
  selectedKey,
  selectedChannelId,
  selectedKeyframe,
  selectedBundle,
  setSelectedKey,
  setPlayheadFrame,
  useTimecodeView,
  fps,
  playheadFrame,
  updateTrack,
  updateKeyframe,
  updateChannelKeyframe,
  showStatus,
  toGlobalFrame,
  toLocalFrameRounded,
  coerceNumericValue,
  getNumericRange,
  isFrameTaken,
  sampleValue = sampleNumericValue,
  getWidgetCurrentValue
}) {
  const pickDefaultValue = useCallback(
    (trackInfo, frame) => {
      if (!trackInfo) return null;
      if (trackInfo.meta.kind === 'event') return 1;
      if (trackInfo.meta.kind === 'number') {
        if (trackInfo.keyframes.length) {
          return sampleValue(trackInfo.keyframes, frame);
        }
        const current = getWidgetCurrentValue(trackInfo.widget);
        const range = getNumericRange(trackInfo.meta, trackInfo.keyframes);
        const coerced = coerceNumericValue(current, trackInfo.meta, range);
        return coerced ?? 0;
      }
      if (trackInfo.meta.kind === 'bool') {
        const current = getWidgetCurrentValue(trackInfo.widget);
        return current !== null && current !== undefined ? !!current : false;
      }
      if (trackInfo.meta.kind === 'object') {
        const current = getWidgetCurrentValue(trackInfo.widget);
        return current ?? {};
      }
      const current = getWidgetCurrentValue(trackInfo.widget);
      return current !== null && current !== undefined ? current : '';
    },
    [coerceNumericValue, getNumericRange, getWidgetCurrentValue, sampleValue]
  );

  const pickDefaultChannelValue = useCallback(
    (trackInfo, channelId, frame) => {
      if (!trackInfo || !channelId) return 0;
      const list = Array.isArray(trackInfo.channels?.[channelId])
        ? [...trackInfo.channels[channelId]].sort((a, b) => a.frame - b.frame)
        : [];
      if (list.length) {
        return sampleValue(list, frame);
      }
      const current = getWidgetCurrentValue(trackInfo.widget);
      if (trackInfo.meta.shape === 'color') {
        const comp = current && typeof current === 'object' ? current[channelId] : null;
        return Number.isFinite(comp) ? comp : 0;
      }
      if (trackInfo.meta.shape === 'joystick') {
        const comp = current && typeof current === 'object' ? current[channelId] : null;
        return Number.isFinite(comp) ? comp : 0;
      }
      if (trackInfo.meta.shape === 'transform') {
        const comp = current && typeof current === 'object' ? current[channelId] : null;
        return Number.isFinite(comp) ? comp : 0;
      }
      const comp = current && typeof current === 'object' ? current[channelId] : null;
      return Number.isFinite(comp) ? comp : 0;
    },
    [getWidgetCurrentValue, sampleValue]
  );

  const handleRemoveKeyframe = useCallback(() => {
    if (!selectedTrack || !selectedKeyframe || selectedKey?.idx === null) return;
    const idx = selectedKey.idx;
    if (selectedTrack.meta.kind === 'multi') {
      const channelId = selectedKey?.channelId || selectedChannelId;
      if (!channelId) return;
      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        const list = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
        if (!list[idx]) return track;
        list.splice(idx, 1);
        channels[channelId] = list;
        return { ...track, channels };
      });
      setSelectedKey(null);
      return;
    }
    updateTrack(selectedTrack.track.widgetId, (track) => {
      const list = Array.isArray(track.keyframes) ? [...track.keyframes] : [];
      if (!list[idx]) return track;
      list.splice(idx, 1);
      return { ...track, keyframes: list };
    });
    setSelectedKey(null);
  }, [selectedTrack, selectedKeyframe, selectedKey, selectedChannelId, updateTrack, setSelectedKey]);

  const handleFrameChange = useCallback(
    (raw) => {
      if (!selectedTrack || !selectedKeyframe || selectedKey?.idx === null) return;
      const next = Number(raw);
      if (!Number.isFinite(next)) return;
      const frame = Math.max(0, Math.round(next));
      if (selectedTrack.meta.kind === 'multi') {
        const channelId = selectedKey?.channelId || selectedChannelId;
        if (!channelId) return;
        const list = selectedTrack.channels?.[channelId] || [];
        if (isFrameTaken(list, frame, selectedKey.idx)) {
          showStatus('Frame deja utilisee.');
          return;
        }
        updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
          frame
        });
        const globalFrame = toGlobalFrame(selectedTrack, frame);
        setPlayheadFrame(Math.round(globalFrame));
        return;
      }
      if (isFrameTaken(selectedTrack.keyframes, frame, selectedKey.idx)) {
        showStatus('Frame deja utilisee.');
        return;
      }
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, { frame });
      const globalFrame = toGlobalFrame(selectedTrack, frame);
      setPlayheadFrame(Math.round(globalFrame));
    },
    [selectedTrack, selectedKeyframe, selectedKey, selectedChannelId, isFrameTaken, showStatus, updateChannelKeyframe, toGlobalFrame, setPlayheadFrame, updateKeyframe]
  );

  const handleValueChange = useCallback(
    (raw) => {
      if (!selectedTrack || !selectedKeyframe || selectedKey?.idx === null) return;
      const meta = selectedTrack.meta;
      if (meta.kind === 'multi') {
        const channelId = selectedKey?.channelId || selectedChannelId;
        if (!channelId) return;
        const next = Number(raw);
        if (!Number.isFinite(next)) return;
        const coerced = coerceNumericValue(next, { numericKind: 'float' }, null);
        if (coerced === null) {
          showStatus('Valeur hors limite.');
          return;
        }
        updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
          value: coerced
        });
        return;
      }
      if (meta.kind === 'number') {
        const next = Number(raw);
        if (!Number.isFinite(next)) return;
        const range = getNumericRange(meta, selectedTrack.keyframes);
        const coerced = coerceNumericValue(next, meta, range);
        if (coerced === null) {
          showStatus('Valeur hors limite.');
          return;
        }
        updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, { value: coerced });
        return;
      }
      if (meta.kind === 'bool') {
        updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, { value: !!raw });
        return;
      }
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, { value: raw });
    },
    [selectedTrack, selectedKeyframe, selectedKey, selectedChannelId, coerceNumericValue, getNumericRange, showStatus, updateChannelKeyframe, updateKeyframe]
  );

  const commitKeyframeFrameDraft = useCallback(
    (raw) => {
      if (!selectedTrack || !selectedKeyframe) return;
      const value = String(raw ?? '').trim();
      if (!value) return;
      const globalFrame = useTimecodeView
        ? parseTcShorthand(value, fps, playheadFrame, true)
        : Number(value);
      if (!Number.isFinite(globalFrame)) return;
      const localFrame = toLocalFrameRounded(selectedTrack, globalFrame);
      handleFrameChange(localFrame);
    },
    [selectedTrack, selectedKeyframe, useTimecodeView, fps, playheadFrame, toLocalFrameRounded, handleFrameChange]
  );

  const commitKeyframeValueDraft = useCallback(
    (raw) => {
      if (!selectedTrack || !selectedKeyframe) return;
      const meta = selectedTrack.meta;
      if (meta.kind === 'number' || meta.kind === 'multi') {
        const sanitized = String(raw ?? '').trim().replace(/,/g, '.');
        if (!sanitized || sanitized === '-' || sanitized === '.') return;
        handleValueChange(sanitized);
        return;
      }
      handleValueChange(raw ?? '');
    },
    [selectedTrack, selectedKeyframe, handleValueChange]
  );

  const commitBundleFrameDraft = useCallback(
    (raw) => {
      if (!selectedTrack || !selectedBundle) return;
      const value = String(raw ?? '').trim();
      if (!value) return;
      const global = useTimecodeView
        ? parseTcShorthand(value, fps, playheadFrame, true)
        : Number(value);
      if (!Number.isFinite(global)) return;
      const frame = toLocalFrameRounded(selectedTrack, global);
      let blocked = '';
      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        for (const item of selectedBundle.items) {
          if (!item || item.idx === null || item.idx < 0) continue;
          const list = Array.isArray(channels[item.channel.id])
            ? [...channels[item.channel.id]]
            : [];
          if (isFrameTaken(list, frame, item.idx)) {
            blocked = 'Frame deja utilisee.';
            return track;
          }
        }
        const nextChannels = { ...channels };
        selectedBundle.items.forEach((item) => {
          if (!item || item.idx === null || item.idx < 0) return;
          const list = Array.isArray(nextChannels[item.channel.id])
            ? [...nextChannels[item.channel.id]]
            : [];
          if (!list[item.idx]) return;
          list[item.idx] = { ...list[item.idx], frame };
          nextChannels[item.channel.id] = list;
        });
        return { ...track, channels: nextChannels };
      });
      if (blocked) {
        showStatus(blocked);
      }
    },
    [selectedTrack, selectedBundle, useTimecodeView, fps, playheadFrame, toLocalFrameRounded, updateTrack, isFrameTaken, showStatus]
  );

  return {
    handleRemoveKeyframe,
    handleFrameChange,
    handleValueChange,
    commitKeyframeFrameDraft,
    commitKeyframeValueDraft,
    commitBundleFrameDraft,
    pickDefaultValue,
    pickDefaultChannelValue
  };
}
