import { useCallback, useState } from "react";

function useProductionLayoutMetrics() {
  const [widgetSizes, setWidgetSizes] = useState({});
  const [zoneHeaderHeights, setZoneHeaderHeights] = useState({});

  const handleZoneHeaderHeightChange = useCallback((zoneId, headerHeight) => {
    if (!zoneId || !Number.isFinite(headerHeight)) return;
    const rounded = Math.round(headerHeight);

    setZoneHeaderHeights((previous) => {
      const previousHeight = previous[zoneId];
      if (previousHeight && Math.abs(previousHeight - rounded) < 1) {
        return previous;
      }
      return {
        ...previous,
        [zoneId]: rounded,
      };
    });
  }, []);

  const handleWidgetSizeChange = useCallback((id, width, height) => {
    if (!id || !Number.isFinite(width) || !Number.isFinite(height)) return;

    setWidgetSizes((previous) => {
      const previousSize = previous[id];
      if (
        previousSize &&
        Math.abs(previousSize.width - width) < 1 &&
        Math.abs(previousSize.height - height) < 1
      ) {
        return previous;
      }

      return {
        ...previous,
        [id]: { width, height },
      };
    });
  }, []);

  return {
    widgetSizes,
    zoneHeaderHeights,
    handleZoneHeaderHeightChange,
    handleWidgetSizeChange,
  };
}

export { useProductionLayoutMetrics };
