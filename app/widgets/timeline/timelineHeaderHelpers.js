function buildTimelineHeaderMetrics({
  graphWidth,
  graphRight,
  collapseX,
  collapseBtnSize,
}) {
  const headerX = collapseX + collapseBtnSize + 8;
  const headerWidth = graphWidth - headerX - graphRight;
  return { headerX, headerWidth };
}

function buildSelectionAfterUnlink({
  selectedKey,
  previousSelection,
  selectedChannelId,
  trackId,
}) {
  const primary =
    selectedKey ||
    previousSelection?.[0] ||
    (selectedChannelId
      ? {
          trackId,
          channelId: selectedChannelId,
          idx: selectedKey?.idx ?? 0
        }
      : null);
  return primary ? [primary] : [];
}

export {
  buildTimelineHeaderMetrics,
  buildSelectionAfterUnlink,
};
