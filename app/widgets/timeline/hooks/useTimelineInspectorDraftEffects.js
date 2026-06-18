import { useEffect } from 'react';
import { framesToTimecode } from '../formatters';
import { formatInputNumber } from '../timelinewidget-shared.js';

function getDisplayFrame(track, localFrame, useTimecodeView, fps, toGlobalFrame) {
  const frameLocal = Number(localFrame);
  const frameGlobal =
    Number.isFinite(frameLocal) && track ? toGlobalFrame(track, frameLocal) : null;

  if (!Number.isFinite(frameGlobal)) return '';
  const rounded = Math.round(frameGlobal);
  return String(useTimecodeView ? framesToTimecode(rounded, fps) : rounded);
}

function getKeyframeValueDraft(meta, keyframe) {
  if (meta?.kind === 'number') {
    const value = Number(keyframe?.value);
    return Number.isFinite(value) ? formatInputNumber(value, meta.numericKind) : '';
  }

  if (meta?.kind === 'multi') {
    const value = Number(keyframe?.value);
    return Number.isFinite(value) ? formatInputNumber(value, 'float') : '';
  }

  if (meta?.kind === 'bool') {
    return keyframe?.value ? '1' : '0';
  }

  return String(keyframe?.value ?? '');
}

export function useTimelineInspectorDraftEffects({
  selectedTrack,
  selectedKeyframe,
  selectedChannelId,
  selectedBundle,
  useTimecodeView,
  fps,
  toGlobalFrame,
  setKeyframeFrameDraft,
  setKeyframeValueDraft,
  setKeyframeInTanDraft,
  setKeyframeOutTanDraft,
  setKeyframeInSpanDraft,
  setKeyframeOutSpanDraft,
  setBundleFrameDraft,
  setBundleValueDrafts,
}) {
  useEffect(() => {
    if (!selectedTrack || !selectedKeyframe) {
      setKeyframeFrameDraft('');
      setKeyframeValueDraft('');
      setKeyframeInTanDraft('');
      setKeyframeOutTanDraft('');
      setKeyframeInSpanDraft('');
      setKeyframeOutSpanDraft('');
      return;
    }

    setKeyframeFrameDraft(
      getDisplayFrame(selectedTrack, selectedKeyframe?.frame, useTimecodeView, fps, toGlobalFrame)
    );
    setKeyframeInTanDraft(
      Number.isFinite(selectedKeyframe?.inTangent)
        ? String(Math.round(selectedKeyframe.inTangent * 100))
        : '0'
    );
    setKeyframeOutTanDraft(
      Number.isFinite(selectedKeyframe?.outTangent)
        ? String(Math.round(-selectedKeyframe.outTangent * 100))
        : '0'
    );
    setKeyframeInSpanDraft(
      Number.isFinite(selectedKeyframe?.inSpan)
        ? String(Math.round(selectedKeyframe.inSpan / 10))
        : ''
    );
    setKeyframeOutSpanDraft(
      Number.isFinite(selectedKeyframe?.outSpan)
        ? String(Math.round(selectedKeyframe.outSpan / 10))
        : ''
    );
    setKeyframeValueDraft(getKeyframeValueDraft(selectedTrack.meta, selectedKeyframe));
  }, [
    fps,
    selectedChannelId,
    selectedKeyframe,
    selectedTrack,
    setKeyframeFrameDraft,
    setKeyframeInSpanDraft,
    setKeyframeInTanDraft,
    setKeyframeOutSpanDraft,
    setKeyframeOutTanDraft,
    setKeyframeValueDraft,
    toGlobalFrame,
    useTimecodeView,
  ]);

  useEffect(() => {
    if (!selectedBundle) {
      setBundleFrameDraft('');
      setBundleValueDrafts({});
      return;
    }

    setBundleFrameDraft(
      getDisplayFrame(selectedTrack, selectedBundle.frame, useTimecodeView, fps, toGlobalFrame)
    );

    const next = {};
    selectedBundle.items.forEach((item) => {
      const channelId = item.channel?.id;
      if (!channelId) return;
      if (!item.keyframe) {
        next[channelId] = '';
        return;
      }

      const valNum = Number(item.keyframe.value);
      next[channelId] = Number.isFinite(valNum)
        ? formatInputNumber(valNum, 'float')
        : String(item.keyframe.value ?? '');
    });
    setBundleValueDrafts(next);
  }, [
    fps,
    selectedBundle,
    selectedTrack,
    setBundleFrameDraft,
    setBundleValueDrafts,
    toGlobalFrame,
    useTimecodeView,
  ]);
}
