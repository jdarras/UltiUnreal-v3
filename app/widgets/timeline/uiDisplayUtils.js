import {
  VECTOR_CHANNEL_COLORS,
  COLOR_CHANNEL_COLORS,
  TRANSFORM_CHANNEL_COLORS,
  CHANNEL_COLORS
} from './layout.js';

export const getChannelColor = (entry, channel, idx) => {
  // Slider : tracer la courbe en rouge pour la valeur unique (assimilée à X)
  const widgetType = String(entry?.widget?.type || '').toLowerCase();
  if (widgetType === 'slider') {
    return '#ef4444';
  }
  if (entry?.meta?.shape === 'vector' || entry?.meta?.shape === 'joystick') {
    const id = String(channel?.id || '').toLowerCase();
    if (VECTOR_CHANNEL_COLORS[id]) return VECTOR_CHANNEL_COLORS[id];
  }
  if (entry?.meta?.shape === 'color') {
    const id = String(channel?.id || '').toLowerCase();
    if (COLOR_CHANNEL_COLORS[id]) return COLOR_CHANNEL_COLORS[id];
  }
  if (entry?.meta?.shape === 'transform') {
    const id = String(channel?.id || '').toLowerCase();
    if (TRANSFORM_CHANNEL_COLORS[id]) return TRANSFORM_CHANNEL_COLORS[id];
  }
  return CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
};

export const computeEnumWidth = (enumOptions) => {
  if (!Array.isArray(enumOptions) || !enumOptions.length) return 160;
  const longest = enumOptions.reduce(
    (max, opt) => Math.max(max, (opt.label || '').length),
    0
  );
  return Math.min(Math.max(longest * 9 + 40, 160), 420);
};
