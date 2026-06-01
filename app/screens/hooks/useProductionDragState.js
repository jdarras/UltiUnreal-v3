import { useState } from 'react';

const INITIAL_DRAG_STATE = {
  active: false,
  widgetId: null,
  offsetX: 0,
  offsetY: 0,
  widgetWidth: 0,
  widgetHeight: 0,
};

function useProductionDragState() {
  const [dragState, setDragState] = useState(INITIAL_DRAG_STATE);
  return { dragState, setDragState };
}

export { useProductionDragState };
