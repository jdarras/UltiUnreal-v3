import { useCallback } from 'react';
import { parseTcShorthand } from '../formatters';

export function useBundleEditing({
  selectedTrack,
  selectedChannelId,
  selectedBundle,
  selectedKey: _selectedKey,
  setSelectedKey,
  setSelectedTrackId,
  setSelectedChannelId,
  setMultiSelection,
  playheadFrame,
  useTimecodeView,
  fps,
  toLocalFrameRounded,
  toGlobalFrame,
  showStatus,
  updateTrack,
  getShiftedLocalFrame,
  shiftTrackKeyframes,
  findFrameIndex,
  isFrameTaken,
  sampleNumericValue,
  pickDefaultValue,
  pickDefaultChannelValue,
  dedupeSelection,
  setBundleFrameDraft,
  setKeyframeFrameDraft,
  setBundleValueDrafts,
  setKeyframeValueDraft,
  setColorPickerState,
  hexToRgb,
  formatInputNumber,
  isTrackLinked,
  coerceNumericValue,
  defaultInterp = 'linear'
}) {
  const addKeyframeFor = useCallback(
    (trackInfo, channelId = null) => {
      if (!trackInfo) {
        showStatus('Selectionne une piste.');
        return;
      }
      const playheadInt = Number.isFinite(playheadFrame) ? Math.round(playheadFrame) : 0;
      let nextIndex = null;
      let nextIndexMap = {};
      let blockedReason = '';
      let effectiveChannelId = '';
      if (trackInfo.meta.kind === 'multi') {
        const channelIds = Array.isArray(trackInfo.meta.channels)
          ? trackInfo.meta.channels.map((channel) => channel.id).filter(Boolean)
          : [];
        effectiveChannelId = channelId || selectedChannelId || channelIds[0] || '';
        if (!effectiveChannelId) {
          showStatus('Selectionne un canal.');
          return;
        }
        const linkAll = isTrackLinked(trackInfo) && channelIds.length > 0;
        updateTrack(trackInfo.track.widgetId, (track) => {
          const shiftInfo = getShiftedLocalFrame(track, playheadInt);
          if (!shiftInfo) return track;
          const { offset, scale, localFrame: _localFrame, shiftFrames } = shiftInfo;
          const localFrameRounded = toLocalFrameRounded(track, playheadInt);
          const baseTrack = shiftTrackKeyframes(track, shiftFrames, offset, scale);
          const channels =
            baseTrack.channels && typeof baseTrack.channels === 'object'
              ? { ...baseTrack.channels }
              : {};
          if (linkAll) {
            channelIds.forEach((id) => {
              const list = Array.isArray(channels[id]) ? [...channels[id]] : [];
              const existingIdx = findFrameIndex(list, localFrameRounded);
              if (existingIdx >= 0) {
                nextIndexMap[id] = existingIdx;
                channels[id] = list;
                return;
              }
              const sourceList = Array.isArray(baseTrack.channels?.[id])
                ? [...baseTrack.channels[id]].sort((a, b) => a.frame - b.frame)
                : [];
              let value = sampleNumericValue(sourceList, localFrameRounded);
              if (!Number.isFinite(value)) {
                value = pickDefaultChannelValue(trackInfo, id, localFrameRounded);
              }
              list.push({ frame: localFrameRounded, value, interp: defaultInterp });
              list.sort((a, b) => a.frame - b.frame);
              const sortedIdx = findFrameIndex(list, localFrameRounded);
              nextIndexMap[id] = sortedIdx >= 0 ? sortedIdx : list.length - 1;
              channels[id] = list;
            });
            return { ...baseTrack, channels };
          }
          const list = Array.isArray(channels[effectiveChannelId])
            ? [...channels[effectiveChannelId]]
            : [];
          if (isFrameTaken(list, localFrameRounded, null)) {
            blockedReason = 'Frame deja utilisee.';
            return track;
          }
          const value = pickDefaultChannelValue(
            trackInfo,
            effectiveChannelId,
            localFrameRounded
          );
          list.push({ frame: localFrameRounded, value, interp: defaultInterp });
          list.sort((a, b) => a.frame - b.frame);
          nextIndex = findFrameIndex(list, localFrameRounded);
          if (nextIndex < 0) nextIndex = list.length - 1;
          channels[effectiveChannelId] = list;
          return { ...baseTrack, channels };
        });
        if (blockedReason) {
          showStatus(blockedReason);
          return;
        }
        if (nextIndex === null && !linkAll) return;
        setSelectedTrackId(trackInfo.track.widgetId);
        setSelectedChannelId(effectiveChannelId);
        if (linkAll) {
          const fallbackIdx =
            nextIndexMap[effectiveChannelId] ?? nextIndexMap[channelIds[0]] ?? 0;
          setSelectedKey({
            trackId: trackInfo.track.widgetId,
            channelId: effectiveChannelId,
            idx: fallbackIdx
          });
          setMultiSelection(
            dedupeSelection(
              channelIds.map((id) => ({
                trackId: trackInfo.track.widgetId,
                channelId: id,
                idx: nextIndexMap[id] ?? fallbackIdx
              }))
            )
          );
        } else {
          setSelectedKey({
            trackId: trackInfo.track.widgetId,
            channelId: effectiveChannelId,
            idx: nextIndex
          });
        }
        return;
      }

      updateTrack(trackInfo.track.widgetId, (track) => {
        const shiftInfo = getShiftedLocalFrame(track, playheadInt);
        if (!shiftInfo) return track;
        const { offset, scale, localFrame: _localFrame, shiftFrames } = shiftInfo;
        const localFrameRounded = toLocalFrameRounded(track, playheadInt);
        const baseTrack = shiftTrackKeyframes(track, shiftFrames, offset, scale);
        const list = Array.isArray(baseTrack.keyframes)
          ? [...baseTrack.keyframes]
          : [];
        if (isFrameTaken(list, localFrameRounded, null)) {
          blockedReason = 'Frame deja utilisee.';
          return track;
        }
        const value = pickDefaultValue(trackInfo, localFrameRounded);
        list.push({ frame: localFrameRounded, value, interp: defaultInterp });
        list.sort((a, b) => a.frame - b.frame);
        nextIndex = findFrameIndex(list, localFrameRounded);
        if (nextIndex < 0) nextIndex = list.length - 1;
        return { ...baseTrack, keyframes: list };
      });
      if (blockedReason) {
        showStatus(blockedReason);
        return;
      }
      if (nextIndex === null) return;
      setSelectedTrackId(trackInfo.track.widgetId);
      setSelectedKey({ trackId: trackInfo.track.widgetId, idx: nextIndex });
    },
    [
      dedupeSelection,
      findFrameIndex,
      getShiftedLocalFrame,
      isFrameTaken,
      pickDefaultChannelValue,
      pickDefaultValue,
      playheadFrame,
      sampleNumericValue,
      selectedChannelId,
      setMultiSelection,
      setSelectedChannelId,
      setSelectedKey,
      setSelectedTrackId,
      shiftTrackKeyframes,
      showStatus,
      updateTrack,
      isTrackLinked
      , defaultInterp
    ]
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
        return;
      }
      const frameGlobal = toGlobalFrame(selectedTrack, frame);
      setBundleFrameDraft(String(frameGlobal));
      setKeyframeFrameDraft(String(frameGlobal));
    },
    [
      fps,
      isFrameTaken,
      playheadFrame,
      selectedBundle,
      selectedTrack,
      setBundleFrameDraft,
      setKeyframeFrameDraft,
      showStatus,
      toGlobalFrame,
      toLocalFrameRounded,
      updateTrack,
      useTimecodeView
    ]
  );

  const commitBundleValueDraft = useCallback(
    (channelId, raw) => {
      if (!selectedTrack || !selectedBundle || !channelId) return;
      const item = selectedBundle.items.find(
        (entry) => entry.channel?.id === channelId
      );
      if (!item || item.idx === null || item.idx < 0) return;
      const numeric = Number(String(raw ?? '').trim().replace(/,/g, '.'));
      if (!Number.isFinite(numeric)) return;
      const coerced = coerceNumericValue(numeric, { numericKind: 'float' }, null);
      if (coerced === null) {
        showStatus('Valeur hors limite.');
        return;
      }
      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        const list = Array.isArray(channels[channelId])
          ? [...channels[channelId]]
          : [];
        if (!list[item.idx]) return track;
        list[item.idx] = { ...list[item.idx], value: coerced };
        channels[channelId] = list;
        return { ...track, channels };
      });
      setBundleValueDrafts((prev) => ({
        ...prev,
        [channelId]: formatInputNumber(coerced, 'float')
      }));
      setKeyframeValueDraft(formatInputNumber(coerced, 'float'));
    },
    [
      coerceNumericValue,
      formatInputNumber,
      selectedBundle,
      selectedTrack,
      setBundleValueDrafts,
      setKeyframeValueDraft,
      showStatus,
      updateTrack,
      defaultInterp
    ]
  );

  const applyColorToBundle = useCallback(
    (hex, alphaVal) => {
      if (!selectedTrack || !selectedBundle) return;
      const { r, g, b } = hexToRgb(hex);
      const a = Number.isFinite(alphaVal) ? Math.max(0, Math.min(1, alphaVal)) : 1;
      const channelsToSet = ['r', 'g', 'b', 'a'];
      const values = {
        r: r / 255,
        g: g / 255,
        b: b / 255,
        a
      };
      updateTrack(selectedTrack.track.widgetId, (track) => {
        const channels = { ...(track.channels || {}) };
        channelsToSet.forEach((cid) => {
          const list = Array.isArray(channels[cid]) ? [...channels[cid]] : [];
          const bundleItem =
            (selectedBundle.items || []).find((it) => it.channel?.id === cid) || {};
          const idx = bundleItem.idx ?? list.length;
          const frame =
            Number(bundleItem?.keyframe?.frame) ??
            Number(selectedBundle.frame) ??
            0;
          const kf = idx < list.length && list[idx] ? { ...list[idx] } : { frame, interp: defaultInterp };
          kf.frame = Number.isFinite(frame) ? frame : 0;
          kf.value = values[cid];
          if (idx < list.length) list[idx] = kf;
          else list.push(kf);
          channels[cid] = list;
        });
        return { ...track, channels };
      });
      setBundleValueDrafts((prev) => ({
        ...prev,
        r: formatInputNumber(values.r, 'float'),
        g: formatInputNumber(values.g, 'float'),
        b: formatInputNumber(values.b, 'float'),
        a: formatInputNumber(values.a, 'float')
      }));
      setColorPickerState({ hex, alpha: a });
    },
    [
      formatInputNumber,
      hexToRgb,
      selectedBundle,
      selectedTrack,
      setBundleValueDrafts,
      setColorPickerState,
      updateTrack,
      defaultInterp
    ]
  );

  return {
    addKeyframeFor,
    commitBundleFrameDraft,
    commitBundleValueDraft,
    applyColorToBundle
  };
}
