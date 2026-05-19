export function hasTimelineBindingParameters(func) {
  return !!func && Array.isArray(func.parameters) && func.parameters.length > 0;
}
