import BindingPicker from '../bindingpicker.jsx';
import { TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE } from './timelineEditorStyles.js';
import {
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';

export function SliderTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const ui = selected.ui || {};
  const trackKeyframes = Array.isArray(selectedTrack?.keyframes)
    ? selectedTrack.keyframes
    : [];
  const minValue = getFiniteNumber(ui.min, -10);
  const maxValue = getFiniteNumber(ui.max, 10);
  const hasValidRange = Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue < maxValue;
  const minOutOfRange = hasValidRange && hasValuesBelowMin(trackKeyframes, minValue);
  const maxOutOfRange = hasValidRange && hasValuesAboveMax(trackKeyframes, maxValue);

  const handleMinChange = (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        min: raw === '' || raw === '-' ? raw : Number(raw)
      }
    });
  };

  const handleMaxChange = (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        max: raw === '' || raw === '-' ? raw : Number(raw)
      }
    });
  };

  const handleStepChange = (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        step: raw === '' || raw === '-' ? raw : Number(raw)
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
        valueMode="slider"
      />

      <div className="uu-row uu-slider-editor-row" style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}>
        <label className="uu-label w-160">Limites</label>

        <span className="uu-muted">Min</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            minOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={ui.min ?? -10}
          onChange={handleMinChange}
        />

        <span className="uu-muted">Max</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            maxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={ui.max ?? 10}
          onChange={handleMaxChange}
        />

        <span className="uu-muted">Step</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={ui.step ?? 0.1}
          onChange={handleStepChange}
        />
      </div>
    </div>
  );
}
