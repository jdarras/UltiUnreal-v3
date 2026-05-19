import BindingPicker from '../bindingpicker.jsx';
import { getWidgetT } from '../widgetTranslator.js';
import {
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';
import { TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE } from './timelineEditorStyles.js';

export function JoystickTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const t = getWidgetT();
  const ui = selected.ui || {};
  const linkType = ui.linkType || 'vector2d';

  const handleLinkTypeChange = (e) => {
    updateSelected({
      ui: {
        ...ui,
        linkType: e.target.value
      }
    });
  };

  const rangeX = ui.rangeX || {};
  const rangeY = ui.rangeY || {};
  const xMin = getFiniteNumber(rangeX.min, -1);
  const xMax = getFiniteNumber(rangeX.max, 1);
  const yMin = getFiniteNumber(rangeY.min, -1);
  const yMax = getFiniteNumber(rangeY.max, 1);
  const xHasRange = xMin < xMax;
  const yHasRange = yMin < yMax;
  const channelKeyframes = selectedTrack?.channels && typeof selectedTrack.channels === 'object'
    ? selectedTrack.channels
    : {};
  const xKeyframes = Array.isArray(channelKeyframes.x) ? channelKeyframes.x : [];
  const yKeyframes = Array.isArray(channelKeyframes.y) ? channelKeyframes.y : [];
  const xMinOutOfRange = xHasRange && hasValuesBelowMin(xKeyframes, xMin);
  const xMaxOutOfRange = xHasRange && hasValuesAboveMax(xKeyframes, xMax);
  const yMinOutOfRange = yHasRange && hasValuesBelowMin(yKeyframes, yMin);
  const yMaxOutOfRange = yHasRange && hasValuesAboveMax(yKeyframes, yMax);

  const handleAxisRangeChange = (axis, key) => (e) => {
    const raw = e.target.value;
    const target = axis === 'x' ? rangeX : rangeY;
    const prop = axis === 'x' ? 'rangeX' : 'rangeY';
    updateSelected({
      ui: {
        ...ui,
        [prop]: {
          ...target,
          [key]: raw === '' || raw === '-' ? raw : Number(raw)
        }
      }
    });
  };

  const jb = selected.joystickBindings || {};
  const bindingX = jb.x || {};
  const bindingY = jb.y || {};

  const handleChangeAxisBinding = (axis) => (updates) => {
    const next = {
      ...jb,
      [axis]: {
        ...(axis === 'x' ? bindingX : bindingY),
        ...updates
      }
    };

    updateSelected({
      joystickBindings: next
    });
  };

  return (
    <div className="uu-list">
      <div className="uu-row uu-binding-row">
        <label className="uu-label w-160">{t('widgets.joystick.linkType')}</label>
        <select
          className="uu-input"
          value={linkType}
          onChange={handleLinkTypeChange}
        >
          <option value="vector2d">
            {t('widgets.joystick.linkType.vector2d')}
          </option>
          <option value="manual">
            {t('widgets.joystick.linkType.manual')}
          </option>
        </select>
      </div>

      {linkType === 'vector2d' ? (
        <BindingPicker
          kind="property"
          presetData={presetData}
          value={selected.binding}
          onChange={updateBinding}
          valueMode="joystick_xy"
          propertyLabel={t('widgets.binding.propertyXY')}
        />
      ) : (
        <>
          <BindingPicker
            kind="property"
            presetData={presetData}
            value={bindingX}
            onChange={handleChangeAxisBinding('x')}
            valueMode="slider"
            propertyLabel={t('widgets.binding.propertyX')}
          />
          <BindingPicker
            kind="property"
            presetData={presetData}
            value={bindingY}
            onChange={handleChangeAxisBinding('y')}
            valueMode="slider"
            propertyLabel={t('widgets.binding.propertyY')}
          />
        </>
      )}

      <div className="uu-row uu-slider-editor-row" style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}>
        <label className="uu-label w-160">Limites X</label>
        <span className="uu-muted">Min</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            xMinOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeX.min ?? -1}
          onChange={handleAxisRangeChange('x', 'min')}
        />
        <span className="uu-muted">Max</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            xMaxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeX.max ?? 1}
          onChange={handleAxisRangeChange('x', 'max')}
        />
        <span className="uu-muted">Step</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={rangeX.step ?? 0.1}
          onChange={handleAxisRangeChange('x', 'step')}
        />
      </div>

      <div className="uu-row uu-slider-editor-row" style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}>
        <label className="uu-label w-160">Limites Y</label>
        <span className="uu-muted">Min</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            yMinOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeY.min ?? -1}
          onChange={handleAxisRangeChange('y', 'min')}
        />
        <span className="uu-muted">Max</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            yMaxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeY.max ?? 1}
          onChange={handleAxisRangeChange('y', 'max')}
        />
        <span className="uu-muted">Step</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={rangeY.step ?? 0.1}
          onChange={handleAxisRangeChange('y', 'step')}
        />
      </div>
    </div>
  );
}
