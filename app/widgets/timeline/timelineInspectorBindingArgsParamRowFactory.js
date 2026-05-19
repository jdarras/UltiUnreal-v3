import {
  classifyTimelineBindingParamType,
  computeTimelineBindingEnumWidth,
  parseTimelineBindingEnumOptions,
  resolveTimelineBindingParamName,
  resolveTimelineBindingParamType
} from './timelineInspectorBindingArgsHelpers.js';
import { resolveTimelineBindingArgLabel } from './timelineInspectorBindingArgsI18n.js';

export function buildTimelineBindingParamRowModel(param, idx, argValues, t) {
  const name = resolveTimelineBindingParamName(param, idx);
  const label = resolveTimelineBindingArgLabel(t, name);
  const typeStr = resolveTimelineBindingParamType(param);
  let kind = classifyTimelineBindingParamType(typeStr);
  const current = (argValues && typeof argValues === 'object') ? argValues[name] : undefined;
  const options = kind === 'enum' ? parseTimelineBindingEnumOptions(param) : [];

  if (kind === 'enum' && options.length === 0) {
    kind = 'default';
  }

  return {
    key: name,
    name,
    label,
    kind,
    current,
    options,
    widthPx: kind === 'enum' ? computeTimelineBindingEnumWidth(options) : null,
    min: kind === 'byte' ? 0 : null,
    max: kind === 'byte' ? 255 : null
  };
}

export function buildTimelineBindingParamRowModels(func, argValues, t) {
  if (!Array.isArray(func?.parameters)) return [];
  return func.parameters.map((param, idx) =>
    buildTimelineBindingParamRowModel(param, idx, argValues, t)
  );
}
