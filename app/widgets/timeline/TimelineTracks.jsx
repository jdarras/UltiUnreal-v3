import React from 'react';
import {
  buildTimelineCurvePath,
  buildTimelineKeyframePoints,
  buildTimelineStrokeStyle,
  extendTimelineCurvePoints,
  resolveTimelinePointSelection,
} from './timelineCurveHelpers.js';
import { TimelinePointMarker } from './TimelinePointMarker.jsx';
import { TimelineTrackClip } from './TimelineTrackClip.jsx';
import { hasMissingBinding } from './timelineTrackBindingHelpers.js';
import { buildTimelineCollapsedFrameModel } from './timelineCollapsedTrackHelpers.js';
import { buildTimelineClipModel } from './timelineClipHelpers.js';
import { buildTimelineZeroLineModels } from './timelineZeroLineHelpers.js';

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
        const zeroLineModels = buildTimelineZeroLineModels({
          entry,
          rowLines,
          contentBounds,
          getNumericRange,
        });
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
            {zeroLineModels.map((line) => (
                <line
                  key={line.key}
                  className="uu-timeline-track-line"
                  x1={GRAPH_LEFT}
                  x2={GRAPH_LEFT + innerWidth}
                  y1={line.y}
                  y2={line.y}
                />
            ))}
          </g>
        );
      })}

      <g clipPath={`url(#${clipId})`}>
        {layoutEntries.map((entry) => {
          if (!entry.hasContainer || entry.collapsed) return null;
          const bounds = entry.bounds;
          const isSelected = entry.track.widgetId === selectedTrackId;
          const contentBounds = entry.contentBounds || bounds;
          const clipModel = buildTimelineClipModel({
            entry,
            contentBounds,
            frameToX,
            toGlobalFrame,
            minClipPx: MIN_CLIP_PX,
          });

          return (
            <TimelineTrackClip
              key={`track-clip-${entry.track.widgetId}`}
              trackId={entry.track.widgetId}
              model={clipModel}
              selected={isSelected}
              onClipPointerDown={handleClipPointerDown}
            />
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
          const { frames, minFrame, maxFrame, hasRange } =
            buildTimelineCollapsedFrameModel(entry, toGlobalFrame);

          return (
            <g key={`collapsed-${entry.track.widgetId}`} clipPath={`url(#${clipId})`}>
              {hasRange && (
                <line
                  x1={frameToX(minFrame)}
                  y1={y}
                  x2={frameToX(maxFrame)}
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
                const points = buildTimelineKeyframePoints({
                  keyframes: list,
                  entry,
                  bounds: rowBounds,
                  range,
                  frameToX,
                  toGlobalFrame,
                  requireFiniteValue: true,
                });

                const path = buildTimelineCurvePath(
                  extendTimelineCurvePoints(points, GRAPH_LEFT, innerWidth)
                );
                const pathEl = path ? (
                  <path
                    className="uu-timeline-line"
                    d={path}
                    style={buildTimelineStrokeStyle(color)}
                  />
                ) : null;

                return (
                  <g key={`track-pts-${entry.track.widgetId}-${channel.id}`}>
                    {pathEl}
                    {points.map((p) => {
                      const { active, multiActive } = resolveTimelinePointSelection({
                        selectedKey,
                        multiSelection,
                        trackId: entry.track.widgetId,
                        channelId: channel.id,
                        idx: p.idx,
                      });
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
                      return (
                        <TimelinePointMarker
                          key={`pt-${entry.track.widgetId}-${channel.id}-${p.idx}`}
                          point={p}
                          color={color}
                          active={active}
                          multiActive={multiActive}
                          label={showLabel ? formatNumber(p.value, 'float') : null}
                          onPointerDown={(evt) =>
                            handlePointerDown(entry.track.widgetId, p.idx, evt, channel.id)
                          }
                        />
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

        const points = buildTimelineKeyframePoints({
          keyframes: list,
          entry,
          bounds: contentBounds,
          range: metaRange,
          frameToX,
          toGlobalFrame,
          isSquareKind,
        });

        const color = getChannelColor(entry, null, 0) || '#38bdf8';
        const path =
          entry.meta.kind === 'number'
            ? buildTimelineCurvePath(
                extendTimelineCurvePoints(points, GRAPH_LEFT, innerWidth)
              )
            : '';
        const pathEl = path ? (
          <path
            className="uu-timeline-line"
            d={path}
            style={buildTimelineStrokeStyle(color)}
          />
        ) : null;

        return (
          <g key={`track-pts-${entry.track.widgetId}`} clipPath={`url(#${clipId})`}>
            {pathEl}
            {points.map((p) => {
              const { active, multiActive } = resolveTimelinePointSelection({
                selectedKey,
                multiSelection,
                trackId: entry.track.widgetId,
                channelId: null,
                idx: p.idx,
              });
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
              return (
                <TimelinePointMarker
                  key={`pt-${entry.track.widgetId}-${p.idx}`}
                  point={p}
                  color={color}
                  active={active}
                  multiActive={multiActive}
                  label={showLabel ? formatNumber(p.value, entry.meta.numericKind) : null}
                  onPointerDown={(evt) =>
                    handlePointerDown(entry.track.widgetId, p.idx, evt, null)
                  }
                />
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
