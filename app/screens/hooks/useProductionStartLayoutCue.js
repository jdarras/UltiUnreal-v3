import { useCallback, useEffect } from "react";

function useProductionStartLayoutCue({
  activeLayout = null,
  editMode = false,
  layoutReady = false,
  widgets = [],
  hosts = [],
  commonForProject = null,
  wrcReady = false,
  target = { ip: "", port: 0, preset: "" },
  aliveRef = null,
  lastStartCueRef = null,
  wrcGetPreset = async () => ({ ok: false }),
  setWrcReady = null,
  loadTimelineUtils = null,
} = {}) {
  const cueStartLayout = useCallback(async () => {
    if (!activeLayout?.isStart || editMode || !layoutReady) return;

    const timelines = widgets.filter((widget) => widget.type === "timeline");
    if (!timelines.length) return;

    const sig = JSON.stringify(
      timelines.map((widget) => ({
        id: widget.id,
        timeline: widget.ui?.timeline,
      }))
    );
    if (
      lastStartCueRef?.current?.layoutId === activeLayout.id &&
      lastStartCueRef?.current?.sig === sig
    ) {
      return;
    }

    try {
      const timelineUtils = await loadTimelineUtils?.();
      const resolveTimelineFps = timelineUtils?.resolveTimelineFps;
      const normalizeTimeline = timelineUtils?.normalizeTimeline;
      const createTimelinePlayer = timelineUtils?.createTimelinePlayer;
      if (
        typeof resolveTimelineFps !== "function" ||
        typeof normalizeTimeline !== "function" ||
        typeof createTimelinePlayer !== "function"
      ) {
        return;
      }

      const { fps } = resolveTimelineFps(hosts);

      timelines.forEach((timelineWidget) => {
        const timeline = normalizeTimeline(timelineWidget.ui?.timeline);
        const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
        if (!innerWidgets.length) return;
        try {
          const player = createTimelinePlayer({
            timeline,
            widgets: innerWidgets,
            hosts,
            common: commonForProject,
            fps,
            startFrame: 0,
            onError: () => {},
          });
          player.seek(0, { triggerEvents: true });
        } catch {
          // ignore individual cue failures
        }
      });
    } catch {
      // ignore timeline preload errors
    }

    if (lastStartCueRef) {
      lastStartCueRef.current = { layoutId: activeLayout.id, sig };
    }
  }, [
    activeLayout?.id,
    activeLayout?.isStart,
    editMode,
    layoutReady,
    widgets,
    hosts,
    commonForProject,
    lastStartCueRef,
    loadTimelineUtils,
  ]);

  useEffect(() => {
    if (!activeLayout?.isStart) return;
    if (editMode) return;
    if (!layoutReady) return;

    let cancelled = false;

    const ensureWrcThenCue = async (attempt = 0) => {
      if (cancelled || (aliveRef && !aliveRef.current)) return;

      // Si on sait déjà que le WRC est prêt, on cue tout de suite.
      if (wrcReady) {
        cueStartLayout();
        return;
      }

      try {
        const res = await wrcGetPreset(target.ip, target.port, target.preset);
        if (cancelled || (aliveRef && !aliveRef.current)) return;
        if (res?.ok) {
          setWrcReady?.(true);
          cueStartLayout();
          return;
        }
      } catch {
        // retry below
      }

      if (attempt < 5) {
        setTimeout(() => ensureWrcThenCue(attempt + 1), 800);
      }
    };

    ensureWrcThenCue();

    return () => {
      cancelled = true;
    };
  }, [
    activeLayout?.id,
    activeLayout?.isStart,
    editMode,
    layoutReady,
    wrcReady,
    cueStartLayout,
    target?.ip,
    target?.port,
    target?.preset,
    aliveRef,
    wrcGetPreset,
    setWrcReady,
  ]);

  return {
    cueStartLayout,
  };
}

export { useProductionStartLayoutCue };
export default useProductionStartLayoutCue;
