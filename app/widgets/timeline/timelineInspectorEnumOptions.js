import { useMemo } from 'react';
import { computeEnumWidth } from './uiDisplayUtils.js';

export function buildTimelineInspectorEnumOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((opt, idx) => {
    if (opt && typeof opt === 'object') {
      const value = opt.value ?? opt.id ?? opt.label ?? '';
      const label = opt.label ?? opt.value ?? opt.id ?? '';
      return {
        value: String(value ?? ''),
        label: String(label ?? ''),
        key: `${idx}-${String(value ?? '')}`
      };
    }
    const value = String(opt ?? '');
    return { value, label: value, key: `${idx}-${value}` };
  });
}

export function useTimelineInspectorEnumOptions(options) {
  const enumOptions = useMemo(
    () => buildTimelineInspectorEnumOptions(options),
    [options]
  );
  const enumWidthPx = useMemo(() => computeEnumWidth(enumOptions), [enumOptions]);
  return { enumOptions, enumWidthPx };
}
