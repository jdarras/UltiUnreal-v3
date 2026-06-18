import { useCallback } from 'react';

export function usePlayheadDrag({
  timecodeRef,
  timecodeDragRef,
  clampedMaxFrame,
  fps,
  useTimecodeView,
  framesToTimecode,
  setPlayheadFrame,
  setTimecodeInput
}) {
  const updatePlayheadFromPointer = useCallback(
    (evt) => {
      const rect = timecodeRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width || 1;
      const x = Math.min(width, Math.max(0, evt.clientX - rect.left));
      const ratio = x / width;
      const frame = Math.round(ratio * clampedMaxFrame);
      setPlayheadFrame(frame);
      setTimecodeInput(
        useTimecodeView ? framesToTimecode(Math.round(frame), fps) : String(frame)
      );
    },
    [clampedMaxFrame, fps, framesToTimecode, setPlayheadFrame, setTimecodeInput, timecodeRef, useTimecodeView]
  );

  const handleTimecodeDown = useCallback(
    (evt, dragRef) => {
      evt.preventDefault();
      dragRef.current = true;
      if (evt.currentTarget?.setPointerCapture) {
        evt.currentTarget.setPointerCapture(evt.pointerId);
      }
      updatePlayheadFromPointer(evt);
    },
    [updatePlayheadFromPointer]
  );

  const handleTimecodeMove = useCallback(
    (evt, dragRef) => {
      if (!dragRef.current) return;
      updatePlayheadFromPointer(evt);
    },
    [updatePlayheadFromPointer]
  );

  const handleTimecodeUp = useCallback((evt, dragRef) => {
    if (evt.currentTarget?.releasePointerCapture) {
      evt.currentTarget.releasePointerCapture(evt.pointerId);
    }
    dragRef.current = false;
  }, []);

  const onTimecodeDown = useCallback(
    (evt) => handleTimecodeDown(evt, timecodeDragRef),
    [handleTimecodeDown, timecodeDragRef]
  );

  const onTimecodeMove = useCallback(
    (evt) => handleTimecodeMove(evt, timecodeDragRef),
    [handleTimecodeMove, timecodeDragRef]
  );

  const onTimecodeUp = useCallback(
    (evt) => handleTimecodeUp(evt, timecodeDragRef),
    [handleTimecodeUp, timecodeDragRef]
  );

  return {
    onTimecodeDown,
    onTimecodeMove,
    onTimecodeUp,
  };
}
