// Selection utilities shared by timeline components

export const findFrameIndex = (keyframes = [], frame) => {
  const target = Number(frame);
  if (!Number.isFinite(target)) return -1;
  return keyframes.findIndex((kf) => Number(kf?.frame) === target);
};

export const isFrameTaken = (keyframes = [], frame, ignoreIdx = null) => {
  const target = Number(frame);
  if (!Number.isFinite(target)) return false;
  return keyframes.some(
    (kf, idx) => idx !== ignoreIdx && Number(kf?.frame) === target
  );
};

