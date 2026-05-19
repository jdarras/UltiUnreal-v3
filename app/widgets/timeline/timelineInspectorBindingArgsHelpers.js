export function resolveTimelineBindingFunction(selectedWidget, presetData) {
  const displayName = selectedWidget?.binding?.displayName;
  if (!displayName) return null;
  const funcs = Array.isArray(presetData?.funcs) ? presetData.funcs : [];
  return funcs.find((func) => func?.displayName === displayName) || null;
}

export function resolveTimelineBindingArgValues(
  selectedKeyframeArgs,
  selectedWidget
) {
  if (selectedKeyframeArgs && typeof selectedKeyframeArgs === 'object') {
    return selectedKeyframeArgs;
  }
  return selectedWidget?.binding?.argValues || {};
}

export function resolveTimelineBindingParamName(param, idx) {
  return (
    param?.Name ||
    param?.ParameterName ||
    param?.name ||
    `Param${idx + 1}`
  );
}

export function resolveTimelineBindingParamType(param) {
  return String(
    param?.Type || param?.ParameterType || param?.InnerType || param?.type || ''
  ).toLowerCase();
}

export function classifyTimelineBindingParamType(typeStr) {
  if (typeStr.includes('enum')) return 'enum';
  if (typeStr.includes('vector')) return 'vector';
  if (typeStr.includes('rotator')) return 'rotator';
  if (typeStr.includes('transform')) return 'transform';
  if (
    typeStr.includes('linearcolor') ||
    typeStr === 'flinearcolor' ||
    typeStr === 'fcolor'
  ) {
    return 'color';
  }
  if (typeStr.includes('bool')) return 'bool';
  if (typeStr.includes('byte') || typeStr.includes('uint8')) return 'byte';
  if (typeStr.includes('int64')) return 'int64';
  if (typeStr.includes('int')) return 'int';
  if (typeStr.includes('float') || typeStr.includes('double')) return 'float';
  if (
    typeStr.includes('fname') ||
    typeStr.includes('fstring') ||
    typeStr.includes('ftext') ||
    typeStr === 'name' ||
    typeStr === 'string' ||
    typeStr === 'text'
  ) {
    return 'text';
  }
  return 'default';
}

export function parseTimelineBindingEnumOptions(param) {
  let options = param?.EnumValues || param?.enumValues;
  if (!options && param?.Metadata) {
    options = param.Metadata.EnumValues || param.Metadata.enumvalues;
  }
  if (typeof options === 'string') {
    options = options
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return Array.isArray(options) ? options : [];
}

export function computeTimelineBindingEnumWidth(options) {
  if (!Array.isArray(options) || options.length === 0) return 160;
  const longest = options.reduce(
    (maxLength, option) => Math.max(maxLength, String(option).length),
    0
  );
  return Math.min(Math.max(longest * 9 + 40, 160), 420);
}
