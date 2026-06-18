const TRANSFORM_GROUP_MAP = {
  tx: 'location',
  ty: 'location',
  tz: 'location',
  rroll: 'rotation',
  rpitch: 'rotation',
  ryaw: 'rotation',
  sx: 'scale',
  sy: 'scale',
  sz: 'scale',
};

const COLOR_GROUP_MAP = { r: 'rgb', g: 'rgb', b: 'rgb', a: 'alpha' };

export function resolveTimelineZeroLineY(range, bounds) {
  if (!(Number.isFinite(range?.min) && Number.isFinite(range?.max))) return null;
  if (range.min > 0 || range.max < 0) return null;
  const ratio = range.max === range.min ? 0.5 : (0 - range.min) / (range.max - range.min);
  return bounds.bottom - ratio * (bounds.bottom - bounds.top);
}

function resolveZeroGroupKey(shape, channelId) {
  if (shape === 'transform') return TRANSFORM_GROUP_MAP[channelId] || channelId;
  if (shape === 'color') return COLOR_GROUP_MAP[channelId] || channelId;
  return channelId;
}

function buildSharedZeroLineModel(entry, rowLines, contentBounds) {
  const range =
    entry.sharedRange ||
    entry.channelRanges?.[rowLines[0]?.channel?.id] ||
    { min: -1, max: 1 };
  const y = resolveTimelineZeroLineY(range, contentBounds);
  return y === null ? [] : [{ key: `zero-${entry.track.widgetId}`, y }];
}

function buildChannelZeroLineModels(entry, rowLines) {
  const shape = String(entry.meta?.shape || '').toLowerCase();
  const drawnZero = new Set();

  return rowLines
    .map((row) => {
      const channelId = row.channel?.id;
      const range =
        entry.channelRanges?.[channelId] ||
        entry.sharedRange ||
        { min: -1, max: 1 };
      const y = resolveTimelineZeroLineY(range, row.bounds);
      if (y === null) return null;

      const groupKey = resolveZeroGroupKey(shape, channelId);
      if ((shape === 'transform' || shape === 'color') && drawnZero.has(groupKey)) {
        return null;
      }
      if (shape === 'transform' || shape === 'color') {
        drawnZero.add(groupKey);
      }

      return { key: `zero-${entry.track.widgetId}-${channelId}`, y };
    })
    .filter(Boolean);
}

export function buildTimelineZeroLineModels({
  entry,
  rowLines = [],
  contentBounds,
  getNumericRange,
}) {
  if (rowLines.length) {
    const shape = String(entry.meta?.shape || '').toLowerCase();
    if (entry.meta?.kind === 'multi' && shape === 'vector') {
      return buildSharedZeroLineModel(entry, rowLines, contentBounds);
    }
    return buildChannelZeroLineModels(entry, rowLines);
  }

  const range =
    entry.meta?.kind === 'number'
      ? getNumericRange(entry.meta, entry.keyframes)
      : { min: -1, max: 1 };
  const y = resolveTimelineZeroLineY(range, contentBounds);
  return y === null ? [] : [{ key: `zero-${entry.track.widgetId}`, y }];
}
