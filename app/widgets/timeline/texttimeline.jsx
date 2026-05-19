import BindingPicker from '../bindingpicker.jsx';
import { getWidgetValueMeta } from '../../utils/timeline';
import { TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE } from './timelineEditorStyles.js';
import {
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';

export function TextTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;
  const meta = getWidgetValueMeta(selected);
  const isNumeric = meta.kind === 'number';
  const ui = selected.ui || {};
  const trackKeyframes = Array.isArray(selectedTrack?.keyframes)
    ? selectedTrack.keyframes
    : [];
  const minValue = getFiniteNumber(ui.min, -10);
  const maxValue = getFiniteNumber(ui.max, 10);
  const hasValidRange =
    Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue < maxValue;
  const minOutOfRange =
    hasValidRange && hasValuesBelowMin(trackKeyframes, minValue);
  const maxOutOfRange =
    hasValidRange && hasValuesAboveMax(trackKeyframes, maxValue);

  const handleRangeChange = (key) => (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        [key]: raw === '' || raw === '-' ? raw : Number(raw)
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
        valueMode="text"
      />

      {isNumeric && (
        <div
          className="uu-row uu-slider-editor-row"
          style={TIMELINE_EDITOR_ROW_NOWRAP_GAP_10_STYLE}
        >
          <label className="uu-label w-160">Limites & pas</label>
          <span className="uu-muted">Min</span>
          <input
            type="number"
            className={`uu-input uu-input-arg uu-slider-editor-input${
              minOutOfRange ? ' uu-input-range-alert' : ''
            }`}
            value={ui.min ?? -10}
            onChange={handleRangeChange('min')}
          />
          <span className="uu-muted">Max</span>
          <input
            type="number"
            className={`uu-input uu-input-arg uu-slider-editor-input${
              maxOutOfRange ? ' uu-input-range-alert' : ''
            }`}
            value={ui.max ?? 10}
            onChange={handleRangeChange('max')}
          />
          <span className="uu-muted">Step</span>
          <input
            type="number"
            className="uu-input uu-input-arg uu-slider-editor-input"
            value={ui.step ?? 0.1}
            onChange={handleRangeChange('step')}
          />
        </div>
      )}
    </div>
  );
}
