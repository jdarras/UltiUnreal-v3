export const INSPECTOR_WIDTH_80_STYLE = { width: '80px' };
export const INSPECTOR_WIDTH_90_STYLE = { width: 90 };
export const INSPECTOR_WIDTH_100_STYLE = { width: '100px' };
export const INSPECTOR_WIDTH_120_STYLE = { width: '120px' };
export const INSPECTOR_WIDTH_140_STYLE = { width: '140px' };
export const INSPECTOR_WIDTH_140_NUM_STYLE = { width: 140 };
export const INSPECTOR_WIDTH_180_STYLE = { width: '180px' };
export const INSPECTOR_WIDTH_220_STYLE = { width: '220px' };

export const INSPECTOR_COL_GAP_6_STYLE = { gap: 6 };
export const INSPECTOR_COL_GAP_10_STYLE = { gap: 10 };
export const INSPECTOR_COL_GAP_12_STYLE = { gap: 12 };
export const INSPECTOR_ROW_WRAP_GAP_16_STYLE = { gap: 16 };
export const INSPECTOR_ROW_NOWRAP_GAP_10_STYLE = { gap: 10 };
export const INSPECTOR_MIN_WIDTH_520_STYLE = { minWidth: '520px' };
export const INSPECTOR_FLEX_ITEM_150_STYLE = { flex: '0 0 auto', minWidth: '150px' };
export const INSPECTOR_FLEX_ITEM_180_STYLE = { flex: '0 0 auto', minWidth: '180px' };
export const INSPECTOR_FLEX_ITEM_200_STYLE = { flex: '0 0 auto', minWidth: '200px' };

export const INSPECTOR_ROW_BROWSE_STYLE = { flex: '1 1 auto', gap: 8, flexWrap: 'nowrap' };
export const INSPECTOR_TEXTAREA_BROWSE_STYLE = {
  flex: '1 1 auto',
  minWidth: 0,
  resize: 'vertical',
  fontFamily: 'monospace',
  lineHeight: '1.2',
  overflowWrap: 'anywhere'
};
export const INSPECTOR_HIDDEN_INPUT_STYLE = { display: 'none' };
export const INSPECTOR_BUTTON_AUTO_FLEX_STYLE = { flex: '0 0 auto' };
export const INSPECTOR_BOOL_ROW_STYLE = { flex: '1 1 auto' };

export const INSPECTOR_LABEL_MARGIN_LEFT_STYLE = { marginLeft: '8px' };
export const INSPECTOR_COLOR_ROW_STYLE = { alignItems: 'center', gap: 8, position: 'relative' };
export const INSPECTOR_COLOR_POPOVER_STYLE = { top: 30, left: 180, zIndex: 60 };

export function buildInspectorBackgroundStyle(background) {
  return { background };
}

export function buildInspectorNumericArgStyle(width) {
  return { width, maxWidth: 800, flex: '0 0 auto' };
}

export function buildInspectorEnumSelectStyle(px) {
  return { minWidth: `${px}px`, width: 'auto' };
}

export function buildInspectorAutoWidthWithMinStyle(minWidthPx) {
  return { width: 'auto', minWidth: `${minWidthPx}px` };
}
