import BindingPicker from '../bindingpicker.jsx';
import {
  collectChannelKeyframes,
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';

export function VectorTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const ui = selected.ui || {};
  const range = ui.range || {};
  const rangeMin = getFiniteNumber(range.min, -1);
  const rangeMax = getFiniteNumber(range.max, 1);
  const hasValidRange = Number.isFinite(rangeMin) && Number.isFinite(rangeMax) && rangeMin < rangeMax;
  const channelKeyframes = collectChannelKeyframes(selectedTrack, ['x', 'y', 'z']);
  const minOutOfRange = hasValidRange && hasValuesBelowMin(channelKeyframes, rangeMin);
  const maxOutOfRange = hasValidRange && hasValuesAboveMax(channelKeyframes, rangeMax);

  const handleRangeChange = (key) => (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        range: {
          ...range,
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
        valueMode="vector"
      />

      <div className="uu-row uu-slider-editor-row" style={{ flexWrap: 'nowrap', gap: 10 }}>
        <label className="uu-label w-160">Limites & pas</label>
        <span className="uu-muted">Min</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            minOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={range.min ?? -1}
          onChange={handleRangeChange('min')}
        />
        <span className="uu-muted">Max</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            maxOutOfRange ? ' uu-input-range-alert' : ''
          }`}
          value={range.max ?? 1}
          onChange={handleRangeChange('max')}
        />
        <span className="uu-muted">Step</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={range.step ?? 0.1}
          onChange={handleRangeChange('step')}
        />
      </div>
    </div>
  );
}
