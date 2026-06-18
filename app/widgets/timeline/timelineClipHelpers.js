export function buildTimelineClipModel({
  entry,
  contentBounds,
  frameToX,
  toGlobalFrame,
  minClipPx,
}) {
  const clipStartFrame = toGlobalFrame(entry, entry.localMinFrame);
  const clipEndFrame = toGlobalFrame(entry, entry.localMaxFrame);
  const clipStartX = frameToX(clipStartFrame);
  const clipEndX = frameToX(clipEndFrame);
  const rawWidth = clipEndX - clipStartX;
  let visualStartX = clipStartX;
  let visualEndX = clipEndX;

  if (rawWidth < minClipPx) {
    visualStartX = clipStartX - minClipPx / 2;
    visualEndX = clipStartX + minClipPx / 2;
  }

  const width = Math.max(minClipPx, visualEndX - visualStartX);
  const clipHeight = Math.max(12, contentBounds.bottom - contentBounds.top - 12);
  const clipY =
    contentBounds.top + (contentBounds.bottom - contentBounds.top - clipHeight) / 2;
  const handleWidth = Math.min(8, width);

  return {
    visualStartX,
    width,
    clipY,
    clipHeight,
    handleWidth,
    showHandles: entry.localDuration > 0,
  };
}
