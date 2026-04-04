// Helpers to shift keyframes while keeping order and clamping to 0
function shiftKeyframeList(list, shiftFrames) {
  if (!Array.isArray(list)) return list;
  if (!shiftFrames) return [...list];
  const shifted = list.map((kf) => {
    const frame = Number(kf?.frame);
    if (!Number.isFinite(frame)) return kf;
    return { ...kf, frame: Math.max(0, Math.round(frame + shiftFrames)) };
  });
  shifted.sort((a, b) => a.frame - b.frame);
  return shifted;
}

export function shiftTrackKeyframes(track, shiftFrames, offset, scale) {
  if (!shiftFrames) return { ...track };
  const nextOffset = Math.round(offset - shiftFrames * scale);
  const nextTrack = { ...track, offset: nextOffset };
  if (Array.isArray(track.keyframes)) {
    nextTrack.keyframes = shiftKeyframeList(track.keyframes, shiftFrames);
  }
  if (track.channels && typeof track.channels === 'object') {
    const nextChannels = {};
    Object.entries(track.channels).forEach(([channel, list]) => {
      nextChannels[channel] = shiftKeyframeList(list, shiftFrames);
    });
    nextTrack.channels = nextChannels;
  }
  return nextTrack;
}
