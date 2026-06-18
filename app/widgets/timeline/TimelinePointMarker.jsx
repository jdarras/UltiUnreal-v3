import { buildTimelinePointStyle } from './timelineCurveHelpers.js';

export function TimelinePointMarker({
  point,
  color,
  active = false,
  multiActive = false,
  label = null,
  onPointerDown,
}) {
  const shape =
    point.shape === 'square'
      ? 'square'
      : point.shape === 'diamond'
      ? 'diamond'
      : 'circle';
  const fillColor = active || multiActive ? '#dc2626' : '#0f172a';
  const strokeWidth = active || multiActive ? 2.5 : 2;
  const style = buildTimelinePointStyle(color, fillColor, strokeWidth);

  return (
    <g>
      {shape === 'square' ? (
        <rect
          className={`uu-timeline-point-square${active ? ' active' : ''}`}
          x={point.x - 6}
          y={point.y - 6}
          width={12}
          height={12}
          style={style}
          onPointerDown={onPointerDown}
        />
      ) : shape === 'diamond' ? (
        <polygon
          className="uu-timeline-point"
          points={`${point.x},${point.y - 7} ${point.x + 7},${point.y} ${point.x},${point.y + 7} ${point.x - 7},${point.y}`}
          style={style}
          onPointerDown={onPointerDown}
        />
      ) : (
        <circle
          className="uu-timeline-point"
          cx={point.x}
          cy={point.y}
          r={active ? 7 : 6}
          style={style}
          onPointerDown={onPointerDown}
        />
      )}
      {label !== null && label !== undefined && (
        <text
          className="uu-timeline-point-label"
          x={point.x}
          y={point.y - 10}
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}
