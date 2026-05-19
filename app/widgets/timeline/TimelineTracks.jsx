import React from 'react';
import { hasMissingBinding } from './timelineTrackBindingHelpers.js';

function buildTimelineStrokeStyle(stroke) {
  return { stroke };
}

function buildTimelinePointStyle(stroke, fill, strokeWidth) {
  return { stroke, fill, strokeWidth };
}

const TRANSFORM_GROUP_MAP = {
  tx: 'location',
  ty: 'location',
  tz: 'location',
  rroll: 'rotation',
  rpitch: 'rotation',
  ryaw: 'rotation',
  sx: 'scale',
  sy: 'scale',
  sz: 'scale'
};

const COLOR_GROUP_MAP = { r: 'rgb', g: 'rgb', b: 'rgb', a: 'alpha' };

export function TimelineTracks({
  // refs
  svgRef,
  // layout / geometry
  graphHeight,
  innerWidth,
  trackAreaHeight,
  frameLines,
  layoutEntries,
  xTicks,
  clampedMaxFrame,
  playheadFrame,
  // selection
  selectedTrackId,
  selectedKey,
  // helpers
  frameToX,
  toGlobalFrame,
  getChannelBounds,
  getChannelColor,
  getTrackValueSummary,
  getInlineDraftValue,
  getInlineDraftKey,
  getNumericRange,
  formatNumber,
  shouldRenderSquare,
  renderCollapseToggle,
  renderHeaderRow,
  renderKeyControls,
  shouldShowEye,
  isCurveHidden,
  toggleCurveVisibility,
  registerPoint,
  // callbacks / state setters
  handleSvgPointerDown,
  updateFromPointer,
  handlePointerUp,
  handleClipPointerDown,
  handlePointerDown,
  setSelectedTrackId,
  setSelectedChannelId,
  setSelectedKey,
  handleInlineChannelValueChange,
  // data
  inlineDrafts,
  setInlineDrafts,
  multiSelection,
  SQUARE_POINT_KINDS,
  lassoBox,
  onWheel,
  viewStart,
  viewFrames,
  // consts
  CHANNEL_ROW_HEIGHT,
  GRAPH_LEFT,
  GRAPH_TOP,
  GRAPH_WIDTH,
  MIN_CLIP_PX,
  LABEL_RIGHT_X,
  // i18n / others
  getWidgetLabel
}) {
  const playheadRatio = clampedMaxFrame
    ? Math.max(0, Math.min(1, (playheadFrame - (viewStart || 0)) / (viewFrames || clampedMaxFrame || 1)))
    : 0;
  const playheadVisible =
    Number.isFinite(playheadFrame) &&
    Number.isFinite(viewStart) &&
    Number.isFinite(viewFrames) &&
    playheadFrame >= viewStart &&
    playheadFrame <= viewStart + viewFrames;

  const clipId = React.useMemo(
    () => `uu-timeline-clip-${Math.random().toString(36).slice(2)}`,
    []
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${GRAPH_WIDTH} ${graphHeight}`}
      onPointerDown={handleSvgPointerDown}
      onPointerMove={updateFromPointer}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={onWheel}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={GRAPH_LEFT}
            y={GRAPH_TOP}
            width={innerWidth}
            height={trackAreaHeight}
          />
        </clipPath>
      </defs>

      {frameLines.map((frame) => {
        const ratio =
          viewFrames > 0 ? (frame - viewStart) / viewFrames : 0;
        const x = GRAPH_LEFT + ratio * innerWidth;
        return (
          <line
            key={`grid-x-${frame}`}
            className="uu-timeline-grid-line"
            x1={x}
            x2={x}
            y1={GRAPH_TOP}
            y2={GRAPH_TOP + trackAreaHeight}
          />
        );
      })}

        {layoutEntries.map((entry) => {
          const headerBounds = entry.headerRow?.bounds;
          if (!headerBounds) return null;
          return (
            <rect
            key={`header-mask-${entry.track.widgetId}`}
            className="uu-timeline-header-mask"
            x={GRAPH_LEFT}
            y={headerBounds.top}
            width={innerWidth}
            height={headerBounds.bottom - headerBounds.top}
            pointerEvents="none"
          />
        );
      })}

      {layoutEntries.map((entry) => {
        const isSelected = entry.track.widgetId === selectedTrackId;
        const hasMissingPropertyBinding = hasMissingBinding(entry.widget);
        const contentBounds = entry.contentBounds;
        if (!contentBounds) return null;
        const rowLines =
          entry.meta.kind === 'multi' && !entry.collapsed
            ? entry.channelRows || []
            : [];
        const shape = String(entry.meta?.shape || '').toLowerCase();
        const isSharedGraph =
          entry.meta?.kind === 'multi' && shape === 'vector';
        return (
          <g key={`track-bg-${entry.track.widgetId}`}>
            <rect
              x={GRAPH_LEFT}
              y={contentBounds.top}
              width={innerWidth}
              height={contentBounds.bottom - contentBounds.top}
              className={`uu-timeline-track-bg${
                isSelected ? ' is-selected' : ''
              }${hasMissingPropertyBinding ? ' is-binding-missing' : ''}`}
              onPointerDown={() => {
                setSelectedTrackId(entry.track.widgetId);
                setSelectedKey(null);
              }}
            />
            {rowLines.length ? (
              isSharedGraph ? (
                (() => {
                  const range =
                    entry.sharedRange ||
                    entry.channelRanges?.[rowLines[0].channel?.id] ||
                    { min: -1, max: 1 };
                  if (!(Number.isFinite(range.min) && Number.isFinite(range.max))) return null;
                  if (range.min > 0 || range.max < 0) return null;
                  const ratio =
                    range.max === range.min
                      ? 0.5
                      : (0 - range.min) / (range.max - range.min);
                  const y =
                    contentBounds.bottom - ratio * (contentBounds.bottom - contentBounds.top);
                  return (
                    <line
                      key={`zero-${entry.track.widgetId}`}
                      className="uu-timeline-track-line"
                      x1={GRAPH_LEFT}
                      x2={GRAPH_LEFT + innerWidth}
                      y1={y}
                      y2={y}
                    />
                  );
                })()
              ) : (
                (() => {
                  const drawnZero = new Set();
                  return rowLines.map((row) => {
                    const channelId = row.channel?.id;
                    const range =
                      entry.channelRanges?.[channelId] ||
                      entry.sharedRange ||
                      { min: -1, max: 1 };
                    const channelShape = String(entry.meta?.shape || '').toLowerCase();
                    let groupKey = channelId;
                    if (channelShape === 'transform') {
                      groupKey = TRANSFORM_GROUP_MAP[channelId] || channelId;
                    } else if (channelShape === 'color') {
                      groupKey = COLOR_GROUP_MAP[channelId] || channelId;
                    }
                    if (
                      Number.isFinite(range.min) &&
                      Number.isFinite(range.max) &&
                      range.min <= 0 &&
                      range.max >= 0
                    ) {
                      if (
                        (channelShape === 'transform' || channelShape === 'color') &&
                        drawnZero.has(groupKey)
                      ) {
                        return null;
                      }
                      if (channelShape === 'transform' || channelShape === 'color') {
                        drawnZero.add(groupKey);
                      }
                      const ratio =
                        range.max === range.min
                          ? 0.5
                          : (0 - range.min) / (range.max - range.min);
                      const y =
                        row.bounds.bottom - ratio * (row.bounds.bottom - row.bounds.top);
                      return (
                        <line
                          key={`zero-${entry.track.widgetId}-${channelId}`}
                          className="uu-timeline-track-line"
                          x1={GRAPH_LEFT}
                          x2={GRAPH_LEFT + innerWidth}
                          y1={y}
                          y2={y}
                        />
                      );
                    }
                    return null;
                  });
                })()
              )
            ) : (() => {
              const range =
                entry.meta.kind === 'number'
                  ? getNumericRange(entry.meta, entry.keyframes)
                  : { min: -1, max: 1 };
              if (!(Number.isFinite(range.min) && Number.isFinite(range.max))) return null;
              if (range.min > 0 || range.max < 0) return null;
              const ratio =
                range.max === range.min ? 0.5 : (0 - range.min) / (range.max - range.min);
              const y =
                contentBounds.bottom - ratio * (contentBounds.bottom - contentBounds.top);
              return (
                <line
                  key={`zero-${entry.track.widgetId}`}
                  className="uu-timeline-track-line"
                  x1={GRAPH_LEFT}
                  x2={GRAPH_LEFT + innerWidth}
                  y1={y}
                  y2={y}
                />
              );
            })()}
          </g>
        );
      })}

      <g clipPath={`url(#${clipId})`}>
        {layoutEntries.map((entry) => {
          if (!entry.hasContainer || entry.collapsed) return null;
          const bounds = entry.bounds;
          const isSelected = entry.track.widgetId === selectedTrackId;
          const contentBounds = entry.contentBounds || bounds;
          const clipStartFrame = toGlobalFrame(entry, entry.localMinFrame);
          const clipEndFrame = toGlobalFrame(entry, entry.localMaxFrame);
          const clipStartX = frameToX(clipStartFrame);
          const clipEndX = frameToX(clipEndFrame);
          const rawWidth = clipEndX - clipStartX;
          const minWidth = MIN_CLIP_PX;
          let visualStartX = clipStartX;
          let visualEndX = clipEndX;
          if (rawWidth < minWidth) {
            visualStartX = clipStartX - minWidth / 2;
            visualEndX = clipStartX + minWidth / 2;
          }
          const width = Math.max(minWidth, visualEndX - visualStartX);
          const clipHeight = Math.max(12, contentBounds.bottom - contentBounds.top - 12);
          const clipY =
            contentBounds.top + (contentBounds.bottom - contentBounds.top - clipHeight) / 2;
          const handleWidth = Math.min(8, width);
          const showHandles = entry.localDuration > 0;

          return (
            <g key={`track-clip-${entry.track.widgetId}`}>
              <rect
                className={`uu-timeline-clip${isSelected ? ' is-selected' : ''}`}
                x={visualStartX}
                y={clipY}
                width={width}
                height={clipHeight}
                rx={6}
                onPointerDown={(evt) => handleClipPointerDown(entry.track.widgetId, 'move', evt)}
              />
              {showHandles && (
                <>
                  <rect
                    className="uu-timeline-clip-handle"
                    x={visualStartX - handleWidth / 2}
                    y={clipY}
                    width={handleWidth}
                    height={clipHeight}
                    rx={4}
                    onPointerDown={(evt) =>
                      handleClipPointerDown(entry.track.widgetId, 'resize-start', evt)
                    }
                  />
                  <rect
                    className="uu-timeline-clip-handle"
                    x={visualStartX + width - handleWidth / 2}
                    y={clipY}
                    width={handleWidth}
                    height={clipHeight}
                    rx={4}
                    onPointerDown={(evt) =>
                      handleClipPointerDown(entry.track.widgetId, 'resize-end', evt)
                    }
                  />
                </>
              )}
            </g>
          );
        })}

        {playheadVisible && (
          <line
            className="uu-timeline-playhead"
            x1={GRAPH_LEFT + playheadRatio * innerWidth}
            x2={GRAPH_LEFT + playheadRatio * innerWidth}
            y1={GRAPH_TOP}
            y2={GRAPH_TOP + trackAreaHeight}
          />
        )}

      </g>

      {xTicks.map((tick, idx) => (
        <text
          key={`x-label-${idx}`}
          className="uu-timeline-axis-label"
          x={tick.x}
          y={graphHeight - 6}
          textAnchor="middle"
        >
          {tick.label}
        </text>
      ))}

      {layoutEntries.map((entry, idx) => {
        const bounds = entry.bounds;
        const label = getWidgetLabel(entry.widget);
        const meta = entry.meta;
        const summary = getTrackValueSummary(entry);
        const metaLabel = entry.widget?.type || '';
        const metaText = summary ? `${metaLabel} - ${summary}` : metaLabel;
        const range = meta.kind === 'number' ? getNumericRange(meta, entry.keyframes) : null;
        const collapseRow = entry.channelRows && entry.channelRows.length ? entry.channelRows[0] : null;
        const collapseY = collapseRow ? collapseRow.bounds.mid + 4 : bounds.mid + 4;
        const headerBounds = entry.headerRow?.bounds;
        const headerY = headerBounds ? headerBounds.mid + 4 : collapseY;

        if (
          meta.kind === 'multi' &&
          (meta.shape === 'vector' ||
            meta.shape === 'color' ||
            meta.shape === 'joystick' ||
            meta.shape === 'transform') &&
          !entry.collapsed &&
          entry.channelRows?.length
        ) {
          const header = entry.headerRow?.bounds || {
            top: bounds.top,
            bottom: bounds.top + CHANNEL_ROW_HEIGHT,
            mid: bounds.top + CHANNEL_ROW_HEIGHT / 2
          };
          return (
            <g key={`track-label-${entry.track.widgetId}`}>
              {renderCollapseToggle(entry, header.mid + 4)}
              {renderHeaderRow(entry, header, label, idx)}
              {entry.channelRows.map((row) => {
                const channelLabel = row.channel?.label || row.channel?.id || '';
                const rowY = row.bounds.mid + 4;
                const channelId = row.channel?.id || '';
                return (
                  <g key={`track-label-${entry.track.widgetId}-${row.channel?.id}`}>
                    {renderKeyControls(entry, rowY, channelId, {
                      editable: true,
                      value: getInlineDraftValue(entry, channelId),
                      onChange: (val) => {
                        const key = getInlineDraftKey(entry.track.widgetId, channelId);
                        setInlineDrafts((prev) => ({
                          ...prev,
                          [key]: val
                        }));
                        handleInlineChannelValueChange(entry, channelId, val);
                      },
                      onKeyDown: (evt) => {
                        if (evt.key !== 'Enter') return;
                        evt.preventDefault();
                        const key = getInlineDraftKey(entry.track.widgetId, channelId);
                        const draftValue = inlineDrafts[key] ?? evt.target.value;
                        handleInlineChannelValueChange(entry, channelId, draftValue, {
                          useSelected: true
                        });
                      },
                      onBlur: () => {
                        const key = getInlineDraftKey(entry.track.widgetId, channelId);
                        setInlineDrafts((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        });
                      },
                      ...(shouldShowEye(entry)
                        ? {
                            hidden: isCurveHidden(entry, channelId),
                            onToggleHidden: () => toggleCurveVisibility(entry, channelId)
                          }
                        : null)
                    })}
                    <text
                      className="uu-timeline-channel-label"
                      x={LABEL_RIGHT_X}
                      y={rowY}
                      textAnchor="end"
                      onPointerDown={() => {
                        setSelectedTrackId(entry.track.widgetId);
                        setSelectedChannelId(channelId);
                        setSelectedKey(null);
                      }}
                    >
                      {channelLabel}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }

        if (meta.kind === 'multi' && !entry.collapsed && entry.channelRows?.length) {
          return (
            <g key={`track-label-${entry.track.widgetId}`}>
              {renderCollapseToggle(entry, headerY)}
              {renderHeaderRow(entry, headerBounds, label, idx)}
              {entry.channelRows.map((row) => {
                const channelLabel = row.channel?.label || row.channel?.id || '';
                const rowLabel = channelLabel;
                const rowY = row.bounds.mid + 4;
                return (
                  <g key={`track-label-${entry.track.widgetId}-${row.channel?.id}`}>
                    {renderKeyControls(entry, rowY, row.channel?.id, {
                      ...(shouldShowEye(entry)
                        ? {
                            hidden: isCurveHidden(entry, row.channel?.id),
                            onToggleHidden: () => toggleCurveVisibility(entry, row.channel?.id)
                          }
                        : null)
                    })}
                    <text
                      className="uu-timeline-channel-label"
                      x={LABEL_RIGHT_X}
                      y={rowY}
                      textAnchor="end"
                      onPointerDown={() => {
                        setSelectedTrackId(entry.track.widgetId);
                        setSelectedChannelId(row.channel?.id || '');
                        setSelectedKey(null);
                      }}
                    >
                      {rowLabel}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }

        return (
          <g key={`track-label-${entry.track.widgetId}`}>
            {renderCollapseToggle(entry, headerY)}
            {renderHeaderRow(entry, headerBounds, label, idx)}
            {!entry.collapsed &&
              renderKeyControls(entry, (entry.contentBounds || bounds).mid + 4, null, {
                ...(shouldShowEye(entry)
                  ? {
                      hidden: isCurveHidden(entry),
                      onToggleHidden: () => toggleCurveVisibility(entry)
                    }
                  : null),
                hideValue: SQUARE_POINT_KINDS.has(meta.kind)
              })}
            {!headerBounds && (
              <>
                <text
                  className="uu-timeline-track-label"
                  x={LABEL_RIGHT_X}
                  y={bounds.mid - 6}
                  textAnchor="end"
                  onPointerDown={() => {
                    setSelectedTrackId(entry.track.widgetId);
                    setSelectedKey(null);
                  }}
                >
                  {label}
                </text>
                <text className="uu-timeline-track-meta" x={LABEL_RIGHT_X} y={bounds.mid + 8} textAnchor="end">
                  {metaText}
                </text>
              </>
            )}
            {meta.kind === 'number' && range && !entry.collapsed ? (
              <>
                <text
                  className="uu-timeline-axis-label"
                  x={GRAPH_LEFT - 8}
                  y={(entry.contentBounds || bounds).top + 10}
                  textAnchor="end"
                >
                  {formatNumber(range.max, meta.numericKind)}
                </text>
                <text
                  className="uu-timeline-axis-label"
                  x={GRAPH_LEFT - 8}
                  y={(entry.contentBounds || bounds).bottom - 4}
                  textAnchor="end"
                >
                  {formatNumber(range.min, meta.numericKind)}
                </text>
              </>
            ) : null}
          </g>
        );
      })}

      {layoutEntries.map((entry) => {
        if (entry.collapsed) {
          const y =
            entry.headerRow?.bounds?.mid ||
            entry.bounds?.mid ||
            GRAPH_TOP + CHANNEL_ROW_HEIGHT / 2;
          const frames = [];
          if (entry.meta?.kind === 'multi') {
            const channels = Array.isArray(entry.meta?.channels)
              ? entry.meta.channels
              : [];
            channels.forEach((channel) => {
              const list = entry.channels?.[channel.id] || [];
              list.forEach((kf) => {
                const frame = Number(kf?.frame);
                if (!Number.isFinite(frame)) return;
                const globalFrame = toGlobalFrame(entry, frame);
                frames.push(globalFrame);
              });
            });
          } else {
            (entry.keyframes || []).forEach((kf) => {
              const frame = Number(kf?.frame);
              if (!Number.isFinite(frame)) return;
              const globalFrame = toGlobalFrame(entry, frame);
              frames.push(globalFrame);
            });
          }
          const hasFrames = frames.length > 0;
          let minF = null;
          let maxF = null;
          frames.forEach((f) => {
            minF = minF === null ? f : Math.min(minF, f);
            maxF = maxF === null ? f : Math.max(maxF, f);
          });

          return (
            <g key={`collapsed-${entry.track.widgetId}`} clipPath={`url(#${clipId})`}>
              {hasFrames && minF !== null && maxF !== null && minF !== maxF && (
                <line
                  x1={frameToX(minF)}
                  y1={y}
                  x2={frameToX(maxF)}
                  y2={y}
                  stroke="#475569"
                  strokeWidth="1"
                  opacity="0.7"
                />
              )}
              {frames.map((f, idx) => (
                <circle
                  key={`cpt-${entry.track.widgetId}-${idx}`}
                  cx={frameToX(f)}
                  cy={y}
                  r={2}
                  fill="#38bdf8"
                  opacity="0.9"
                />
              ))}
            </g>
          );
        }
        const bounds = entry.bounds;
        const contentBounds = entry.contentBounds || bounds;
        const meta = entry.meta;
        if (meta.kind === 'multi') {
          const channels = Array.isArray(meta.channels) ? meta.channels : [];
          return (
            <g key={`track-pts-${entry.track.widgetId}`} clipPath={`url(#${clipId})`}>
              {channels.map((channel, channelIdx) => {
                if (isCurveHidden(entry, channel.id)) return null;
                const rowBounds = getChannelBounds(entry, channel.id) || bounds;
                const list = entry.channels?.[channel.id] || [];
                const range =
                  entry.channelRanges?.[channel.id] ||
                  entry.sharedRange ||
                  getNumericRange({ numericKind: 'float' }, list);
                const color = getChannelColor(entry, channel, channelIdx);
                // For single-channel widgets (slider), getChannelColor returns red; multi keeps per-channel colors
                const points = list
                  .map((kf, idx) => {
                    const frame = Number(kf?.frame);
                    if (!Number.isFinite(frame)) return null;
                    const globalFrame = toGlobalFrame(entry, frame);
                    const globalFrameRounded = Math.round(globalFrame);
                    const x = frameToX(globalFrameRounded);
                    const valueNum = Number(kf?.value);
                    if (!Number.isFinite(valueNum)) return null;
                    const ratio =
                      range.max === range.min ? 0 : (valueNum - range.min) / (range.max - range.min);
                    const y = rowBounds.bottom - ratio * (rowBounds.bottom - rowBounds.top);
                    const interp = kf && kf.interp ? kf.interp : 'linear';
                    const shape =
                      interp === 'constant' ? 'square' : interp === 'bezier' ? 'diamond' : 'circle';
                    return {
                      idx,
                      x,
                      y,
                      value: valueNum,
                      shape,
                      inTangent: Number.isFinite(kf?.inTangent) ? Number(kf.inTangent) : undefined,
                      outTangent: Number.isFinite(kf?.outTangent) ? Number(kf.outTangent) : undefined,
                      inSpan: Number.isFinite(kf?.inSpan) ? Number(kf.inSpan) : undefined,
                      outSpan: Number.isFinite(kf?.outSpan) ? Number(kf.outSpan) : undefined
                    };
                  })
                  .filter(Boolean)
                  .sort((a, b) => a.x - b.x);

                // start/end extension + bezier support
                const pointsWithExt = [];
                if (points.length) {
                  const first = points[0];
                  const last = points[points.length - 1];
                  pointsWithExt.push({ x: GRAPH_LEFT, y: first.y, shape: first.shape });
                  points.forEach((p) => pointsWithExt.push(p));
                  pointsWithExt.push({
                    x: GRAPH_LEFT + innerWidth,
                    y: last.y,
                    shape: last.shape
                  });
                }

                let pathEl = null;
                if (pointsWithExt.length > 1) {
                  let d = `M ${pointsWithExt[0].x} ${pointsWithExt[0].y}`;
                  for (let i = 1; i < pointsWithExt.length; i += 1) {
                    const a = pointsWithExt[i - 1];
                    const b = pointsWithExt[i];
                    const dx = b.x - a.x || 1;
                    // constant holds / steps
                    if (a.shape === 'square') {
                      if (b.shape === 'square') {
                        d += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
                        continue;
                      }
                      if (b.shape === 'diamond') {
                        d += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
                        continue;
                      }
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
                  pathEl = <path className="uu-timeline-line" d={d} style={buildTimelineStrokeStyle(color)} />;
                }

                return (
                  <g key={`track-pts-${entry.track.widgetId}-${channel.id}`}>
                    {pathEl}
                    {points.map((p) => {
                      const active =
                        selectedKey?.trackId === entry.track.widgetId &&
                        selectedKey?.channelId === channel.id &&
                        selectedKey?.idx === p.idx;
                      const multiActive =
                        !active &&
                        Array.isArray(multiSelection) &&
                        multiSelection.some(
                          (k) =>
                            k.trackId === entry.track.widgetId &&
                            k.channelId === channel.id &&
                            k.idx === p.idx
                        );
                      const showLabel = selectedTrackId === entry.track.widgetId;
                      registerPoint({
                        trackId: entry.track.widgetId,
                        channelId: channel.id,
                        idx: p.idx,
                        x: p.x,
                        y: p.y,
                        bounds: rowBounds,
                        active
                      });
                      const shape = p.shape === 'square' ? 'square' : p.shape === 'diamond' ? 'diamond' : 'circle';
                      const fillColor = active || multiActive ? '#dc2626' : '#0f172a';
                      const strokeWidth = active || multiActive ? 2.5 : 2;
                      return (
                        <g key={`pt-${entry.track.widgetId}-${channel.id}-${p.idx}`}>
                          {shape === 'square' ? (
                            <rect
                              className={`uu-timeline-point-square${active ? ' active' : ''}`}
                              x={p.x - 6}
                              y={p.y - 6}
                              width={12}
                              height={12}
                              style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                              onPointerDown={(evt) =>
                                handlePointerDown(entry.track.widgetId, p.idx, evt, channel.id)
                              }
                            />
                          ) : shape === 'diamond' ? (
                            <polygon
                              className="uu-timeline-point"
                              points={`${p.x},${p.y - 7} ${p.x + 7},${p.y} ${p.x},${p.y + 7} ${p.x - 7},${p.y}`}
                              style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                              onPointerDown={(evt) =>
                                handlePointerDown(entry.track.widgetId, p.idx, evt, channel.id)
                              }
                            />
                          ) : (
                            <circle
                              className="uu-timeline-point"
                              cx={p.x}
                              cy={p.y}
                              r={active ? 7 : 6}
                              style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                              onPointerDown={(evt) =>
                                handlePointerDown(entry.track.widgetId, p.idx, evt, channel.id)
                              }
                            />
                          )}
                          {showLabel && (
                            <text className="uu-timeline-point-label" x={p.x} y={p.y - 10} textAnchor="middle">
                              {formatNumber(p.value, 'float')}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        }

        // kind number/bool/etc
        const list = entry.keyframes || [];
        const isSquareKind = shouldRenderSquare(entry);
        const metaRange =
          entry.meta.kind === 'number' ? getNumericRange(entry.meta, list) : { min: -1, max: 1 };
        if (!list.length) return null;

        const points = list
          .map((kf, idx) => {
            const frame = Number(kf?.frame);
            if (!Number.isFinite(frame)) return null;
            const globalFrame = toGlobalFrame(entry, frame);
            const globalFrameRounded = Math.round(globalFrame);
            const x = frameToX(globalFrameRounded);
            const valueNum = Number(kf?.value);
            const interp = kf && kf.interp ? kf.interp : 'linear';
            const shape = isSquareKind
              ? 'square'
              : interp === 'constant'
              ? 'square'
              : interp === 'bezier'
              ? 'diamond'
              : 'circle';
            // For discrete/square kinds, lock Y to mid row to keep squares centered
            if (isSquareKind) {
              return { idx, x, y: contentBounds.mid, value: kf?.value, shape };
            }
            const ratio =
              metaRange.max === metaRange.min
                ? 0
                : (valueNum - metaRange.min) / (metaRange.max - metaRange.min);
            const y = Number.isFinite(valueNum)
              ? contentBounds.bottom - ratio * (contentBounds.bottom - contentBounds.top)
              : contentBounds.mid;
            return {
              idx,
              x,
              y,
              value: Number.isFinite(valueNum) ? valueNum : kf?.value,
              shape,
              inTangent: Number.isFinite(kf?.inTangent) ? Number(kf.inTangent) : undefined,
              outTangent: Number.isFinite(kf?.outTangent) ? Number(kf.outTangent) : undefined,
              inSpan: Number.isFinite(kf?.inSpan) ? Number(kf.inSpan) : undefined,
              outSpan: Number.isFinite(kf?.outSpan) ? Number(kf.outSpan) : undefined
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.x - b.x);

        const pointsWithExt = [];
        if (points.length) {
          const first = points[0];
          const last = points[points.length - 1];
          pointsWithExt.push({ x: GRAPH_LEFT, y: first.y, shape: first.shape });
          points.forEach((p) => pointsWithExt.push(p));
          pointsWithExt.push({
            x: GRAPH_LEFT + innerWidth,
            y: last.y,
            shape: last.shape
          });
        }

        const color = getChannelColor(entry, null, 0) || '#38bdf8';
        let pathEl = null;
        if (pointsWithExt.length > 1 && entry.meta.kind === 'number') {
          let d = `M ${pointsWithExt[0].x} ${pointsWithExt[0].y}`;
          for (let i = 1; i < pointsWithExt.length; i += 1) {
            const a = pointsWithExt[i - 1];
            const b = pointsWithExt[i];
            const dx = b.x - a.x || 1;
            // Constant (square) segments: keep flat until next point
            if (a.shape === 'square') {
              // square -> square : step
              if (b.shape === 'square') {
                d += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
                continue;
              }
              // square -> bezier : keep constant until the keyframe, then jump vertically
              if (b.shape === 'diamond') {
                d += ` L ${b.x} ${a.y} L ${b.x} ${b.y}`;
                continue;
              }
              // square -> linear/other : step then straight line
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
          pathEl = <path className="uu-timeline-line" d={d} style={buildTimelineStrokeStyle(color)} />;
        }

        return (
          <g key={`track-pts-${entry.track.widgetId}`} clipPath={`url(#${clipId})`}>
            {pathEl}
            {points.map((p) => {
                      const active =
                        selectedKey?.trackId === entry.track.widgetId &&
                        selectedKey?.channelId === null &&
                        selectedKey?.idx === p.idx;
                      const multiActive =
                        !active &&
                        Array.isArray(multiSelection) &&
                        multiSelection.some(
                          (k) =>
                            k.trackId === entry.track.widgetId &&
                            (k.channelId === null || k.channelId === undefined) &&
                            k.idx === p.idx
                        );
              const showLabel = selectedTrackId === entry.track.widgetId && !isSquareKind;
              registerPoint({
                trackId: entry.track.widgetId,
                channelId: null,
                idx: p.idx,
                x: p.x,
                y: p.y,
                bounds: contentBounds,
                active
              });
              const shape = p.shape === 'square' ? 'square' : p.shape === 'diamond' ? 'diamond' : 'circle';
              const fillColor = active || multiActive ? '#dc2626' : '#0f172a';
              const strokeWidth = active || multiActive ? 2.5 : 2;
              return (
                <g key={`pt-${entry.track.widgetId}-${p.idx}`}>
                  {shape === 'square' ? (
                    <rect
                      className={`uu-timeline-point-square${active ? ' active' : ''}`}
                      x={p.x - 6}
                      y={p.y - 6}
                      width={12}
                      height={12}
                      style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                      onPointerDown={(evt) => handlePointerDown(entry.track.widgetId, p.idx, evt, null)}
                    />
                  ) : shape === 'diamond' ? (
                    <polygon
                      className="uu-timeline-point"
                      points={`${p.x},${p.y - 7} ${p.x + 7},${p.y} ${p.x},${p.y + 7} ${p.x - 7},${p.y}`}
                      style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                      onPointerDown={(evt) =>
                        handlePointerDown(entry.track.widgetId, p.idx, evt, null)
                      }
                    />
                  ) : (
                    <circle
                      className="uu-timeline-point"
                      cx={p.x}
                      cy={p.y}
                      r={active ? 7 : 6}
                      style={buildTimelinePointStyle(color, fillColor, strokeWidth)}
                      onPointerDown={(evt) => handlePointerDown(entry.track.widgetId, p.idx, evt, null)}
                    />
                  )}
                  {showLabel && (
                    <text className="uu-timeline-point-label" x={p.x} y={p.y - 10} textAnchor="middle">
                      {formatNumber(p.value, entry.meta.numericKind)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {lassoBox ? (
        <rect
          className="uu-timeline-lasso"
          x={Math.min(lassoBox.x1, lassoBox.x2)}
          y={Math.min(lassoBox.y1, lassoBox.y2)}
          width={Math.abs(lassoBox.x2 - lassoBox.x1)}
          height={Math.abs(lassoBox.y2 - lassoBox.y1)}
          pointerEvents="none"
        />
      ) : null}
    </svg>
  );
}
