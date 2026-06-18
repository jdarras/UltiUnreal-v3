function pushFiniteGlobalFrame(frames, entry, keyframe, toGlobalFrame) {
  const frame = Number(keyframe?.frame);
  if (!Number.isFinite(frame)) return;
  frames.push(toGlobalFrame(entry, frame));
}

export function buildTimelineCollapsedFrameModel(entry, toGlobalFrame) {
  const frames = [];

  if (entry.meta?.kind === 'multi') {
    const channels = Array.isArray(entry.meta?.channels) ? entry.meta.channels : [];
    channels.forEach((channel) => {
      const list = entry.channels?.[channel.id] || [];
      list.forEach((keyframe) => {
        pushFiniteGlobalFrame(frames, entry, keyframe, toGlobalFrame);
      });
    });
  } else {
    (entry.keyframes || []).forEach((keyframe) => {
      pushFiniteGlobalFrame(frames, entry, keyframe, toGlobalFrame);
    });
  }

  let minFrame = null;
  let maxFrame = null;
  frames.forEach((frame) => {
    minFrame = minFrame === null ? frame : Math.min(minFrame, frame);
    maxFrame = maxFrame === null ? frame : Math.max(maxFrame, frame);
  });

  return {
    frames,
    minFrame,
    maxFrame,
    hasRange: frames.length > 0 && minFrame !== null && maxFrame !== null && minFrame !== maxFrame,
  };
}
