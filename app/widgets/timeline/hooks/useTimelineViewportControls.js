import { useCallback, useEffect, useMemo } from 'react';

export function useTimelineViewportControls({
  clampedMaxFrame,
  zoomFactor,
  setZoomFactor,
  viewStart,
  setViewStart,
  graphLeft,
  graphRight,
  graphWidth,
  gridCols,
  innerWidth,
  svgRef,
  timecodeRef,
  viewportDragRef,
}) {
  const viewFrames = useMemo(() => {
    const base = Math.max(10, clampedMaxFrame || 10);
    return Math.max(10, Math.round(base / zoomFactor));
  }, [clampedMaxFrame, zoomFactor]);

  const clampViewStart = useCallback(
    (start) => {
      const maxStart = Math.max(0, clampedMaxFrame - viewFrames);
      if (!Number.isFinite(start)) return 0;
      return Math.min(Math.max(0, start), maxStart);
    },
    [clampedMaxFrame, viewFrames]
  );

  useEffect(() => {
    setViewStart((prev) => clampViewStart(prev));
  }, [clampedMaxFrame, viewFrames, clampViewStart, setViewStart]);

  const applyZoom = useCallback(
    (centerFrame, factor) => {
      const nextZoom = Math.min(30, Math.max(1, zoomFactor * factor));
      const prevViewFrames = viewFrames;
      const nextViewFrames = Math.max(10, (clampedMaxFrame || 10) / nextZoom);
      const ratio =
        prevViewFrames > 0 ? (centerFrame - viewStart) / prevViewFrames : 0.5;
      const nextStart = clampViewStart(centerFrame - ratio * nextViewFrames);
      setZoomFactor(nextZoom);
      setViewStart(nextStart);
    },
    [
      zoomFactor,
      viewFrames,
      clampedMaxFrame,
      viewStart,
      clampViewStart,
      setZoomFactor,
      setViewStart,
    ]
  );

  const frameToX = useCallback(
    (frame) => {
      const ratio = viewFrames ? (frame - viewStart) / viewFrames : 0;
      return graphLeft + ratio * innerWidth;
    },
    [viewFrames, viewStart, graphLeft, innerWidth]
  );

  const xToFrame = useCallback(
    (x) => {
      const clampedX = Math.min(
        graphWidth - graphRight,
        Math.max(graphLeft, x)
      );
      const ratio = innerWidth > 0 ? (clampedX - graphLeft) / innerWidth : 0;
      return viewStart + ratio * viewFrames;
    },
    [graphWidth, graphRight, graphLeft, innerWidth, viewStart, viewFrames]
  );

  const xTicks = useMemo(() => {
    const cols = gridCols || 10;
    return Array.from({ length: cols + 1 }).map((_, i) => {
      const ratio = cols ? i / cols : 0;
      const frame = Math.round(viewStart + ratio * viewFrames);
      return {
        x: graphLeft + ratio * innerWidth,
        label: String(frame)
      };
    });
  }, [gridCols, graphLeft, innerWidth, viewStart, viewFrames]);

  const frameLines = useMemo(() => {
    const count = Math.max(0, Math.round(viewFrames));
    if (count <= 1) return [];
    const start = Math.round(viewStart);
    return Array.from({ length: count - 1 }, (_, i) => start + i + 1);
  }, [viewFrames, viewStart]);

  const handleViewportDrag = useCallback(
    (evt) => {
      const drag = viewportDragRef.current;
      if (!drag || !drag.width || !Number.isFinite(clampedMaxFrame)) return;
      if (!(evt.buttons & 1)) return; // only while left button held
      const dx = evt.clientX - drag.startX;
      const ratio = drag.width ? dx / drag.width : 0;
      if (!drag.dragging && Math.abs(dx) < 4) return; // small click -> ignore
      drag.dragging = true;
      const deltaFrame = ratio * clampedMaxFrame;
      const nextStart = clampViewStart(drag.startViewStart + deltaFrame);
      setViewStart(nextStart);
    },
    [clampedMaxFrame, clampViewStart, viewportDragRef, setViewStart]
  );

  const handleViewportPointerDown = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const rect = timecodeRef.current?.getBoundingClientRect();
      if (!rect) return;
      viewportDragRef.current = {
        startX: evt.clientX,
        startViewStart: viewStart,
        width: rect.width,
        dragging: false
      };
      const move = (e) => handleViewportDrag(e);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        window.removeEventListener('pointerleave', up, true);
        viewportDragRef.current = null;
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
      // stop drag if pointer leaves the window (while still over the purple zone)
      window.addEventListener('pointerleave', up, true);
    },
    [viewStart, handleViewportDrag, timecodeRef, viewportDragRef]
  );

  const handleWheel = useCallback(
    (evt) => {
      if (!evt.ctrlKey) return;
      evt.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      const x = rect ? evt.clientX - rect.left : innerWidth / 2;
      const frameUnderCursor = xToFrame(
        graphLeft + Math.max(0, Math.min(innerWidth, x - graphLeft))
      );
      const factor = evt.deltaY > 0 ? 0.9 : 1.1;
      applyZoom(frameUnderCursor, factor);
    },
    [svgRef, innerWidth, graphLeft, xToFrame, applyZoom]
  );

  return {
    viewFrames,
    clampViewStart,
    applyZoom,
    frameToX,
    xToFrame,
    xTicks,
    frameLines,
    handleViewportPointerDown,
    handleWheel,
  };
}
