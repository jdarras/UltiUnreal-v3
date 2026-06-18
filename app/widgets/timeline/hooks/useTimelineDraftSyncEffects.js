import { useEffect } from 'react';
import { normalizeTimeline } from '../../../utils/timeline';
import { syncTimelineWidgetTargets } from '../timelinewidget-config';

export function useTimelineDraftSyncEffects({
  widget,
  hosts,
  timelineDraft,
  selectedTrackId,
  setTimelineDraft,
  setSelectedTrackId,
  setSelectedKey,
  updateWidget,
  selectedTrackIdRef,
  sendTimerRef,
  lastSentRef,
  livePlayerRef,
  editorPlayerRef,
}) {
  useEffect(() => {
    const next = normalizeTimeline(widget.ui?.timeline);
    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;

    setTimelineDraft(next);
    const preferred = selectedTrackIdRef.current;
    const exists = next.tracks?.some((track) => track.widgetId === preferred);
    const fallback = next.tracks?.[0]?.widgetId || '';
    setSelectedTrackId(exists ? preferred : fallback);
    if (!exists) setSelectedKey(null);
    lastSentRef.current = serialized;
  }, [
    lastSentRef,
    selectedTrackIdRef,
    setSelectedKey,
    setSelectedTrackId,
    setTimelineDraft,
    widget.id,
    widget.ui?.timeline,
  ]);

  useEffect(() => {
    selectedTrackIdRef.current = selectedTrackId;
  }, [selectedTrackId, selectedTrackIdRef]);

  useEffect(() => {
    if (!hosts || hosts.length === 0) return;
    setTimelineDraft((prev) => {
      const widgets = prev.widgets || [];
      let changed = false;
      const nextWidgets = widgets.map((item) => {
        const synced = syncTimelineWidgetTargets(item, hosts);
        const prevTargets = item?.targets || {};
        const nextTargets = synced?.targets || {};
        const nextKeys = Object.keys(nextTargets);
        if (!changed) {
          if (nextKeys.length !== Object.keys(prevTargets).length) {
            changed = true;
          } else {
            changed = nextKeys.some((key) => !(key in prevTargets));
          }
        }
        return synced;
      });
      return changed ? { ...prev, widgets: nextWidgets } : prev;
    });
  }, [hosts, setTimelineDraft]);

  useEffect(() => {
    if (!updateWidget || !widget?.id) return;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);

    const serialized = JSON.stringify(timelineDraft);
    if (serialized === lastSentRef.current) return;

    sendTimerRef.current = setTimeout(() => {
      updateWidget(widget.id, {
        ui: {
          ...(widget.ui || {}),
          timeline: timelineDraft,
        },
      });
      lastSentRef.current = serialized;
    }, 200);

    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, [lastSentRef, sendTimerRef, timelineDraft, updateWidget, widget.id, widget.ui]);

  useEffect(() => {
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      if (livePlayerRef.current) {
        livePlayerRef.current.stop?.();
        livePlayerRef.current = null;
      }
      editorPlayerRef.current?.stop?.();
    };
  }, [editorPlayerRef, livePlayerRef, sendTimerRef]);
}
