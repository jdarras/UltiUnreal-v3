import { useCallback, useEffect, useMemo } from "react";

function useProductionWidgetListOps({
  widgets = [],
  hosts = [],
  setWidgets = null,
} = {}) {
  const onDragStart = useCallback((e, id) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const onDrop = useCallback(
    (e, overId) => {
      const dragId = e.dataTransfer.getData("text/plain");
      if (!dragId || dragId === overId) return;

      const from = widgets.findIndex((widget) => widget.id === dragId);
      const to = widgets.findIndex((widget) => widget.id === overId);
      if (from < 0 || to < 0) return;

      const next = widgets.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setWidgets?.(next);
    },
    [widgets, setWidgets]
  );

  const hostsSignature = useMemo(() => JSON.stringify(hosts), [hosts]);

  useEffect(() => {
    setWidgets?.((prev) =>
      prev.map((widget) => {
        const nextTargets = { ...(widget.targets || {}) };
        (hosts || []).forEach((machine) => {
          if (machine?.ip && !(machine.ip in nextTargets)) {
            nextTargets[machine.ip] = false;
          }
        });
        Object.keys(nextTargets).forEach((ip) => {
          if (!(hosts || []).some((machine) => machine?.ip === ip)) {
            delete nextTargets[ip];
          }
        });
        return { ...widget, targets: nextTargets };
      })
    );
  }, [hostsSignature, setWidgets]);

  return {
    onDragStart,
    onDrop,
  };
}

export { useProductionWidgetListOps };
