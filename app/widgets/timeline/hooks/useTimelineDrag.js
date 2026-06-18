// Drag and lasso logic extracted from timelineeditor.jsx
import { applyTimelineGroupDragToTrack } from '../timelineDragGroupHelpers.js';
import { resolveTimelineDragValueFromY } from '../timelineDragValueHelpers.js';

export function useTimelineDrag(options) {
  const {
    svgRef,
    lassoRef,
    pointMapRef,
    dragRef,
    clipDragRef,
    lassoBox,
    setLassoBox,
    trackById,
    trackEntries,
    selectedTrackId: _selectedTrackId,
    setSelectedTrackId,
    selectedChannelId,
    setSelectedChannelId,
    selectedKey: _selectedKey,
    setSelectedKey,
    multiSelection,
    setMultiSelection,
    playheadFrame: _playheadFrame,
    setPlayheadFrame,
    clampedMaxFrame,
    graphHeight,
    innerWidth: _innerWidth,
    clampFrame,
    xToFrame,
    GRAPH_WIDTH,
    GRAPH_LEFT,
    GRAPH_RIGHT,
    GRAPH_TOP,
    GRAPH_BOTTOM,
    MIN_SCALE,
    toLocalFrame,
    toGlobalFrame,
    getChannelBounds,
    getNumericRange,
    coerceNumericValue,
    shiftTrackKeyframes: _shiftTrackKeyframes,
    updateTrack,
    updateChannelKeyframe,
    updateKeyframe,
    showStatus,
    dedupeSelection,
    collectLinkedSiblings,
    buildIgnoreMap,
    sameKey,
    getTrackOffset: _getTrackOffset,
    getTrackScale: _getTrackScale,
    isFrameTaken
  } = options;

  const ensureRange = (range, meta, list) => {
    if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) return range;
    return getNumericRange(meta || { numericKind: 'float' }, list || []);
  };

  const getPointerPosition = (evt) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = rect.width ? GRAPH_WIDTH / rect.width : 1;
    const scaleY = rect.height ? graphHeight / rect.height : 1;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  };

  const registerPoint = (point) => {
    pointMapRef.current.push(point);
  };

  const resetDrags = () => {
    dragRef.current = {
      active: false,
      trackId: null,
      idx: null,
      channelId: null,
      selection: [],
      ignoreMap: new Map(),
      forceGroup: false
    };
    clipDragRef.current = {
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
      clipEndFrame: 0
    };
  };

  const finalizeLassoSelection = () => {
    // Lasso selection désactivée : on réinitialise simplement l'état
    // et on ne touche pas à la sélection courante.
    lassoRef.current = { active: false, start: null, current: null };
    setLassoBox(null);
  };

  const updateClipFromPointer = (evt) => {
    const drag = clipDragRef.current;
    if (!drag.active) return;
    const pos = getPointerPosition(evt);
    if (!pos) return;
    const frame = clampFrame(xToFrame(pos.x));
    const durationLimit = Math.max(0, Math.round(Number(clampedMaxFrame) || 0));
    const clampDelta = (delta) => {
      const minDelta = -drag.clipStartFrame;
      const maxDelta = durationLimit - drag.clipEndFrame;
      return Math.max(minDelta, Math.min(maxDelta, delta));
    };

    if (drag.localDuration <= 0) {
      if (drag.mode === 'move') {
        const delta = clampDelta(frame - drag.startFrame);
        updateTrack(drag.trackId, (track) => ({
          ...track,
          offset: Math.round(drag.startOffset + delta)
        }));
      }
      return;
    }

    if (drag.mode === 'move') {
      const delta = clampDelta(frame - drag.startFrame);
      updateTrack(drag.trackId, (track) => ({
        ...track,
        offset: Math.round(drag.startOffset + delta)
      }));
      return;
    }

    if (drag.mode === 'resize-end') {
      const endFrame = Math.max(drag.clipStartFrame, Math.min(frame, durationLimit));
      let nextScale = (endFrame - drag.clipStartFrame) / drag.localDuration;
      if (!Number.isFinite(nextScale)) return;
      if (nextScale < MIN_SCALE) nextScale = MIN_SCALE;
      if (Math.abs(nextScale - 1) < 0.001) nextScale = 1;
      const nextOffset = drag.clipStartFrame - drag.localMin * nextScale;
      updateTrack(drag.trackId, (track) => ({
        ...track,
        offset: Math.round(nextOffset),
        scale: nextScale
      }));
      return;
    }

    if (drag.mode === 'resize-start') {
      const fixedEnd = Math.min(drag.clipEndFrame, durationLimit);
      let startFrame = Math.max(0, Math.min(frame, fixedEnd));
      let nextScale = (fixedEnd - startFrame) / drag.localDuration;
      if (!Number.isFinite(nextScale)) return;
      if (nextScale < MIN_SCALE) {
        nextScale = MIN_SCALE;
        startFrame = fixedEnd - drag.localDuration * nextScale;
      }
      if (Math.abs(nextScale - 1) < 0.001) nextScale = 1;
      const nextOffset = startFrame - drag.localMin * nextScale;
      updateTrack(drag.trackId, (track) => ({
        ...track,
        offset: Math.round(nextOffset),
        scale: nextScale
      }));
    }
  };

  const handleClipPointerDown = (trackId, mode, evt) => {
    if (evt.ctrlKey || evt.metaKey) return;
    evt.preventDefault();
    evt.stopPropagation();
    const trackInfo = trackById.get(trackId);
    if (!trackInfo || !trackInfo.hasContainer) return;
    const pos = getPointerPosition(evt);
    if (!pos) return;
    const startFrame = clampFrame(xToFrame(pos.x));
    const clipStartFrame = toGlobalFrame(trackInfo, trackInfo.localMinFrame);
    const clipEndFrame = toGlobalFrame(trackInfo, trackInfo.localMaxFrame);
    clipDragRef.current = {
      active: true,
      trackId,
      mode,
      startFrame,
      startOffset: trackInfo.offset,
      startScale: trackInfo.scale,
      localMin: trackInfo.localMinFrame,
      localMax: trackInfo.localMaxFrame,
      localDuration: trackInfo.localDuration,
      clipStartFrame,
      clipEndFrame
    };
    dragRef.current = { active: false, trackId: null, idx: null, channelId: null };
    setSelectedTrackId(trackId);
    setSelectedKey(null);
  };

  const handlePointerDown = (trackId, idx, evt, channelId = null) => {
    // Ctrl/meta now toggles selection instead of blocking
    evt.preventDefault();
    evt.stopPropagation();
    const trackInfo = trackEntries.find((t) => t.track.widgetId === trackId);
    if (!trackInfo) return;
    const clickedKey = { trackId, channelId, idx };
    let selectionList = [];
    let togglingOff = false;
    if (evt.shiftKey) {
      const isAlreadySelected = multiSelection.some((item) => sameKey(item, clickedKey));
      // Shift : toggle si déjà sélectionné, sinon ajout
      selectionList = isAlreadySelected
        ? (() => {
            togglingOff = true;
            return multiSelection.filter((item) => !sameKey(item, clickedKey));
          })()
        : dedupeSelection([...multiSelection, clickedKey]);
    } else if (evt.ctrlKey || evt.metaKey) {
      const isAlreadySelected = multiSelection.some((item) => sameKey(item, clickedKey));
      selectionList = isAlreadySelected
        ? multiSelection.filter((item) => !sameKey(item, clickedKey))
        : [...multiSelection, clickedKey];
    } else {
      // clic simple : si on clique déjà sur un élément sélectionné, on garde le groupe pour le déplacement
      const isAlreadySelected = multiSelection.some((item) => sameKey(item, clickedKey));
      selectionList =
        isAlreadySelected && multiSelection.length ? [...multiSelection] : [clickedKey];
    }
    // Si on est en train de retirer avec Shift, ne ré-injecte pas les siblings (sinon on réajoute le point)
    if (!togglingOff) {
      const linked = collectLinkedSiblings(trackInfo, channelId, idx);
      selectionList = dedupeSelection(
        selectionList.concat(linked).filter((item) => item?.trackId === trackId)
      );
    }

    // Si plus rien à sélectionner (dernier point retiré avec Shift), on vide la sélection.
    if (!selectionList.length) {
      setSelectedTrackId(trackId);
      setSelectedChannelId('');
      setSelectedKey(null);
      setMultiSelection([]);
      resetDrags();
      return;
    }

    const selectionDetails = selectionList
      .map((item) => {
        const list =
          trackInfo.meta.kind === 'multi' && item.channelId
            ? trackInfo.channels?.[item.channelId]
            : trackInfo.keyframes;
        const entry = list?.[item.idx];
        if (!entry) return null;
        const startLocalFrame = Number(entry.frame);
        if (!Number.isFinite(startLocalFrame)) return null;
        const startGlobalFrame = toGlobalFrame(trackInfo, startLocalFrame);
        const valueNum = Number(entry.value);
        return {
          ...item,
          startLocalFrame,
          startGlobalFrame,
          startValue: entry.value,
          // si la valeur n'est pas numérique, on part de 0 pour permettre le suivi vertical
          startValueNum: Number.isFinite(valueNum) ? valueNum : 0
        };
      })
      .filter(Boolean);
    if (!selectionDetails.length) return;
    dragRef.current = {
      active: true,
      trackId,
      idx,
      channelId,
      selection: selectionDetails,
      ignoreMap: buildIgnoreMap(selectionDetails),
      forceGroup: selectionDetails.length > 1
    };
    clipDragRef.current = {
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
      clipEndFrame: 0
    };
    setSelectedTrackId(trackId);
    if (channelId) setSelectedChannelId(channelId);
    const stillHasClicked = selectionList.some((item) => sameKey(item, clickedKey));
    setSelectedKey(stillHasClicked ? clickedKey : selectionList[0] || null);
    setMultiSelection(selectionList);
    const list =
      trackInfo.meta.kind === 'multi' && channelId
        ? trackInfo.channels?.[channelId]
        : trackInfo.keyframes;
    const entry = list?.[idx];
    if (!entry) return;
    const frame = Number(entry.frame);
    if (Number.isFinite(frame)) {
      const globalFrame = toGlobalFrame(trackInfo, frame);
      setPlayheadFrame(Math.round(globalFrame));
    }
  };

  const handlePointerUp = () => {
    if (lassoRef.current.active || lassoBox) {
      finalizeLassoSelection();
    }
    resetDrags();
  };

  const updateFromPointer = (evt) => {
    if (lassoRef.current.active) {
      const pos = getPointerPosition(evt);
      if (!pos) return;
      lassoRef.current.current = pos;
      setLassoBox({
        x1: lassoRef.current.start.x,
        y1: lassoRef.current.start.y,
        x2: pos.x,
        y2: pos.y
      });
      return;
    }
    if (clipDragRef.current.active) {
      updateClipFromPointer(evt);
      return;
    }
    if (!dragRef.current.active) return;
    const pos = getPointerPosition(evt);
    if (!pos) return;
    const x = Math.min(
      GRAPH_WIDTH - GRAPH_RIGHT,
      Math.max(GRAPH_LEFT, pos.x)
    );
    const y = Math.min(
      graphHeight - GRAPH_BOTTOM,
      Math.max(GRAPH_TOP, pos.y)
    );

    const frame = clampFrame(xToFrame(x));

    const trackId = dragRef.current.trackId;
    const idx = dragRef.current.idx;
    const channelId = dragRef.current.channelId;
    const trackInfo = trackById.get(trackId);
    if (!trackInfo) return;
    const selection = dragRef.current.selection || [];
    const groupMove = selection.length >= 1;
    const ignoreMap = dragRef.current.ignoreMap || new Map();

    const localRaw = toLocalFrame(trackInfo, frame);
    if (!Number.isFinite(localRaw)) return;
    const localFrame = Math.max(0, localRaw);
    const targetFrame = Math.round(localFrame);

    if (groupMove) {
      const primaryKey =
        selection.find((item) =>
          sameKey(item, { trackId, channelId, idx })
        ) || selection[0];
      if (!primaryKey) return;
      const deltaFrame = localFrame - primaryKey.startLocalFrame;
      let deltaValue = null;

      const bounds = getChannelBounds(trackInfo, primaryKey.channelId);
      const range = ensureRange(
        trackInfo.channelRanges?.[primaryKey.channelId] ||
          trackInfo.sharedRange ||
          trackInfo.numericRange,
        { numericKind: 'float' },
        primaryKey.channelId
          ? trackInfo.channels?.[primaryKey.channelId] || []
          : trackInfo.keyframes
      );
      const coerced = resolveTimelineDragValueFromY({
        y,
        bounds,
        range,
        meta: { numericKind: 'float' },
        coerceNumericValue,
      });
      if (coerced !== null && Number.isFinite(primaryKey.startValueNum)) {
        deltaValue = coerced - primaryKey.startValueNum;
      }

      let blockedReason = '';
      updateTrack(trackId, (track) => {
        const result = applyTimelineGroupDragToTrack({
          track,
          trackInfo,
          selection,
          deltaFrame,
          deltaValue,
          ignoreMap,
          getNumericRange,
          coerceNumericValue,
        });
        blockedReason = result.blockedReason;
        return result.track;
      });

      if (blockedReason) {
        showStatus(blockedReason);
      }
      return;
    }

    if (trackInfo.meta.kind === 'multi') {
      const effectiveChannelId =
        channelId ||
        selectedChannelId ||
        trackInfo.meta.channels?.[0]?.id ||
        '';
      if (!effectiveChannelId) return;
      const list = trackInfo.channels?.[effectiveChannelId] || [];
      const bounds = getChannelBounds(trackInfo, effectiveChannelId);
      if (!bounds) return;
      const range = ensureRange(
        trackInfo.channelRanges?.[effectiveChannelId] || trackInfo.sharedRange,
        { numericKind: 'float' },
        list
      );
      const coerced = resolveTimelineDragValueFromY({
        y,
        bounds,
        range,
        meta: { numericKind: 'float' },
        coerceNumericValue,
      });
      if (coerced === null) {
        showStatus('Valeur hors limite.');
        return;
      }
      if (isFrameTaken(list, targetFrame, idx)) {
        showStatus('Frame deja utilisee.');
        return;
      }
      updateChannelKeyframe(trackId, effectiveChannelId, idx, {
        frame: targetFrame,
        value: coerced
      });
      return;
    }

    if (trackInfo.meta.kind === 'number') {
      const bounds = trackInfo.contentBounds || trackInfo.bounds;
      const range = ensureRange(
        trackInfo.numericRange,
        trackInfo.meta,
        trackInfo.keyframes
      );
      const coerced = resolveTimelineDragValueFromY({
        y,
        bounds,
        range,
        meta: trackInfo.meta,
        coerceNumericValue,
      });
      if (coerced === null) {
        showStatus('Valeur hors limite.');
        return;
      }
      if (isFrameTaken(trackInfo.keyframes, targetFrame, idx)) {
        showStatus('Frame deja utilisee.');
        return;
      }
      updateKeyframe(trackId, idx, { frame: targetFrame, value: coerced });
      return;
    }

    if (isFrameTaken(trackInfo.keyframes, targetFrame, idx)) {
      showStatus('Frame deja utilisee.');
      return;
    }
    updateKeyframe(trackId, idx, { frame: targetFrame });
  };

  const handleSvgPointerDown = (_evt) => {
    // Lasso entièrement désactivé : rien à faire sur ctrl/meta + drag
    return;
  };

  return {
    registerPoint,
    handlePointerDown,
    handlePointerUp,
    handleSvgPointerDown,
    updateFromPointer,
    handleClipPointerDown
  };
}
