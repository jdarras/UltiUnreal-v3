import {
  getTimelineLinkAxesTitle,
  getTimelineReorderTitle,
} from './timelineHeaderI18n.js';

export function TimelineHeaderRow({
  entry,
  headerBounds,
  headerX,
  headerWidth,
  label,
  rowIndex,
  pastilles,
  isActive,
  linked,
  reorderTrackId,
  onReorderOver,
  onReorderEnd,
  onSelectTrack,
  onToggleLink,
  onReorderStart,
  onDeleteTrack,
  isLinkableEntry,
  t,
}) {
  if (!entry || !headerBounds) return null;
  const linkAxesTitle = getTimelineLinkAxesTitle(t);
  const reorderTitle = getTimelineReorderTitle(t);

  return (
    <foreignObject
      x={headerX}
      y={headerBounds.top + 2}
      width={headerWidth}
      height={headerBounds.bottom - headerBounds.top - 4}
    >
      <div
        className="uu-timeline-header-row"
        onDragOver={(evt) => {
          if (reorderTrackId) {
            evt.preventDefault();
            onReorderOver?.(rowIndex, evt);
          }
        }}
        onDrop={(evt) => {
          evt.preventDefault();
          onReorderEnd?.();
        }}
        onPointerDown={(evt) => {
          evt.stopPropagation();
          onSelectTrack?.();
        }}
      >
        <div className="uu-timeline-header-left">
          <button
            type="button"
            className={`uu-btn uu-timeline-header-edit${
              isActive ? ' prod-toggle-active' : ''
            }`}
            onPointerDown={(evt) => {
              evt.stopPropagation();
            }}
            onClick={(evt) => {
              evt.stopPropagation();
              onSelectTrack?.();
            }}
          >
            edit
          </button>
          <div className="uu-timeline-header-label" title={label}>
            {label}
          </div>
          {isLinkableEntry(entry) ? (
            <button
              type="button"
              className={`uu-timeline-lock-btn${linked ? ' is-active' : ''}`}
              title={linkAxesTitle}
              onPointerDown={(evt) => evt.stopPropagation()}
              onClick={(evt) => {
                evt.stopPropagation();
                onToggleLink?.();
              }}
            >
              <span className="uu-lock-letter" aria-hidden="true">
                L
              </span>
            </button>
          ) : null}
        </div>
        <div className="uu-timeline-header-targets">
          {pastilles.map((pastille) => (
            <span
              key={pastille.ip}
              className={`uu-pastille ${pastille.className}`}
              title={pastille.ip}
            />
          ))}
        </div>
        <div className="uu-timeline-header-spacer" />
        <button
          type="button"
          className="uu-timeline-header-handle"
          title={reorderTitle}
          draggable
          onDragStart={onReorderStart}
          onDragEnd={onReorderEnd}
          onDragOver={(e) => e.preventDefault()}
        >
          ⋯
        </button>
        <button
          type="button"
          className="uu-timeline-header-delete"
          onPointerDown={(evt) => {
            evt.stopPropagation();
          }}
          onClick={(evt) => {
            evt.stopPropagation();
            onDeleteTrack?.();
          }}
        >
          X
        </button>
      </div>
    </foreignObject>
  );
}
