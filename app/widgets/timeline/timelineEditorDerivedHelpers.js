export function getTimelineChannelBounds(entry, channelId) {
  if (!entry || entry.meta?.kind !== 'multi') return entry?.bounds || null;
  if (
    entry.meta?.shape === 'vector' ||
    entry.meta?.shape === 'color' ||
    entry.meta?.shape === 'joystick' ||
    entry.meta?.shape === 'transform'
  ) {
    return entry.vectorBounds || entry.bounds;
  }
  const row = (entry.channelRows || []).find(
    (item) => item.channel?.id === channelId
  );
  return row?.bounds || entry.bounds;
}

export function getTimelineWidgetCurrentValue(widget) {
  if (!widget) return null;
  if (widget.currentValue !== undefined) return widget.currentValue;
  if (widget.value !== undefined) return widget.value;
  return null;
}
