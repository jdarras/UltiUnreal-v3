// Frame conversion helpers shared in the timeline

export const getTrackOffset = (track) => {
  const raw = Number(track?.offset);
  if (!Number.isFinite(raw)) return 0;
  const snapped = Math.abs(raw - Math.round(raw)) < 1e-4 ? Math.round(raw) : raw;
  return snapped;
};

export const getTrackScale = (track) => {
  const raw = Number(track?.scale);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (Math.abs(raw - 1) < 1e-4) return 1;
  return raw;
};

export const toGlobalFrame = (trackInfo, localFrame) => {
  const offset = getTrackOffset(trackInfo);
  const scale = getTrackScale(trackInfo);
  return offset + localFrame * scale;
};

export const toLocalFrame = (trackInfo, globalFrame) => {
  const offset = getTrackOffset(trackInfo);
  const scale = getTrackScale(trackInfo);
  return (globalFrame - offset) / scale;
};

export const toLocalFrameRounded = (trackInfo, globalFrame) => {
  const val = toLocalFrame(trackInfo, globalFrame);
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.round(val));
};

export const getShiftedLocalFrame = (track, globalFrame) => {
  const offset = getTrackOffset(track);
  const scale = getTrackScale(track);
  const localRaw = scale ? (globalFrame - offset) / scale : 0;
  if (!Number.isFinite(localRaw)) return null;
  const shiftFrames = localRaw < 0 ? Math.ceil(-localRaw) : 0;
  const localFrame = Math.max(0, Math.round(localRaw + shiftFrames));
  return { offset, scale, localFrame, shiftFrames };
};
