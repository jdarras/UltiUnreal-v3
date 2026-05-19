import { useCallback, useEffect } from 'react';
import {
  createTimelinePlayer,
  normalizeTimeline,
  resolveTimelineFps,
} from '../../../utils/timeline';

export function useTimelineLivePreview({
  hosts,
  common,
  timelineDraft,
  playheadFrame,
  livePlayerRef,
  liveSigRef,
  liveThrottleRef,
}) {
  const getLiveSignature = useCallback(() => {
    const hostSig = (hosts || [])
      .map((h) => h && h.ip)
      .filter(Boolean)
      .join('|');
    return `${hostSig}::${JSON.stringify(timelineDraft)}`;
  }, [hosts, timelineDraft]);

  const ensureLivePlayer = useCallback(
    (frame) => {
      const sig = getLiveSignature();
      if (livePlayerRef.current && liveSigRef.current === sig) return;
      livePlayerRef.current?.stop?.();
      try {
        const timeline = normalizeTimeline(timelineDraft);
        const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
        if (!innerWidgets.length) {
          livePlayerRef.current = null;
          liveSigRef.current = '';
          return;
        }
        const { fps: liveFps } = resolveTimelineFps(hosts);
        livePlayerRef.current = createTimelinePlayer({
          timeline,
          widgets: innerWidgets,
          hosts,
          common,
          fps: liveFps,
          startFrame: Number.isFinite(frame) ? frame : 0,
          onError: () => {},
        });
        liveSigRef.current = sig;
      } catch {
        livePlayerRef.current = null;
        liveSigRef.current = '';
      }
    },
    [timelineDraft, hosts, common, getLiveSignature, livePlayerRef, liveSigRef]
  );

  const sendLiveFrame = useCallback(
    (frame, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - liveThrottleRef.current < 80) return; // ~12.5 fps
      liveThrottleRef.current = now;
      if (!hosts || !hosts.length || !common) return;
      ensureLivePlayer(frame);
      if (!livePlayerRef.current) return;
      try {
        livePlayerRef.current.seek?.(Math.max(0, Math.round(frame)), {
          triggerEvents: true,
          eventMode: 'state',
          forceEvents: force,
        });
      } catch {
        // ignore live preview errors
      }
    },
    [hosts, common, ensureLivePlayer, liveThrottleRef, livePlayerRef]
  );

  useEffect(() => {
    sendLiveFrame(playheadFrame);
  }, [playheadFrame, sendLiveFrame]);

  return {
    sendLiveFrame,
  };
}
