import React from 'react';
import {
  TIMELINE_BINDING_ROTATOR_AXES,
  TIMELINE_BINDING_TRANSFORM_BLOCKS,
  TIMELINE_BINDING_VECTOR_AXES,
  normalizeTimelineBindingArgObject,
  updateTimelineBindingRotatorAxis,
  updateTimelineBindingTransformPart,
  updateTimelineBindingVectorAxis
} from './timelineInspectorBindingArgsSpatialHelpers.js';
import {
  INSPECTOR_ROW_NOWRAP_GAP_10_STYLE,
  INSPECTOR_WIDTH_90_STYLE,
  INSPECTOR_WIDTH_140_NUM_STYLE,
  INSPECTOR_COL_GAP_6_STYLE,
  INSPECTOR_LABEL_MARGIN_LEFT_STYLE
} from './timelineInspectorStyles.js';

export function TimelineInspectorBindingArgsVector3Row({
  name,
  label,
  current,
  onChange
}) {
  const cur = normalizeTimelineBindingArgObject(current);
  return (
    <div
      className="uu-row uu-row-nowrap"
      key={name}
      style={INSPECTOR_ROW_NOWRAP_GAP_10_STYLE}
    >
      <label className="uu-label w-160">{label}</label>
      {TIMELINE_BINDING_VECTOR_AXES.map((axis) => (
        <React.Fragment key={`${name}-${axis}`}>
          <span className="uu-muted">{axis}</span>
          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={axis}
            style={INSPECTOR_WIDTH_90_STYLE}
            value={cur[axis] ?? ''}
            onChange={(e) =>
              onChange(updateTimelineBindingVectorAxis(current, axis, e.target.value))
            }
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export function TimelineInspectorBindingArgsRotatorRow({
  name,
  label,
  current,
  onChange
}) {
  const cur = normalizeTimelineBindingArgObject(current);
  return (
    <div
      className="uu-row uu-row-nowrap"
      key={name}
      style={INSPECTOR_ROW_NOWRAP_GAP_10_STYLE}
    >
      <label className="uu-label w-160">{label}</label>
      {TIMELINE_BINDING_ROTATOR_AXES.map(({ lbl, prop }) => (
        <React.Fragment key={`${name}-${prop}`}>
          <span className="uu-muted">{lbl}</span>
          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={lbl}
            style={INSPECTOR_WIDTH_90_STYLE}
            value={cur[prop] ?? ''}
            onChange={(e) =>
              onChange(updateTimelineBindingRotatorAxis(current, prop, e.target.value))
            }
          />
        </React.Fragment>
      ))}
    </div>
  );
}

export function TimelineInspectorBindingArgsTransformRow({
  name,
  label,
  current,
  onChange
}) {
  const cur = normalizeTimelineBindingArgObject(current);
  const translation = normalizeTimelineBindingArgObject(cur.Translation);
  const rotation = normalizeTimelineBindingArgObject(cur.Rotation);
  const scale3D = normalizeTimelineBindingArgObject(cur.Scale3D);

  const readPartValue = (part, axis) => {
    if (part === 'Translation') return translation[axis] ?? '';
    if (part === 'Rotation') return rotation[axis] ?? '';
    return scale3D[axis] ?? '';
  };

  return (
    <div className="uu-col" key={name} style={INSPECTOR_COL_GAP_6_STYLE}>
      <div className="uu-label" style={INSPECTOR_LABEL_MARGIN_LEFT_STYLE}>
        {label}
      </div>
      {TIMELINE_BINDING_TRANSFORM_BLOCKS.map(({ title, part, axes, labels }) => (
        <div
          className="uu-row uu-row-nowrap"
          key={`${name}-${part}`}
          style={INSPECTOR_ROW_NOWRAP_GAP_10_STYLE}
        >
          <label className="uu-label w-160">{title}</label>
          {axes.map((axis, idx) => (
            <React.Fragment key={`${name}-${part}-${axis}`}>
              <span className="uu-muted">{labels[idx]}</span>
              <input
                className="uu-input uu-input-arg"
                type="number"
                placeholder={labels[idx]}
                style={INSPECTOR_WIDTH_140_NUM_STYLE}
                value={readPartValue(part, axis)}
                onChange={(e) =>
                  onChange(
                    updateTimelineBindingTransformPart(
                      current,
                      part,
                      axis,
                      e.target.value
                    )
                  )
                }
              />
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
