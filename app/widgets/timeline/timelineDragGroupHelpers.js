export const TIMELINE_FRAME_TAKEN_MESSAGE = 'Frame deja utilisee.';
export const TIMELINE_VALUE_OUT_OF_RANGE_MESSAGE = 'Valeur hors limite.';

function isTimelineFrameTaken(list, targetFrame, key, ignoreMap) {
  const ignoreSet = ignoreMap.get(key);
  return list.some((keyframe, index) => {
    if (ignoreSet && ignoreSet.has(index)) return false;
    return Number(keyframe?.frame) === targetFrame;
  });
}

function getSelectionTargetFrame(selection, deltaFrame) {
  return Math.max(0, Math.round(selection.startLocalFrame + deltaFrame));
}

export function applyTimelineGroupDragToTrack({
  track,
  trackInfo,
  selection,
  deltaFrame,
  deltaValue,
  ignoreMap,
  getNumericRange,
  coerceNumericValue,
}) {
  const channels =
    track.channels && typeof track.channels === 'object'
      ? { ...track.channels }
      : {};
  const keyframes = Array.isArray(track.keyframes) ? [...track.keyframes] : [];

  for (const item of selection) {
    const targetFrame = getSelectionTargetFrame(item, deltaFrame);
    const key = `${item.trackId}:${item.channelId || ''}`;
    if (item.channelId) {
      const list = Array.isArray(channels[item.channelId])
        ? [...channels[item.channelId]]
        : [];
      if (isTimelineFrameTaken(list, targetFrame, key, ignoreMap)) {
        return { track, blockedReason: TIMELINE_FRAME_TAKEN_MESSAGE };
      }
    } else if (isTimelineFrameTaken(keyframes, targetFrame, key, ignoreMap)) {
      return { track, blockedReason: TIMELINE_FRAME_TAKEN_MESSAGE };
    }
  }

  for (const item of selection) {
    const targetFrame = getSelectionTargetFrame(item, deltaFrame);
    if (item.channelId) {
      const list = Array.isArray(channels[item.channelId])
        ? [...channels[item.channelId]]
        : [];
      if (!list[item.idx]) continue;
      const nextKeyframe = { ...list[item.idx], frame: targetFrame };
      if (deltaValue !== null && Number.isFinite(item.startValueNum)) {
        const range =
          trackInfo.channelRanges?.[item.channelId] ||
          trackInfo.sharedRange ||
          getNumericRange({ numericKind: 'float' }, list);
        const coerced = coerceNumericValue(
          item.startValueNum + deltaValue,
          { numericKind: 'float' },
          range
        );
        if (coerced === null) {
          return { track, blockedReason: TIMELINE_VALUE_OUT_OF_RANGE_MESSAGE };
        }
        nextKeyframe.value = coerced;
      }
      list[item.idx] = nextKeyframe;
      channels[item.channelId] = list;
    } else {
      if (!keyframes[item.idx]) continue;
      const nextKeyframe = { ...keyframes[item.idx], frame: targetFrame };
      if (deltaValue !== null && Number.isFinite(item.startValueNum)) {
        const range =
          trackInfo.numericRange || getNumericRange(trackInfo.meta, keyframes);
        const coerced = coerceNumericValue(
          item.startValueNum + deltaValue,
          trackInfo.meta,
          range
        );
        if (coerced === null) {
          return { track, blockedReason: TIMELINE_VALUE_OUT_OF_RANGE_MESSAGE };
        }
        nextKeyframe.value = coerced;
      }
      keyframes[item.idx] = nextKeyframe;
    }
  }

  return {
    track: trackInfo.meta.kind === 'multi' ? { ...track, channels } : { ...track, keyframes },
    blockedReason: '',
  };
}
