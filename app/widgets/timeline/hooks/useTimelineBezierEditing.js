import { useCallback } from 'react';

export function useTimelineBezierEditing({
  selectedTrack,
  selectedKeyframe,
  selectedKey,
  selectedChannelId,
  updateChannelKeyframe,
  updateKeyframe,
  setKeyframeInTanDraft,
  setKeyframeOutTanDraft,
  setKeyframeInSpanDraft,
  setKeyframeOutSpanDraft,
}) {
  const handleBezierTangentChange = useCallback(
    (dir, raw) => {
      if (!selectedTrack || !selectedKeyframe) return;

      const val = Number(String(raw ?? '').trim().replace(/,/g, '.'));
      if (!Number.isFinite(val)) return;

      const intVal = Math.round(val);
      const stored = (dir === 'out' ? -intVal : intVal) / 100;

      if (selectedTrack.meta.kind === 'multi') {
        const channelId = selectedKey?.channelId || selectedChannelId;
        if (!channelId) return;
        updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
          [dir === 'in' ? 'inTangent' : 'outTangent']: stored,
        });
      } else {
        updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
          [dir === 'in' ? 'inTangent' : 'outTangent']: stored,
        });
      }

      if (dir === 'in') setKeyframeInTanDraft(String(intVal));
      else setKeyframeOutTanDraft(String(intVal));
    },
    [
      selectedTrack,
      selectedKeyframe,
      selectedKey,
      selectedChannelId,
      updateChannelKeyframe,
      updateKeyframe,
      setKeyframeInTanDraft,
      setKeyframeOutTanDraft,
    ]
  );

  const handleBezierSpanChange = useCallback(
    (dir, raw) => {
      if (!selectedTrack || !selectedKeyframe) return;

      const val = Number(String(raw ?? '').trim().replace(/,/g, '.'));
      if (!Number.isFinite(val)) return;

      const intVal = Math.max(0, Math.round(val));
      const stored = intVal * 10; // plus sensible en interne

      if (selectedTrack.meta.kind === 'multi') {
        const channelId = selectedKey?.channelId || selectedChannelId;
        if (!channelId) return;
        updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
          [dir === 'in' ? 'inSpan' : 'outSpan']: stored,
        });
      } else {
        updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
          [dir === 'in' ? 'inSpan' : 'outSpan']: stored,
        });
      }

      if (dir === 'in') setKeyframeInSpanDraft(String(intVal));
      else setKeyframeOutSpanDraft(String(intVal));
    },
    [
      selectedTrack,
      selectedKeyframe,
      selectedKey,
      selectedChannelId,
      updateChannelKeyframe,
      updateKeyframe,
      setKeyframeInSpanDraft,
      setKeyframeOutSpanDraft,
    ]
  );

  return {
    handleBezierTangentChange,
    handleBezierSpanChange,
  };
}
