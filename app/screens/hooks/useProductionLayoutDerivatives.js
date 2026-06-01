import { useMemo } from 'react';

function normalizeProductionLayoutColor(value) {
  const normalized = String(value || '').trim();
  return normalized || '#1F2937';
}

function useProductionLayoutDerivatives({
  layouts = [],
  activeLayoutId = '',
  widgets = [],
  selectedId = null,
} = {}) {
  const activeLayout = useMemo(
    () => layouts.find((layout) => layout.id === activeLayoutId) || layouts[0] || null,
    [layouts, activeLayoutId]
  );

  const selected = useMemo(
    () => widgets.find((widget) => widget.id === selectedId) || null,
    [widgets, selectedId]
  );

  return {
    activeLayout,
    selected,
    normalizeLayoutColor: normalizeProductionLayoutColor,
  };
}

export { useProductionLayoutDerivatives };
