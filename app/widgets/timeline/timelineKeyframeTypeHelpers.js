function resolveKeyframeTypeTargets(multiSelection, selectedKey) {
  if (Array.isArray(multiSelection) && multiSelection.length) return multiSelection;
  return selectedKey ? [selectedKey] : [];
}

function groupSelectionByTrackChannel(selection = []) {
  return selection.reduce((acc, sel) => {
    if (!sel || sel.idx === null || sel.idx === undefined || !sel.trackId) return acc;
    const key = sel.channelId ?? '_single';
    acc[sel.trackId] = acc[sel.trackId] || {};
    acc[sel.trackId][key] = acc[sel.trackId][key]
      ? [...acc[sel.trackId][key], sel.idx]
      : [sel.idx];
    return acc;
  }, {});
}

function cleanKeyframeForType(keyframe, type) {
  if (!keyframe) return keyframe;
  const next = { ...keyframe };
  if (type === 'bezier') {
    if (!Number.isFinite(next.inTangent)) next.inTangent = 0;
    if (!Number.isFinite(next.outTangent)) next.outTangent = 0;
  } else {
    delete next.inTangent;
    delete next.outTangent;
    delete next.inSpan;
    delete next.outSpan;
  }
  next.interp = type;
  return next;
}

function applyKeyframeTypeToTrack(track, perChannelSelection, type) {
  let changed = false;
  const nextTrack = { ...track };

  if (perChannelSelection._single && Array.isArray(track.keyframes)) {
    const list = [...track.keyframes];
    perChannelSelection._single.forEach((idx) => {
      if (!list[idx]) return;
      list[idx] = cleanKeyframeForType(list[idx], type);
      changed = true;
    });
    if (changed) nextTrack.keyframes = list;
  }

  Object.entries(perChannelSelection).forEach(([channelId, indices]) => {
    if (channelId === '_single') return;
    const baseList = Array.isArray(track.channels?.[channelId]) ? [...track.channels[channelId]] : null;
    if (!baseList) return;
    let channelChanged = false;
    indices.forEach((idx) => {
      if (!baseList[idx]) return;
      baseList[idx] = cleanKeyframeForType(baseList[idx], type);
      channelChanged = true;
      changed = true;
    });
    if (channelChanged) {
      nextTrack.channels = { ...(nextTrack.channels || {}), [channelId]: baseList };
    }
  });

  return changed ? nextTrack : track;
}

export {
  applyKeyframeTypeToTrack,
  groupSelectionByTrackChannel,
  resolveKeyframeTypeTargets,
};
