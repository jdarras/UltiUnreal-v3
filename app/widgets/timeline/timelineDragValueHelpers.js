export function resolveTimelineDragValueFromY({
  y,
  bounds,
  range,
  meta,
  coerceNumericValue,
}) {
  const ratio =
    bounds && bounds.bottom !== bounds.top
      ? 1 - (y - bounds.top) / (bounds.bottom - bounds.top)
      : 0;
  const rawValue = range.min + ratio * (range.max - range.min);
  return coerceNumericValue(rawValue, meta, range);
}
