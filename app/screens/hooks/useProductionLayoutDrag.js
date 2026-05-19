import { useCallback } from "react";

function useProductionLayoutDrag({
  editMode = false,
  dragState = null,
  setDragState = null,
  setWidgets = null,
  addWidget = null,
  deriveLayoutGeometry = () => ({ layoutWidgets: [], zoneDisplay: {} }),
  layoutMinHeight = 0,
  widgetSizes = {},
  zoneHeaderHeights = {},
  snap = (value) => value,
  zoneHeaderHeightDefault = 0,
  zonePadding = 0,
} = {}) {
  const handleLayoutMouseMove = useCallback(
    (e) => {
      if (!dragState?.active || !dragState?.widgetId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;

      setWidgets?.((prev) => {
        const { zoneDisplay: zdMap } = deriveLayoutGeometry(
          prev,
          layoutMinHeight,
          widgetSizes,
          zoneHeaderHeights
        );

        return prev.map((widget) => {
          if (widget.id !== dragState.widgetId) return widget;

          const width = dragState.widgetWidth || widget.w || 260;
          const height = dragState.widgetHeight || widget.h || 160;

          let x = pointerX - dragState.offsetX;
          let y = pointerY - dragState.offsetY;

          const maxX = rect.width - width;
          const maxY = rect.height - height;

          x = Math.max(0, Math.min(x, maxX));
          y = Math.max(0, Math.min(y, maxY));

          // Drag d'une zone -> coordonnees globales.
          if (widget.type === "zone") {
            return {
              ...widget,
              x: snap(x),
              y: snap(y),
            };
          }

          // Widget enfant d'une zone: coords relatives.
          if (widget.zoneId && zdMap[widget.zoneId]) {
            const zd = zdMap[widget.zoneId];
            const headerHeight = zd.headerHeight ?? zoneHeaderHeightDefault;
            const bodyTop = zd.y + headerHeight;

            const localX = snap(x - (zd.x + zonePadding));
            const localY = snap(y - (bodyTop + zonePadding));

            return {
              ...widget,
              x: Math.max(0, localX),
              y: Math.max(0, localY),
            };
          }

          // Widget hors zone: coords globales.
          return {
            ...widget,
            zoneId: null,
            x: snap(x),
            y: snap(y),
          };
        });
      });
    },
    [
      dragState,
      setWidgets,
      deriveLayoutGeometry,
      layoutMinHeight,
      widgetSizes,
      zoneHeaderHeights,
      snap,
      zoneHeaderHeightDefault,
      zonePadding,
    ]
  );

  const handleLayoutDrop = useCallback(
    (e) => {
      if (!editMode) return;

      const newType = e.dataTransfer.getData("text/uu-widget-type");
      if (!newType) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Creation d'un widget du type demande a la position du drop.
      addWidget?.(newType, { x, y });
    },
    [editMode, addWidget]
  );

  const finalizeDrag = useCallback(() => {
    if (!dragState?.active || !dragState?.widgetId) return;

    setWidgets?.((prev) => {
      const { layoutWidgets: lw, zoneDisplay: zdMap } = deriveLayoutGeometry(
        prev,
        layoutMinHeight,
        widgetSizes,
        zoneHeaderHeights
      );

      const dragged = lw.find((widget) => widget.id === dragState.widgetId);
      if (!dragged) return prev;

      // On ne met pas une zone "dans" une autre zone.
      if (dragged.type === "zone") {
        return prev;
      }

      const width = Number(dragged.w || 260);
      const height = Number(dragged.h || 160);
      const centerX = dragged.x + width / 2;
      const centerY = dragged.y + height / 2;

      // Chercher si le centre tombe dans une zone.
      let targetZoneId = null;
      for (const [zoneId, zd] of Object.entries(zdMap)) {
        const zx = zd.x;
        const zy = zd.y;
        const zw = zd.width;
        const zh = zd.height;
        if (centerX >= zx && centerX <= zx + zw && centerY >= zy && centerY <= zy + zh) {
          targetZoneId = zoneId;
          break;
        }
      }

      return prev.map((widget) => {
        if (widget.id !== dragState.widgetId) return widget;

        if (!targetZoneId) {
          // En dehors de toute zone -> coords globales, zoneId nul.
          return {
            ...widget,
            zoneId: null,
            x: snap(dragged.x),
            y: snap(dragged.y),
          };
        }

        const zd = zdMap[targetZoneId];
        if (!zd) {
          return {
            ...widget,
            zoneId: null,
            x: snap(dragged.x),
            y: snap(dragged.y),
          };
        }

        const headerHeight = zd.headerHeight ?? zoneHeaderHeightDefault;
        const bodyTop = zd.y + headerHeight;

        const localX = snap(dragged.x - (zd.x + zonePadding));
        const localY = snap(dragged.y - (bodyTop + zonePadding));

        return {
          ...widget,
          zoneId: targetZoneId,
          x: Math.max(0, localX),
          y: Math.max(0, localY),
        };
      });
    });

    setDragState?.({
      active: false,
      widgetId: null,
      offsetX: 0,
      offsetY: 0,
      widgetWidth: 0,
      widgetHeight: 0,
    });
  }, [
    dragState,
    setWidgets,
    deriveLayoutGeometry,
    layoutMinHeight,
    widgetSizes,
    zoneHeaderHeights,
    snap,
    zoneHeaderHeightDefault,
    zonePadding,
    setDragState,
  ]);

  return {
    handleLayoutMouseMove,
    handleLayoutDrop,
    finalizeDrag,
  };
}

export { useProductionLayoutDrag };
