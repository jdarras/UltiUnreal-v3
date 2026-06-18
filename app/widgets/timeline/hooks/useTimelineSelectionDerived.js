import { useMemo } from 'react';
import { isTrackLinked } from '../timelineEntryHelpers';

const KEYFRAME_LOCKED_TYPES = new Set(['button', 'toggle', 'enum', 'dropdown', 'browse']);

export function useTimelineSelectionDerived({
  trackEntries,
  widgets,
  selectedTrackId,
  selectedKey,
  selectedChannelId,
}) {
  const selectedTrack = useMemo(
    () => trackEntries.find((t) => t.track.widgetId === selectedTrackId) || null,
    [selectedTrackId, trackEntries]
  );
  const selectedMeta = selectedTrack?.meta || null;

  const selectedKeyframe = useMemo(() => {
    if (!selectedTrack || selectedKey?.trackId !== selectedTrackId) return null;
    if (selectedTrack.meta.kind === 'multi') {
      const channelId = selectedKey?.channelId || selectedChannelId;
      const list = selectedTrack.channels?.[channelId] || [];
      return list[selectedKey?.idx] || null;
    }
    return selectedTrack.keyframes?.[selectedKey?.idx] || null;
  }, [selectedChannelId, selectedKey, selectedTrack, selectedTrackId]);

  const selectedWidget = useMemo(() => {
    return (widgets || []).find((item) => item.id === selectedTrackId) || null;
  }, [selectedTrackId, widgets]);

  const selectedKeyframeArgs = useMemo(() => {
    const args =
      selectedKeyframe && typeof selectedKeyframe.args === 'object'
        ? selectedKeyframe.args
        : null;
    if (args) return args;
    const fallback =
      selectedWidget?.binding && typeof selectedWidget.binding.argValues === 'object'
        ? selectedWidget.binding.argValues
        : null;
    return fallback || {};
  }, [selectedKeyframe, selectedWidget]);

  const selectedWidgetType = String(selectedWidget?.type || '').toLowerCase();
  const lockKeyframeTypes =
    !!selectedWidget &&
    (
      KEYFRAME_LOCKED_TYPES.has(selectedWidgetType) ||
      (selectedWidgetType === 'text' && selectedMeta?.kind !== 'number')
    );

  const isLinkedSelected = isTrackLinked(selectedTrack);
  const selectedBundle = useMemo(() => {
    if (!isLinkedSelected || !selectedKeyframe) return null;
    const frame = Number(selectedKeyframe.frame);
    if (!Number.isFinite(frame)) return null;
    const items = (selectedTrack.meta.channels || []).map((channel) => {
      const list = selectedTrack.channels?.[channel.id] || [];
      const idx = list.findIndex((kf) => Number(kf?.frame) === frame);
      return {
        channel,
        idx,
        keyframe: idx >= 0 ? list[idx] : null,
      };
    });
    return { frame, items };
  }, [isLinkedSelected, selectedKeyframe, selectedTrack]);

  return {
    selectedTrack,
    selectedMeta,
    selectedKeyframe,
    selectedWidget,
    selectedKeyframeArgs,
    lockKeyframeTypes,
    isLinkedSelected,
    selectedBundle,
  };
}
