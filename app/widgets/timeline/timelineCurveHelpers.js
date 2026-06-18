export function buildTimelineStrokeStyle(stroke) {
  return { stroke };
}

export function buildTimelinePointStyle(stroke, fill, strokeWidth) {
  return { stroke, fill, strokeWidth };
}

export function resolveTimelinePointSelection({
  selectedKey,
  multiSelection,
  trackId,
  channelId,
  idx,
}) {
  const matchesChannel =
    channelId === null
      ? selectedKey?.channelId === null
      : selectedKey?.channelId === channelId;
  const active =
    selectedKey?.trackId === trackId &&
    matchesChannel &&
    selectedKey?.idx === idx;
  const multiActive =
    !active &&
    Array.isArray(multiSelection) &&
    multiSelection.some((key) => {
      const matchesMultiChannel =
        channelId === null
          ? key.channelId === null || key.channelId === undefined
          : key.channelId === channelId;
      return key.trackId === trackId && matchesMultiChannel && key.idx === idx;
    });

  return { active, multiActive };
}

export function resolveTimelinePointShape(interp, isSquareKind = false) {
  if (isSquareKind || interp === 'constant') return 'square';
  if (interp === 'bezier') return 'diamond';
  return 'circle';
}

export function buildTimelineKeyframePoints({
  keyframes = [],
  entry,
  bounds,
  range = { min: -1, max: 1 },
  frameToX,
  toGlobalFrame,
  isSquareKind = false,
  requireFiniteValue = false,
}) {
  return (keyframes || [])
    .map((keyframe, idx) => {
      const frame = Number(keyframe?.frame);
      if (!Number.isFinite(frame)) return null;

      const globalFrame = toGlobalFrame(entry, frame);
      const x = frameToX(Math.round(globalFrame));
      const valueNum = Number(keyframe?.value);
      if (requireFiniteValue && !Number.isFinite(valueNum)) return null;

      const interp = keyframe?.interp || 'linear';
      const shape = resolveTimelinePointShape(interp, isSquareKind);
      if (isSquareKind) {
        return { idx, x, y: bounds.mid, value: keyframe?.value, shape };
      }

      const ratio =
        range.max === range.min ? 0 : (valueNum - range.min) / (range.max - range.min);
      const y = Number.isFinite(valueNum)
        ? bounds.bottom - ratio * (bounds.bottom - bounds.top)
        : bounds.mid;

      return {
        idx,
        x,
        y,
        value: Number.isFinite(valueNum) ? valueNum : keyframe?.value,
        shape,
        inTangent: Number.isFinite(keyframe?.inTangent)
          ? Number(keyframe.inTangent)
          : undefined,
        outTangent: Number.isFinite(keyframe?.outTangent)
          ? Number(keyframe.outTangent)
          : undefined,
        inSpan: Number.isFinite(keyframe?.inSpan) ? Number(keyframe.inSpan) : undefined,
        outSpan: Number.isFinite(keyframe?.outSpan)
          ? Number(keyframe.outSpan)
          : undefined,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.x - b.x);
}

export function extendTimelineCurvePoints(points = [], graphLeft = 0, innerWidth = 0) {
  if (!points.length) return [];
  const first = points[0];
  const last = points[points.length - 1];
  return [
    { x: graphLeft, y: first.y, shape: first.shape },
    ...points,
    { x: graphLeft + innerWidth, y: last.y, shape: last.shape },
  ];
}

export function buildTimelineCurvePath(points = []) {
  if (points.length <= 1) return '';

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x || 1;

    if (a.shape === 'square') {
      d += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
      continue;
    }

    if (a.shape === 'diamond' || b.shape === 'diamond') {
      const m1 = Number.isFinite(a.outTangent) ? a.outTangent : 0;
      const m2 = Number.isFinite(b.inTangent) ? b.inTangent : 0;
      const spanOutRaw = Number.isFinite(a.outSpan) ? a.outSpan : dx / 3;
      const spanInRaw = Number.isFinite(b.inSpan) ? b.inSpan : dx / 3;
      const spanOut = Math.max(0, Math.min(dx, spanOutRaw));
      const spanIn = Math.max(0, Math.min(dx, spanInRaw));
      const cx1 = a.x + spanOut;
      const cy1 = a.y + m1 * spanOut;
      const cx2 = b.x - spanIn;
      const cy2 = b.y - m2 * spanIn;
      d += ` C ${cx1} ${cy1} ${cx2} ${cy2} ${b.x} ${b.y}`;
      continue;
    }

    d += ` L ${b.x} ${b.y}`;
  }

  return d;
}
