import { useCallback } from 'react';

export function useTimelineHeaderControlActions({
  setZoomFactor,
  setViewStart,
  clampViewStart,
  viewFrames,
  updateWidget,
  widgetId,
  setTimelineDraft,
}) {
  const handleZoomOut = useCallback(() => {
    setZoomFactor((z) => Math.max(1, z / 1.25));
    setViewStart((prev) => clampViewStart(prev));
  }, [clampViewStart, setViewStart, setZoomFactor]);

  const handleZoomIn = useCallback(() => {
    setZoomFactor((z) => Math.min(30, z * 1.25));
  }, [setZoomFactor]);

  const handleZoomCenter = useCallback(
    (frame) => {
      const newStart = clampViewStart(frame - viewFrames / 2);
      setViewStart(newStart);
    },
    [clampViewStart, setViewStart, viewFrames]
  );

  const handleTimelineHeaderLabelChange = useCallback(
    (nextLabel) => {
      updateWidget?.(widgetId, { label: nextLabel });
    },
    [updateWidget, widgetId]
  );

  const handleTimelineModeChange = useCallback(
    (nextMode) => {
      setTimelineDraft((prev) => ({ ...prev, mode: nextMode }));
    },
    [setTimelineDraft]
  );

  return {
    handleZoomOut,
    handleZoomIn,
    handleZoomCenter,
    handleTimelineHeaderLabelChange,
    handleTimelineModeChange,
  };
}
