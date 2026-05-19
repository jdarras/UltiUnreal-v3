import { sampleNumericValue } from '../../utils/timeline';
import { LINKABLE_MULTI_SHAPES, SQUARE_POINT_KINDS } from './layout';

function getLocalMaxFrame(keyframes) {
  let max = null;
  (keyframes || []).forEach((kf) => {
    const frame = Number(kf?.frame);
    if (!Number.isFinite(frame)) return;
    max = max === null ? frame : Math.max(max, frame);
  });
  return max;
}

function getLocalMinFrame(keyframes) {
  let min = null;
  (keyframes || []).forEach((kf) => {
    const frame = Number(kf?.frame);
    if (!Number.isFinite(frame)) return;
    min = min === null ? frame : Math.min(min, frame);
  });
  return min;
}

function getLocalMaxFrameFromChannels(channels) {
  if (!channels) return null;
  let max = null;
  Object.values(channels).forEach((list) => {
    if (!Array.isArray(list)) return;
    const localMax = getLocalMaxFrame(list);
    if (!Number.isFinite(localMax)) return;
    max = max === null ? localMax : Math.max(max, localMax);
  });
  return max;
}

function getLocalMinFrameFromChannels(channels) {
  if (!channels) return null;
  let min = null;
  Object.values(channels).forEach((list) => {
    if (!Array.isArray(list)) return;
    const localMin = getLocalMinFrame(list);
    if (!Number.isFinite(localMin)) return;
    min = min === null ? localMin : Math.min(min, localMin);
  });
  return min;
}

function getChannelValueAt(entry, channelId, localFrame) {
  const list = entry.channels?.[channelId] || [];
  if (!list.length) return null;
  const value = sampleNumericValue(list, localFrame);
  return Number.isFinite(value) ? value : null;
}

function isLinkableEntry(entry) {
  if (!entry) return false;
  const shape = String(entry.meta?.shape || '').toLowerCase();
  return entry.meta?.kind === 'multi' && LINKABLE_MULTI_SHAPES.has(shape);
}

function isTrackLinked(entry) {
  if (!isLinkableEntry(entry)) return false;
  return !!entry.track?.linkChannels;
}

function shouldRenderSquare(entry) {
  if (!entry) return false;
  return SQUARE_POINT_KINDS.has(entry.meta.kind);
}

function shouldShowEye(entry) {
  if (!entry) return false;
  if (entry.meta.kind === 'multi') {
    const count = Array.isArray(entry.meta.channels)
      ? entry.meta.channels.length
      : 0;
    return count > 1;
  }
  if (entry.meta.kind === 'color') return true;
  if (entry.meta.kind === 'object' && entry.meta.shape === 'joystick') {
    return true;
  }
  return false;
}

function isCurveHidden(entry, channelId = null) {
  if (!entry) return false;
  if (entry.meta.kind === 'multi') {
    const hidden = entry.track.hiddenChannels || {};
    return !!hidden[channelId];
  }
  return !!entry.track.hidden;
}

export {
  getLocalMaxFrame,
  getLocalMinFrame,
  getLocalMaxFrameFromChannels,
  getLocalMinFrameFromChannels,
  getChannelValueAt,
  isLinkableEntry,
  isTrackLinked,
  shouldRenderSquare,
  shouldShowEye,
  isCurveHidden,
};
