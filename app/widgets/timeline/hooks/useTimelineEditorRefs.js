import { useRef } from 'react';

export function useTimelineEditorRefs(initialTrackId) {
  const selectedTrackIdRef = useRef(initialTrackId || '');
  const browseFileInputRef = useRef(null);
  const sendTimerRef = useRef(null);
  const lastSentRef = useRef('');
  const livePlayerRef = useRef(null);
  const liveSigRef = useRef('');
  const liveThrottleRef = useRef(0);
  const editorPlayerRef = useRef(null);
  const editorPlayheadRef = useRef(0);
  const editorPausedRef = useRef(false);
  const editorDirectionRef = useRef(1);
  const boundaryRef = useRef(null);
  const editorRootRef = useRef(null);
  const editorActiveRef = useRef(false);
  const addMenuRef = useRef(null);
  const svgRef = useRef(null);
  const timecodeRef = useRef(null);
  const timecodeDragRef = useRef(false);
  const viewportDragRef = useRef(null);
  const lassoRef = useRef({
    active: false,
    start: null,
    current: null,
  });
  const pointMapRef = useRef([]);
  const dragRef = useRef({
    active: false,
    trackId: null,
    idx: null,
    channelId: null,
    selection: [],
    ignoreMap: new Map(),
    forceGroup: false,
  });
  const clipDragRef = useRef({
    active: false,
    trackId: null,
    mode: null,
    startFrame: 0,
    startOffset: 0,
    startScale: 1,
    localMin: 0,
    localMax: 0,
    localDuration: 0,
    clipStartFrame: 0,
    clipEndFrame: 0,
  });

  return {
    selectedTrackIdRef,
    browseFileInputRef,
    sendTimerRef,
    lastSentRef,
    livePlayerRef,
    liveSigRef,
    liveThrottleRef,
    editorPlayerRef,
    editorPlayheadRef,
    editorPausedRef,
    editorDirectionRef,
    boundaryRef,
    editorRootRef,
    editorActiveRef,
    addMenuRef,
    svgRef,
    timecodeRef,
    timecodeDragRef,
    viewportDragRef,
    lassoRef,
    pointMapRef,
    dragRef,
    clipDragRef,
  };
}
