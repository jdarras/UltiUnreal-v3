import { useCallback } from 'react';
import { createTimelineWidget } from '../timelinewidget-config.js';

export function useTimelineDraft({
  setTimelineDraft,
  selectedTrackId,
  setSelectedTrackId,
  setSelectedKey,
  setShowAddMenu,
  hosts,
  t
}) {
  const updateTrack = useCallback(
    (trackId, updater) => {
      setTimelineDraft((prev) => {
        const tracks = (prev.tracks || []).map((track) => {
          if (track.widgetId !== trackId) return track;
          return updater(track);
        });
        return { ...prev, tracks };
      });
    },
    [setTimelineDraft]
  );

  const updateTimelineWidget = useCallback(
    (widgetId, updater) => {
      setTimelineDraft((prev) => {
        const widgets = (prev.widgets || []).map((item) => {
          if (item.id !== widgetId) return item;
          return updater(item);
        });
        return { ...prev, widgets };
      });
    },
    [setTimelineDraft]
  );

  const updateSelectedWidget = useCallback(
    (patch) => {
      if (!selectedTrackId) return;
      updateTimelineWidget(selectedTrackId, (item) => ({ ...item, ...patch }));
    },
    [selectedTrackId, updateTimelineWidget]
  );

  const updateSelectedBinding = useCallback(
    (patch) => {
      if (!selectedTrackId) return;
      updateTimelineWidget(selectedTrackId, (item) => ({
        ...item,
        binding: { ...(item.binding || {}), ...patch }
      }));
    },
    [selectedTrackId, updateTimelineWidget]
  );

  const handleAddTrackType = useCallback(
    (type) => {
      const nextType = String(type || '').trim();
      if (!nextType) return;
      const nextWidget = createTimelineWidget(nextType, hosts, t);
      const newTrack = {
        widgetId: nextWidget.id,
        keyframes: [],
        offset: 0,
        scale: 1
      };
      setTimelineDraft((prev) => {
        const existing = prev.widgets || [];
        const baseLabel = String(nextWidget.label || nextType).trim() || nextType;
        let candidate = baseLabel;
        let n = 2;
        const lower = (s) => s.trim().toLowerCase();
        const hasLabel = (lbl) =>
          existing.some((w) => lower(String(w.label || '')) === lower(lbl));
        while (hasLabel(candidate)) {
          candidate = `${baseLabel} (${n++})`;
        }
        const widgetWithLabel = { ...nextWidget, label: candidate };
        return {
          ...prev,
          widgets: [...existing, widgetWithLabel],
          tracks: [...(prev.tracks || []), newTrack]
        };
      });
      setSelectedTrackId(nextWidget.id);
      setSelectedKey(null);
      setShowAddMenu(false);
    },
    [hosts, t, setTimelineDraft, setSelectedTrackId, setSelectedKey, setShowAddMenu]
  );

  const removeTrackById = useCallback(
    (trackId) => {
      if (!trackId) return;
      setTimelineDraft((prev) => ({
        ...prev,
        widgets: (prev.widgets || []).filter((w) => w.id !== trackId),
        tracks: (prev.tracks || []).filter((t) => t.widgetId !== trackId)
      }));
      if (selectedTrackId === trackId) {
        setSelectedKey(null);
        setSelectedTrackId('');
      }
    },
    [setTimelineDraft, selectedTrackId, setSelectedKey, setSelectedTrackId]
  );

  const moveTrack = useCallback(
    (trackId, targetIndex) => {
      if (!trackId || targetIndex == null) return;
      setTimelineDraft((prev) => {
        const tracks = [...(prev.tracks || [])];
        const fromIdx = tracks.findIndex((t) => t.widgetId === trackId);
        if (fromIdx < 0) return prev;
        const toIdx = Math.max(0, Math.min(tracks.length - 1, targetIndex));
        if (fromIdx === toIdx) return prev;
        const [track] = tracks.splice(fromIdx, 1);
        tracks.splice(toIdx, 0, track);

        const widgets = [...(prev.widgets || [])];
        const wFrom = widgets.findIndex((w) => w.id === trackId);
        if (wFrom >= 0) {
          const [widget] = widgets.splice(wFrom, 1);
          widgets.splice(toIdx, 0, widget);
        }

        return { ...prev, tracks, widgets };
      });
    },
    [setTimelineDraft]
  );

  return {
    updateTrack,
    updateTimelineWidget,
    updateSelectedWidget,
    updateSelectedBinding,
    handleAddTrackType,
    removeTrackById,
    moveTrack
  };
}
