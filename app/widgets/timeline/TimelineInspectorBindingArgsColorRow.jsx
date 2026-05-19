import { ColorWheelPopover } from '../colorwidget.jsx';
import { hexToRgb, rgbToHex } from './colorUtils';
import {
  INSPECTOR_WIDTH_80_STYLE,
  INSPECTOR_COLOR_ROW_STYLE,
  INSPECTOR_COLOR_POPOVER_STYLE,
  buildInspectorBackgroundStyle
} from './timelineInspectorStyles.js';

export function TimelineInspectorBindingArgsColorRow({
  t,
  name,
  label,
  current,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen,
  onChange
}) {
  const cur = current && typeof current === 'object' ? current : {};
  const r = Number(cur.R ?? cur.r ?? 1);
  const g = Number(cur.G ?? cur.g ?? 1);
  const b = Number(cur.B ?? cur.b ?? 1);
  const a = Number(cur.A ?? cur.a ?? 1);
  const hex = rgbToHex(
    Math.round((Number.isFinite(r) ? r : 1) * 255),
    Math.round((Number.isFinite(g) ? g : 1) * 255),
    Math.round((Number.isFinite(b) ? b : 1) * 255)
  );
  const showPicker = argColorPicker.open && argColorPicker.name === name;

  return (
    <div className="uu-row uu-row-nowrap" style={INSPECTOR_COLOR_ROW_STYLE}>
      <label className="uu-label w-160">{label}</label>
      <button
        type="button"
        className="uu-color-swatch"
        style={buildInspectorBackgroundStyle(hex)}
        onClick={() => {
          setColorPickerOpen(false);
          setArgColorPicker({
            open: true,
            name,
            hex,
            alpha: Number.isFinite(a) ? a : 1
          });
        }}
        title={t('widgets.common.pickColor')}
      />
      <span className="uu-muted">Alpha</span>
      <input
        className="uu-input uu-input-arg"
        type="number"
        min="0"
        max="1"
        step="0.01"
        placeholder="A"
        value={Number.isFinite(a) ? a : ''}
        style={INSPECTOR_WIDTH_80_STYLE}
        onChange={(e) => {
          const val = e.target.value === '' ? '' : Number(e.target.value);
          const next = {
            ...cur,
            A: val === '' ? '' : val
          };
          onChange(next);
          setArgColorPicker((prev) =>
            prev.name === name ? { ...prev, alpha: val === '' ? 1 : val } : prev
          );
        }}
      />
      {showPicker ? (
        <div className="uu-color-popover" style={INSPECTOR_COLOR_POPOVER_STYLE}>
          <ColorWheelPopover
            hex={argColorPicker.hex}
            alpha={argColorPicker.alpha}
            onChange={(nextHex, nextAlpha) => {
              const { r, g, b } = hexToRgb(nextHex);
              onChange({
                R: r / 255,
                G: g / 255,
                B: b / 255,
                A: nextAlpha
              });
              setArgColorPicker((prev) => ({
                ...prev,
                hex: nextHex,
                alpha: nextAlpha
              }));
            }}
            onClose={() => {
              setArgColorPicker({
                open: false,
                name: '',
                hex: '#ffffff',
                alpha: 1
              });
              setColorPickerOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
