import { getNumericRange, getWidgetValueMeta } from '../../utils/timeline';
import { getTrackOffset, getTrackScale } from './frameUtils';
import {
  getLocalMaxFrame,
  getLocalMinFrame,
  getLocalMaxFrameFromChannels,
  getLocalMinFrameFromChannels,
} from './timelineEntryHelpers';

function normalizeValidRange(range) {
  if (!range) return null;
  const min = Number(range.min);
  const max = Number(range.max);
  const step = Number(range.step);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  return {
    min,
    max,
    step: Number.isFinite(step) && step > 0 ? step : null,
  };
}

function resolveChannelRangeFromUi(widgetInfo, meta, channelId) {
  if (!meta || !widgetInfo) return null;
  const ui = widgetInfo.ui || {};

  if (meta.shape === 'vector') {
    return normalizeValidRange(ui.range) || { min: -10, max: 10, step: 0.1 };
  }

  if (meta.shape === 'joystick') {
    const axisRange =
      channelId === 'x'
        ? normalizeValidRange(ui.rangeX) || normalizeValidRange(ui.range)
        : channelId === 'y'
        ? normalizeValidRange(ui.rangeY) || normalizeValidRange(ui.range)
        : normalizeValidRange(ui.range);
    return axisRange || { min: -10, max: 10, step: 0.1 };
  }

  if (meta.shape === 'color') {
    if (channelId === 'a') {
      return normalizeValidRange(ui.rangeAlpha) || { min: 0, max: 1, step: 0.1 };
    }
    return normalizeValidRange(ui.range) || { min: 0, max: 1, step: 0.1 };
  }

  if (meta.shape === 'transform') {
    const map = {
      tx: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
      ty: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
      tz: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
      rroll: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
      rpitch: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
      ryaw: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
      sx: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } },
      sy: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } },
      sz: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } },
    };
    const conf = map[channelId];
    if (!conf) return null;
    return normalizeValidRange(ui[conf.key]) || conf.fallback;
  }

  return null;
}

export function buildTimelineTrackEntries(tracks = [], widgetMap = new Map()) {
  return (tracks || []).map((track, index) => {
    const widgetInfo = widgetMap.get(track.widgetId);
    const meta = getWidgetValueMeta(widgetInfo);
    const keyframes = Array.isArray(track.keyframes)
      ? [...track.keyframes].sort((a, b) => a.frame - b.frame)
      : [];
    const numericRange = meta.kind === 'number' ? getNumericRange(meta, keyframes) : null;
    const rawChannels =
      track?.channels && typeof track.channels === 'object' ? track.channels : {};
    const channels =
      meta.kind === 'multi' && Array.isArray(meta.channels)
        ? Object.fromEntries(
            meta.channels.map((channel) => [
              channel.id,
              Array.isArray(rawChannels[channel.id])
                ? [...rawChannels[channel.id]].sort((a, b) => a.frame - b.frame)
                : [],
            ])
          )
        : {};
    const channelRanges =
      meta.kind === 'multi' && Array.isArray(meta.channels)
        ? Object.fromEntries(
            meta.channels.map((channel) => [
              channel.id,
              resolveChannelRangeFromUi(widgetInfo, meta, channel.id) ||
                getNumericRange({ numericKind: 'float' }, channels[channel.id]),
            ])
          )
        : {};
    let sharedRange = null;
    if (
      meta.kind === 'multi' &&
      (meta.shape === 'vector' || meta.shape === 'color' || meta.shape === 'joystick')
    ) {
      const firstChannel = meta.channels?.[0]?.id;
      sharedRange =
        (firstChannel && resolveChannelRangeFromUi(widgetInfo, meta, firstChannel)) ||
        getNumericRange({ numericKind: 'float' }, Object.values(channels).flat());
    }
    const offset = getTrackOffset(track);
    const scale = getTrackScale(track);
    let localMinFrame =
      meta.kind === 'multi' ? getLocalMinFrameFromChannels(channels) : getLocalMinFrame(keyframes);
    let localMaxFrame =
      meta.kind === 'multi' ? getLocalMaxFrameFromChannels(channels) : getLocalMaxFrame(keyframes);
    if (meta.kind === 'multi') {
      const minFromKeyframes = getLocalMinFrame(keyframes);
      if (Number.isFinite(minFromKeyframes)) {
        localMinFrame =
          localMinFrame === null ? minFromKeyframes : Math.min(localMinFrame, minFromKeyframes);
      }
      const maxFromKeyframes = getLocalMaxFrame(keyframes);
      if (Number.isFinite(maxFromKeyframes)) {
        localMaxFrame =
          localMaxFrame === null ? maxFromKeyframes : Math.max(localMaxFrame, maxFromKeyframes);
      }
    }
    const hasFrames = Number.isFinite(localMinFrame) && Number.isFinite(localMaxFrame);
    if (!hasFrames) {
      localMinFrame = 0;
      localMaxFrame = 0;
    }
    const localDuration = hasFrames ? Math.max(0, localMaxFrame - localMinFrame) : 0;
    const hasContainer = hasFrames && localDuration > 0;
    return {
      track,
      index,
      widget: widgetInfo,
      meta,
      keyframes,
      numericRange,
      channels,
      channelRanges,
      sharedRange,
      offset,
      scale,
      localMinFrame,
      localMaxFrame,
      localDuration,
      hasFrames,
      hasContainer,
    };
  });
}
