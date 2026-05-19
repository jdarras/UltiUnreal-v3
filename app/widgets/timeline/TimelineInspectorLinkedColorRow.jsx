import { formatInputNumber } from './timelinewidget-shared.js';
import {
  INSPECTOR_WIDTH_100_STYLE,
  buildInspectorBackgroundStyle
} from './timelineInspectorStyles.js';

export function TimelineInspectorLinkedColorRow({
  t,
  colorPickerState,
  setArgColorPicker,
  setColorPickerOpen
}) {
  return (
    <div className="uu-row mt-6 uu-align-center uu-gap-8">
      <label className="uu-label" style={INSPECTOR_WIDTH_100_STYLE}>
        Color
      </label>
      <button
        type="button"
        className="uu-color-swatch"
        style={buildInspectorBackgroundStyle(colorPickerState.hex)}
        onClick={() => {
          setArgColorPicker({ open: false, name: '', hex: '#ffffff', alpha: 1 });
          setColorPickerOpen(true);
        }}
        title={t('widgets.common.pickColor')}
      />
      <span className="uu-muted">
        Alpha {formatInputNumber(colorPickerState.alpha, 'float')}
      </span>
    </div>
  );
}
