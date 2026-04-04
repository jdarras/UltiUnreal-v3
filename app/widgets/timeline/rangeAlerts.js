export function getFiniteNumber(value, fallback = null) {
  if (value === '' || value === '-' || value === null || value === undefined) {
    return Number.isFinite(fallback) ? Number(fallback) : null;
  }
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  return Number.isFinite(fallback) ? Number(fallback) : null;
}

function toNumericValues(keyframes) {
  if (!Array.isArray(keyframes)) return [];
  return keyframes
    .map((kf) => Number(kf?.value))
    .filter((value) => Number.isFinite(value));
}

export function hasValuesBelowMin(keyframes, min) {
  if (!Number.isFinite(min)) return false;
  return toNumericValues(keyframes).some((value) => value < min);
}

export function hasValuesAboveMax(keyframes, max) {
  if (!Number.isFinite(max)) return false;
  return toNumericValues(keyframes).some((value) => value > max);
}

export function collectChannelKeyframes(track, channelIds) {
  const channels = track?.channels && typeof track.channels === 'object'
    ? track.channels
    : {};
  return (channelIds || []).flatMap((channelId) =>
    Array.isArray(channels[channelId]) ? channels[channelId] : []
  );
}
