export function TimelineTrackClip({
  trackId,
  model,
  selected = false,
  onClipPointerDown,
}) {
  return (
    <g>
      <rect
        className={`uu-timeline-clip${selected ? ' is-selected' : ''}`}
        x={model.visualStartX}
        y={model.clipY}
        width={model.width}
        height={model.clipHeight}
        rx={6}
        onPointerDown={(evt) => onClipPointerDown(trackId, 'move', evt)}
      />
      {model.showHandles && (
        <>
          <rect
            className="uu-timeline-clip-handle"
            x={model.visualStartX - model.handleWidth / 2}
            y={model.clipY}
            width={model.handleWidth}
            height={model.clipHeight}
            rx={4}
            onPointerDown={(evt) => onClipPointerDown(trackId, 'resize-start', evt)}
          />
          <rect
            className="uu-timeline-clip-handle"
            x={model.visualStartX + model.width - model.handleWidth / 2}
            y={model.clipY}
            width={model.handleWidth}
            height={model.clipHeight}
            rx={4}
            onPointerDown={(evt) => onClipPointerDown(trackId, 'resize-end', evt)}
          />
        </>
      )}
    </g>
  );
}
