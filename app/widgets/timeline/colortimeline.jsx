import BindingPicker from '../bindingpicker.jsx';
import { getWidgetT } from '../widgetTranslator.js';
import {
  getLimitsRgbLabel,
  getLimitsAlphaLabel,
  getMinLabel,
  getMaxLabel,
  getStepLabel,
} from '../widgetI18n.js';
import { TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE } from './timelineEditorStyles.js';
import {
  collectChannelKeyframes,
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';

export function ColorTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const ui = selected.ui || {};
  const range = ui.range || {};
  const rangeAlpha = ui.rangeAlpha || {};
  const rgbMin = getFiniteNumber(range.min, 0);
  const rgbMax = getFiniteNumber(range.max, 1);
  const alphaMin = getFiniteNumber(rangeAlpha.min, 0);
  const alphaMax = getFiniteNumber(rangeAlpha.max, 1);
  const rgbHasRange = rgbMin < rgbMax;
  const alphaHasRange = alphaMin < alphaMax;
  const rgbKeyframes = collectChannelKeyframes(selectedTrack, ['r', 'g', 'b']);
  const alphaKeyframes = collectChannelKeyframes(selectedTrack, ['a']);
  const rgbMinOutOfRange = rgbHasRange && hasValuesBelowMin(rgbKeyframes, rgbMin);
  const rgbMaxOutOfRange = rgbHasRange && hasValuesAboveMax(rgbKeyframes, rgbMax);
  const alphaMinOutOfRange = alphaHasRange && hasValuesBelowMin(alphaKeyframes, alphaMin);
  const alphaMaxOutOfRange = alphaHasRange && hasValuesAboveMax(alphaKeyframes, alphaMax);

  const handleRangeChange = (target, key) => (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        [target]: {
          ...(target === 'range' ? range : rangeAlpha),
          [key]: raw === '' || raw === '-' ? raw : Number(raw)
        }
      }
    });
  };

  return (
    <div className="uu-list">
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="color"
      />

      <div className="uu-row uu-slider-editor-row" style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}>
        <label className="uu-label w-160">{getLimitsRgbLabel(getWidgetT())}</label>
        <span className="uu-muted">{getMinLabel(getWidgetT())}</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            rgbMinOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={range.min ?? 0}
          onChange={handleRangeChange('range', 'min')}
        />
        <span className="uu-muted">{getMaxLabel(getWidgetT())}</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            rgbMaxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={range.max ?? 1}
          onChange={handleRangeChange('range', 'max')}
        />
        <span className="uu-muted">{getStepLabel(getWidgetT())}</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={range.step ?? 0.01}
          onChange={handleRangeChange('range', 'step')}
        />
      </div>

      <div className="uu-row uu-slider-editor-row" style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}>
        <label className="uu-label w-160">{getLimitsAlphaLabel(getWidgetT())}</label>
        <span className="uu-muted">{getMinLabel(getWidgetT())}</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            alphaMinOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeAlpha.min ?? 0}
          onChange={handleRangeChange('rangeAlpha', 'min')}
        />
        <span className="uu-muted">{getMaxLabel(getWidgetT())}</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            alphaMaxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={rangeAlpha.max ?? 1}
          onChange={handleRangeChange('rangeAlpha', 'max')}
        />
        <span className="uu-muted">{getStepLabel(getWidgetT())}</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={rangeAlpha.step ?? 0.1}
          onChange={handleRangeChange('rangeAlpha', 'step')}
        />
      </div>
    </div>
  );
}
