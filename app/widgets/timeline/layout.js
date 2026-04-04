// Geometry and styling constants for the timeline editor
export const GRAPH_WIDTH = 1000;
export const GRAPH_LEFT = 200;
export const GRAPH_RIGHT = 20;
export const GRAPH_TOP = 20;
export const GRAPH_BOTTOM = 28;
export const TRACK_HEIGHT = 42;
const TRACK_HEIGHT_EXPANDED = 120;
const TALL_GRAPH_MULTIPLIER = 4;
const TALL_GRAPH_BASE_ROWS = 3;
export const CHANNEL_ROW_HEIGHT = 32;
const TRACK_GAP = 10;
export const GRID_COLS = 10;
export const MIN_CLIP_PX = 12;
export const MIN_SCALE = 0.05;
export const KEY_EYE_GAP = 24;
export const KEY_EYE_BOX = 16;
export const COLLAPSE_BTN_SIZE = 16;
export const VECTOR_CHANNEL_COLORS = {
  x: '#ef4444',
  y: '#22c55e',
  z: '#3b82f6'
};
export const TRANSFORM_CHANNEL_COLORS = {
  tx: '#ef4444', // rouge
  ty: '#22c55e', // vert
  tz: '#3b82f6', // bleu
  rroll: '#b91c1c', // rouge sombre
  rpitch: '#166534', // vert sombre
  ryaw: '#1d4ed8', // bleu sombre
  sx: '#fca5a5', // rouge clair
  sy: '#bbf7d0', // vert clair
  sz: '#bfdbfe' // bleu clair
};
export const COLOR_CHANNEL_COLORS = {
  r: '#ef4444',
  g: '#22c55e',
  b: '#3b82f6',
  a: '#94a3b8'
};
const SHARED_GRID_SHAPES = new Set(['vector', 'color', 'joystick', 'transform']);
export const LINKABLE_MULTI_SHAPES = new Set(['vector', 'color', 'joystick', 'transform']);
export const SQUARE_POINT_KINDS = new Set(['event', 'bool', 'enum', 'text']);
export const CHANNEL_COLORS = [
  '#38bdf8',
  '#f97316',
  '#22c55e',
  '#e879f9',
  '#f43f5e',
  '#facc15',
  '#60a5fa',
  '#a78bfa',
  '#34d399'
];
export const LABEL_RIGHT_X = GRAPH_LEFT - 8;
export const COLLAPSE_X = GRAPH_LEFT - 180;
export const KEY_CONTROL_START_X = GRAPH_LEFT - 150;
export const KEY_CONTROL_GAP = 14;
export const KEY_VALUE_WIDTH = 86;
export const KEY_VALUE_HEIGHT = 24;
export const KEY_VALUE_OFFSET_Y = -6;
const TALL_GRAPH_TYPES = new Set(['slider', 'vector', 'joystick', 'color', 'transform']);

// Build layout for tracks (positions, heights...)
export function buildTrackLayout(trackEntries, expandedTrackId) {
  let cursor = GRAPH_TOP;
  return trackEntries.map((entry) => {
    const collapsed = !!entry.track.collapsed;
    const skipExpand =
      entry.meta && ['event', 'bool', 'enum', 'text'].includes(entry.meta.kind);
    const widgetType = String(entry.widget?.type || '').toLowerCase();
    const isTallGraph =
      TALL_GRAPH_TYPES.has(widgetType) || entry.meta?.kind === 'number';
    const tallGraphBodyHeight =
      CHANNEL_ROW_HEIGHT * TALL_GRAPH_MULTIPLIER * TALL_GRAPH_BASE_ROWS;
    const expanded =
      !collapsed &&
      entry.track.widgetId === expandedTrackId &&
      !skipExpand;
    const channelCount =
      entry.meta?.kind === 'multi' && Array.isArray(entry.meta.channels)
        ? entry.meta.channels.length
        : 0;
    const shape = String(entry.meta?.shape || '').toLowerCase();
    const isSharedGraph =
      entry.meta?.kind === 'multi' && SHARED_GRID_SHAPES.has(shape);
    const headerHeight = CHANNEL_ROW_HEIGHT;
    const rowHeight =
      expanded && isTallGraph && channelCount
        ? tallGraphBodyHeight / Math.max(1, channelCount)
        : CHANNEL_ROW_HEIGHT;
    const expandedHeight = isTallGraph
      ? tallGraphBodyHeight
      : TRACK_HEIGHT_EXPANDED;
    let height = collapsed
      ? headerHeight
      : expanded
      ? expandedHeight + headerHeight
      : TRACK_HEIGHT + headerHeight;
    if (!collapsed && entry.meta?.kind === 'multi') {
      const rows = Math.max(1, channelCount);
      height = headerHeight + rows * rowHeight;
    }
    const top = cursor;
    const bottom = top + height;
    cursor = bottom + TRACK_GAP;
    let channelRows = [];
    let headerRow = null;
    let vectorBounds = null;
    let contentBounds = null;
    if (headerHeight) {
      headerRow = {
        bounds: {
          top,
          bottom: top + headerHeight,
          mid: top + headerHeight / 2
        }
      };
    }
    if (!collapsed && entry.meta?.kind === 'multi') {
      const channels = Array.isArray(entry.meta.channels)
        ? entry.meta.channels
        : [];
      if (isSharedGraph) {
        const channelStart = top + headerHeight;
        channelRows = channels.map((channel, idx) => {
          const rowTop = channelStart + idx * rowHeight;
          const rowBottom = rowTop + rowHeight;
          return {
            channel,
            idx,
            bounds: {
              top: rowTop,
              bottom: rowBottom,
              mid: rowTop + rowHeight / 2
            }
          };
        });
        if (channelRows.length) {
          vectorBounds = {
            top: channelRows[0].bounds.top,
            bottom: channelRows[channelRows.length - 1].bounds.bottom,
            mid:
              (channelRows[0].bounds.top +
                channelRows[channelRows.length - 1].bounds.bottom) / 2
          };
          contentBounds = vectorBounds;
        }
      } else {
        const channelStart = top + headerHeight;
        channelRows = channels.map((channel, idx) => {
          const rowTop = channelStart + idx * rowHeight;
          const rowBottom = rowTop + rowHeight;
          return {
            channel,
            idx,
            bounds: {
              top: rowTop,
              bottom: rowBottom,
              mid: rowTop + rowHeight / 2
            }
          };
        });
        if (channelRows.length) {
          contentBounds = {
            top: channelRows[0].bounds.top,
            bottom: channelRows[channelRows.length - 1].bounds.bottom,
            mid:
              (channelRows[0].bounds.top +
                channelRows[channelRows.length - 1].bounds.bottom) / 2
          };
        }
      }
    } else if (!collapsed) {
      contentBounds = {
        top: top + headerHeight,
        bottom,
        mid: top + headerHeight + (bottom - (top + headerHeight)) / 2
      };
    }
    return {
      ...entry,
      collapsed,
      expanded,
      channelRows,
      headerRow,
      vectorBounds,
      contentBounds,
      bounds: {
        top,
        bottom,
        mid: top + height / 2
      }
    };
  });
}
