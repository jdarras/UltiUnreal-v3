import { COLLAPSE_BTN_SIZE, COLLAPSE_X } from './layout';

export function TimelineCollapseToggle({ entry, y, onToggle }) {
  if (!entry) return null;
  const adjustedY = y - 4;
  const half = COLLAPSE_BTN_SIZE / 2;
  const boxX = COLLAPSE_X;
  const boxY = adjustedY - half;
  return (
    <g
      className="uu-timeline-collapse-btn"
      onPointerDown={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onToggle?.();
      }}
    >
      <rect
        className="uu-timeline-collapse-box"
        x={boxX}
        y={boxY}
        width={COLLAPSE_BTN_SIZE}
        height={COLLAPSE_BTN_SIZE}
        rx={4}
      />
      <text
        className="uu-timeline-collapse-icon"
        x={boxX + half}
        y={adjustedY}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {entry.collapsed ? '>' : 'v'}
      </text>
    </g>
  );
}
