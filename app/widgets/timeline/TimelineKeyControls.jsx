import { KEY_EYE_BOX, KEY_VALUE_WIDTH, KEY_VALUE_HEIGHT } from './layout';
import {
  buildKeyControlsGeometry,
  getKeyControlDisplayValue,
} from './timelineKeyControlsHelpers';

const KEY_VALUE_INPUT_FOREIGN_OBJECT_STYLE = { overflow: 'visible' };

export function TimelineKeyControls({
  entry,
  y,
  channelId = null,
  options = {},
  getCurrentValueDisplay,
  handleKeyControlPointerDown,
  jumpToKeyframeFor,
  addKeyframeFor,
}) {
  const {
    editable = false,
    value = '',
    onChange = null,
    onBlur = null,
    onKeyDown = null,
    hidden = false,
    onToggleHidden = null,
    hideValue = false
  } = options;
  const rawValueText = editable
    ? value
    : getCurrentValueDisplay(entry, channelId);
  const valueText = String(rawValueText ?? '');
  const displayValue = getKeyControlDisplayValue(valueText);
  const {
    centerY,
    eyeX,
    eyeBoxX,
    eyeBoxY,
    leftArrowX,
    dotX,
    rightArrowX,
    valueBoxX,
    valueCenterY,
    valueBoxY,
  } = buildKeyControlsGeometry(y);

  return (
    <g className="uu-timeline-key-controls">
      {onToggleHidden && (
        <g
          className={`uu-timeline-eye${hidden ? ' is-hidden' : ''}`}
          onPointerDown={(evt) =>
            handleKeyControlPointerDown(evt, onToggleHidden)
          }
        >
          <rect
            className="uu-timeline-eye-box"
            x={eyeBoxX}
            y={eyeBoxY}
            width={KEY_EYE_BOX}
            height={KEY_EYE_BOX}
            rx={4}
          />
          <ellipse
            className="uu-timeline-eye-shape"
            cx={eyeX}
            cy={centerY}
            rx={6}
            ry={3}
          />
          <circle className="uu-timeline-eye-dot" cx={eyeX} cy={centerY} r={1.5} />
          {hidden && (
            <line
              className="uu-timeline-eye-slash"
              x1={eyeX - 6}
              y1={centerY - 4}
              x2={eyeX + 6}
              y2={centerY + 4}
            />
          )}
        </g>
      )}
      <text
        className="uu-timeline-key-control"
        x={leftArrowX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        onPointerDown={(evt) =>
          handleKeyControlPointerDown(evt, () =>
            jumpToKeyframeFor(entry, -1, channelId)
          )
        }
      >
        {'<'}
      </text>
      <circle
        className="uu-timeline-key-dot-btn"
        cx={dotX}
        cy={centerY}
        r={4}
        onPointerDown={(evt) =>
          handleKeyControlPointerDown(evt, () =>
            addKeyframeFor(entry, channelId)
          )
        }
      />
      <text
        className="uu-timeline-key-control"
        x={rightArrowX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        onPointerDown={(evt) =>
          handleKeyControlPointerDown(evt, () =>
            jumpToKeyframeFor(entry, 1, channelId)
          )
        }
      >
        {'>'}
      </text>
      {hideValue ? null : editable ? (
        <foreignObject
          x={valueBoxX}
          y={valueBoxY}
          width={KEY_VALUE_WIDTH}
          height={KEY_VALUE_HEIGHT}
          style={KEY_VALUE_INPUT_FOREIGN_OBJECT_STYLE}
          pointerEvents="all"
        >
          <input
            className="uu-timeline-key-input"
            type="text"
            inputMode="decimal"
            value={valueText}
            step="0.1"
            onPointerDown={(evt) => {
              evt.stopPropagation();
            }}
            onChange={(evt) => {
              evt.stopPropagation();
              if (onChange) onChange(evt.target.value);
            }}
            onBlur={(evt) => {
              if (onBlur) onBlur(evt.target.value);
            }}
            onKeyDown={(evt) => {
              evt.stopPropagation();
              if (onKeyDown) onKeyDown(evt);
            }}
          />
        </foreignObject>
      ) : (
        <>
          <rect
            className="uu-timeline-key-value-box"
            x={valueBoxX}
            y={valueBoxY}
            width={KEY_VALUE_WIDTH}
            height={KEY_VALUE_HEIGHT}
            rx={3}
            pointerEvents="none"
          />
          <text
            className="uu-timeline-key-value-text"
            x={valueBoxX + KEY_VALUE_WIDTH / 2}
            y={valueCenterY}
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {displayValue}
          </text>
        </>
      )}
    </g>
  );
}
