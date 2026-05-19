import {
  INSPECTOR_WIDTH_180_STYLE,
  INSPECTOR_WIDTH_220_STYLE,
  buildInspectorAutoWidthWithMinStyle
} from './timelineInspectorStyles.js';

export function resolveTimelineInspectorValueInputVariant({
  selectedMeta,
  selectedWidget
}) {
  if (selectedWidget?.type === 'button') return 'none';
  if (selectedMeta?.kind === 'enum') return 'enum';
  if (selectedWidget?.type === 'browse') return 'browse';
  if (selectedMeta?.kind === 'bool') return 'bool';
  return 'text';
}

export function buildTimelineInspectorTextInputProps(isNumericValue) {
  return {
    className: `uu-input${isNumericValue ? ' uu-input-arg' : ''}`,
    inputMode: isNumericValue ? 'decimal' : undefined,
    style: isNumericValue ? INSPECTOR_WIDTH_180_STYLE : INSPECTOR_WIDTH_220_STYLE
  };
}

export function buildTimelineInspectorEnumSelectProps(enumWidthPx) {
  return {
    style: buildInspectorAutoWidthWithMinStyle(enumWidthPx)
  };
}
