import { useCallback } from 'react';

export function useKeyframeNavigation({
  playheadFrame,
  toLocalFrame,
  toGlobalFrame,
  setPlayheadFrame,
  setSelectedChannelId,
  setSelectedTrackId,
  setSelectedKey,
  showStatus
}) {
  const getKeyframeList = useCallback((entry, channelId = null) => {
    if (!entry) return [];
    if (entry.meta.kind === 'multi' && channelId) {
      return entry.channels?.[channelId] || [];
    }
    return entry.keyframes || [];
  }, []);

  const jumpToKeyframeFor = useCallback(
    (entry, direction, channelId = null) => {
      const list = getKeyframeList(entry, channelId);
      if (!list.length) {
        showStatus('Aucun keyframe.');
        return;
      }
      const localFrameRaw = toLocalFrame(entry, playheadFrame);
      const localFrame = Number.isFinite(localFrameRaw) ? localFrameRaw : 0;
      const sorted = list
        .map((kf, idx) => ({ frame: Number(kf?.frame), idx }))
        .filter((item) => Number.isFinite(item.frame))
        .sort((a, b) => a.frame - b.frame);
      if (!sorted.length) return;
      let target = null;
      if (direction < 0) {
        for (let i = sorted.length - 1; i >= 0; i -= 1) {
          if (sorted[i].frame < localFrame) {
            target = sorted[i];
            break;
          }
        }
      } else {
        for (let i = 0; i < sorted.length; i += 1) {
          if (sorted[i].frame > localFrame) {
            target = sorted[i];
            break;
          }
        }
      }
      if (!target) return;
      const globalFrame = toGlobalFrame(entry, target.frame);
      setPlayheadFrame(Math.round(globalFrame));
      if (channelId) setSelectedChannelId(channelId);
      setSelectedTrackId(entry.track.widgetId);
      setSelectedKey({
        trackId: entry.track.widgetId,
        channelId,
        idx: target.idx
      });
    },
    [getKeyframeList, playheadFrame, setPlayheadFrame, setSelectedChannelId, setSelectedKey, setSelectedTrackId, showStatus, toGlobalFrame, toLocalFrame]
  );

  const handleKeyControlPointerDown = useCallback((evt, handler) => {
    evt.preventDefault();
    evt.stopPropagation();
    handler();
  }, []);

  return {
    getKeyframeList,
    jumpToKeyframeFor,
    handleKeyControlPointerDown
  };
}
