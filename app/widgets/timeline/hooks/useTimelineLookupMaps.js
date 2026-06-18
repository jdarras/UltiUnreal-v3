import { useMemo } from 'react';
import { buildHostColorMap } from '../timelineTargetHelpers';

export function useTimelineLookupMaps({ widgets, hosts }) {
  const widgetMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(widgets) ? widgets : [])
      .filter((widget) => widget && widget.id)
      .forEach((widget) => map.set(widget.id, widget));
    return map;
  }, [widgets]);

  const hostColorMap = useMemo(() => buildHostColorMap(hosts), [hosts]);

  return {
    widgetMap,
    hostColorMap,
  };
}
