import BindingPicker from '../bindingpicker.jsx';
import {
  collectChannelKeyframes,
  getFiniteNumber,
  hasValuesAboveMax,
  hasValuesBelowMin
} from './rangeAlerts.js';

export function TransformTimelineEditor({
  selected,
  selectedTrack,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const ui = selected.ui || {};
  const rangeLocation = ui.rangeLocation || {};
  const rangeRotation = ui.rangeRotation || {};
  const rangeScale = ui.rangeScale || {};
  const locationMin = getFiniteNumber(rangeLocation.min, -1000);
  const locationMax = getFiniteNumber(rangeLocation.max, 1000);
  const rotationMin = getFiniteNumber(rangeRotation.min, -180);
  const rotationMax = getFiniteNumber(rangeRotation.max, 180);
  const scaleMin = getFiniteNumber(rangeScale.min, 0);
  const scaleMax = getFiniteNumber(rangeScale.max, 10);

  const locationKeyframes = collectChannelKeyframes(selectedTrack, ['tx', 'ty', 'tz']);
  const rotationKeyframes = collectChannelKeyframes(selectedTrack, ['rroll', 'rpitch', 'ryaw']);
  const scaleKeyframes = collectChannelKeyframes(selectedTrack, ['sx', 'sy', 'sz']);

  const locationHasRange = locationMin < locationMax;
  const rotationHasRange = rotationMin < rotationMax;
  const scaleHasRange = scaleMin < scaleMax;

  const alertsByTarget = {
    rangeLocation: {
      min: locationHasRange && hasValuesBelowMin(locationKeyframes, locationMin),
      max: locationHasRange && hasValuesAboveMax(locationKeyframes, locationMax)
    },
    rangeRotation: {
      min: rotationHasRange && hasValuesBelowMin(rotationKeyframes, rotationMin),
      max: rotationHasRange && hasValuesAboveMax(rotationKeyframes, rotationMax)
    },
    rangeScale: {
      min: scaleHasRange && hasValuesBelowMin(scaleKeyframes, scaleMin),
      max: scaleHasRange && hasValuesAboveMax(scaleKeyframes, scaleMax)
    }
  };

  const handleRangeChange = (target, key) => (e) => {
    const raw = e.target.value;
    const current =
      target === 'rangeLocation'
        ? rangeLocation
        : target === 'rangeRotation'
        ? rangeRotation
        : rangeScale;
    updateSelected({
      ui: {
        ...ui,
        [target]: {
          ...current,
          [key]: raw === '' || raw === '-' ? raw : Number(raw)
        }
      }
    });
  };

  const renderRangeRow = (label, target, defaults) => {
    const current =
      target === 'rangeLocation'
        ? rangeLocation
        : target === 'rangeRotation'
        ? rangeRotation
        : rangeScale;
    const alerts = alertsByTarget[target] || { min: false, max: false };
    return (
      <div className="uu-row uu-slider-editor-row" style={{ flexWrap: 'nowrap', gap: 10 }}>
        <label className="uu-label w-160">{label}</label>
        <span className="uu-muted">Min</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            alerts.min ? ' uu-input-range-alert' : ''
          }`}
          value={current.min ?? defaults.min}
          onChange={handleRangeChange(target, 'min')}
        />
        <span className="uu-muted">Max</span>
        <input
          type="number"
          className={`uu-input uu-input-arg uu-slider-editor-input${
            alerts.max ? ' uu-input-range-alert' : ''
          }`}
          value={current.max ?? defaults.max}
          onChange={handleRangeChange(target, 'max')}
        />
        <span className="uu-muted">Step</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={current.step ?? defaults.step}
          onChange={handleRangeChange(target, 'step')}
        />
      </div>
    );
  };

  return (
    <div className="uu-list">
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="transform"
      />

      {renderRangeRow('Location', 'rangeLocation', { min: -1000, max: 1000, step: 1 })}
      {renderRangeRow('Rotation', 'rangeRotation', { min: -180, max: 180, step: 1 })}
      {renderRangeRow('Scale', 'rangeScale', { min: 0, max: 10, step: 0.1 })}
    </div>
  );
}
