import { useCallback } from 'react';

export function useTimelineEditorCueAction({
  editorPlayheadRef,
  editorPlayerRef,
  setPlayheadFrame,
  sendLiveFrame,
}) {
  return useCallback(() => {
    editorPlayheadRef.current = 0;
    editorPlayerRef.current?.seek?.(0);
    setPlayheadFrame(0);
    sendLiveFrame(0, { force: true });
  }, [editorPlayheadRef, editorPlayerRef, setPlayheadFrame, sendLiveFrame]);
}
