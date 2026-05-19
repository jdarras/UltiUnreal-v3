// app/widgets/colorwidget.jsx
import React from 'react';
import './colorwidget.css';
import BindingPicker from './bindingpicker.jsx';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';

function buildColorWidgetBackgroundStyle(background) {
  return { background };
}

function buildColorWheelKnobStyle(knobX, knobY) {
  return { left: knobX, top: knobY };
}

/* ===== Helpers de couleur ===== */

function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return { r: 255, g: 255, b: 255 };
  const intVal = parseInt(m[1], 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r, g, b) {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  let s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

function hsvToRgb(h, s, v) {
  s = clamp01(s);
  v = clamp01(v);

  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh >= 0 && hh < 1) {
    r1 = c;
    g1 = x;
  } else if (hh >= 1 && hh < 2) {
    r1 = x;
    g1 = c;
  } else if (hh >= 2 && hh < 3) {
    g1 = c;
    b1 = x;
  } else if (hh >= 3 && hh < 4) {
    g1 = x;
    b1 = c;
  } else if (hh >= 4 && hh < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  const m = v - c;

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255)
  };
}

function cssRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  const a =
    typeof alpha === 'number' && !Number.isNaN(alpha) ? alpha : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ===== Parsing valeur (#rrggbb|alpha) ===== */

function parseColorValue(value) {
  if (!value) {
    return { hex: '#ffffff', alpha: 1 };
  }

  if (typeof value === 'string') {
    const [hexPart, alphaPart] = value.split('|');
    const hex = /^#[0-9a-fA-F]{6}$/.test(hexPart)
      ? hexPart
      : '#ffffff';

    let alpha = 1;
    if (alphaPart !== undefined) {
      const num = Number(String(alphaPart).replace(',', '.'));
      if (!Number.isNaN(num)) {
        alpha = Math.max(0, Math.min(1, num));
      }
    }

    return { hex, alpha };
  }

  if (typeof value === 'object') {
    const hex =
      typeof value._hex === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(value._hex)
        ? value._hex
        : '#ffffff';

    const alpha =
      typeof value.A === 'number'
        ? Math.max(0, Math.min(1, value.A))
        : 1;

    return { hex, alpha };
  }

  return { hex: '#ffffff', alpha: 1 };
}

/* ===== Panel flottant avec roue + sliders ===== */

export function ColorWheelPopover({ hex, alpha: _alpha, onChange, onClose }) {
  const WHEEL_SIZE = 220;
  const RADIUS = WHEEL_SIZE / 2 - 1;

  const wheelRef = React.useRef(null);
  const [draggingWheel, setDraggingWheel] = React.useState(false);

  const { r, g, b } = hexToRgb(hex);
  const hsv = rgbToHsv(r, g, b);

    // Dessin de la roue (réagit à Saturation + Luminance)
    // Dessin de la roue (réagit à Saturation + Luminance, avec centre coloré)
  React.useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
    const data = imageData.data;
    const center = WHEEL_SIZE / 2;

    const currentS = clamp01(hsv.s);
    const currentV = clamp01(hsv.v);
    const MIN_S = 0.15; // saturation minimale au centre

    function mapSaturation(sBase) {
      // sBase = 0 au centre, 1 au bord
      if (currentS <= MIN_S) {
        // très peu saturé : roue quasi neutre, on garde un centre plutôt gris
        return currentS * sBase;
      }

      if (sBase <= currentS) {
        // de 0 .. currentS → MIN_S .. currentS (centre jamais totalement désaturé)
        const t = currentS === 0 ? 0 : sBase / currentS; // 0..1
        return MIN_S + t * (currentS - MIN_S);
      }

      // de currentS .. 1 → currentS .. 1
      const denom = 1 - currentS;
      const t = denom <= 0 ? 0 : (sBase - currentS) / denom; // 0..1
      return currentS + t * (1 - currentS);
    }

    let i = 0;
    for (let y = 0; y < WHEEL_SIZE; y += 1) {
      for (let x = 0; x < WHEEL_SIZE; x += 1) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > RADIUS) {
          data[i++] = 0;
          data[i++] = 0;
          data[i++] = 0;
          data[i++] = 0;
        } else {
          const angle = Math.atan2(dy, dx);
          const h = ((angle * 180) / Math.PI + 360) % 360;

          const sBase = Math.min(1, dist / RADIUS);
          const s = mapSaturation(sBase);

          const rgb = hsvToRgb(h, s, currentV);
          data[i++] = rgb.r;
          data[i++] = rgb.g;
          data[i++] = rgb.b;
          data[i++] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [hsv.s, hsv.v]);

  function updateFromHsv(newH, newS, newV) {
    const rgb = hsvToRgb(newH, newS, newV);
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    onChange(newHex);
  }

  function handleWheelPosition(clientX, clientY) {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const center = WHEEL_SIZE / 2;

    const dx = x - center;
    const dy = y - center;
    let dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (dist > RADIUS) dist = RADIUS;
    let s = Math.min(1, dist / RADIUS);
    if (dist < 2) s = 0;

    const h = ((angle * 180) / Math.PI + 360) % 360;
    updateFromHsv(h, s, hsv.v);
  }

  function handleWheelMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    handleWheelPosition(e.clientX, e.clientY);
    setDraggingWheel(true);
  }

  React.useEffect(() => {
    if (!draggingWheel) return;

    function handleMove(e) {
      e.preventDefault();
      handleWheelPosition(e.clientX, e.clientY);
    }
    function handleUp() {
      setDraggingWheel(false);
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [draggingWheel]);

  function handleSatChange(value100) {
    const s = clamp01(Number(value100) / 100);
    updateFromHsv(hsv.h, s, hsv.v);
  }

  function handleValChange(value100) {
    const v = clamp01(Number(value100) / 100);
    updateFromHsv(hsv.h, hsv.s, v);
  }

  const knobRadius = hsv.s * RADIUS;
  const knobAngleRad = (hsv.h * Math.PI) / 180;
  const knobX = WHEEL_SIZE / 2 + knobRadius * Math.cos(knobAngleRad);
  const knobY = WHEEL_SIZE / 2 + knobRadius * Math.sin(knobAngleRad);

  // Styles de dégradé pour les sliders
  const pureColor = hsvToRgb(hsv.h, 1, 1);

  // Saturation : de blanc (S=0) à couleur pleine (S=1)
  const satTrackStyle = {
    background: `linear-gradient(to top, rgb(255,255,255), rgb(${pureColor.r},${pureColor.g},${pureColor.b}))`
  };

  // Luminosité : niveaux de gris, de noir à blanc
  const valTrackStyle = {
    background: 'linear-gradient(to top, rgb(0,0,0), rgb(255,255,255))'
  };

  // RGB/Hex affichés (toujours à partir du hex courant)
  function handleRgbFieldChange(channel, valueStr) {
    let nr = r;
    let ng = g;
    let nb = b;
    const v = Math.max(0, Math.min(255, Number(valueStr) || 0));

    if (channel === 'r') nr = v;
    if (channel === 'g') ng = v;
    if (channel === 'b') nb = v;

    const newHex = rgbToHex(nr, ng, nb);
    onChange(newHex);
  }

  function handleHexFieldChange(valueStr) {
    const v = valueStr.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
    onChange(v);
  }

  return (
    <div
      className="uu-color-popover"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="uu-color-popover-inner">
        <div className="uu-color-popover-header">
          <span>Couleur</span>
          <button
            type="button"
            className="uu-btn-delete"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

              <div className="uu-color-popover-body">
              {/* Ligne du haut : roue + sliders verticaux */}
              <div className="uu-color-main-row">
                <div className="uu-color-wheel-wrapper">
                  <canvas
                    ref={wheelRef}
                    width={WHEEL_SIZE}
                    height={WHEEL_SIZE}
                    className="uu-color-wheel"
                    onMouseDown={handleWheelMouseDown}
                  />
                  <div
                    className="uu-color-wheel-knob"
                    style={buildColorWheelKnobStyle(knobX, knobY)}
                  />
                </div>

                <div className="uu-color-popover-right">
                  <div className="uu-color-vsliders">
                    <div
                      className="uu-color-vtrack"
                      style={satTrackStyle}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(hsv.s * 100)}
                        onChange={(e) => handleSatChange(e.target.value)}
                        className="uu-color-vslider"
                      />
                    </div>
                    <div
                      className="uu-color-vtrack"
                      style={valTrackStyle}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(hsv.v * 100)}
                        onChange={(e) => handleValChange(e.target.value)}
                        className="uu-color-vslider"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ligne du bas : R / G / B / Hex sur toute la largeur */}
              <div className="uu-color-fields">
                <div className="uu-color-field">
                  <label>R</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={r}
                    onChange={(e) =>
                      handleRgbFieldChange('r', e.target.value)
                    }
                  />
                </div>
                <div className="uu-color-field">
                  <label>G</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={g}
                    onChange={(e) =>
                      handleRgbFieldChange('g', e.target.value)
                    }
                  />
                </div>
                <div className="uu-color-field">
                  <label>B</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={b}
                    onChange={(e) =>
                      handleRgbFieldChange('b', e.target.value)
                    }
                  />
                </div>
                <div className="uu-color-field">
                  <label>Hex</label>
                  <input
                    type="text"
                    value={hex}
                    onChange={(e) =>
                      handleHexFieldChange(e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}

/* ===== Widget principal (dans la carte Production) ===== */

export default function ColorWidget({
  label,
  value,
  defaultValue,
  onChange,
  onCommit,
  onSetDefault,
  disabled,
  allowEditWhenDisabled,
  onDelete,
  onDuplicate,
  rightSlot,
  editMode
}) {
  const t = getWidgetT();
  const parsed = React.useMemo(
    () => parseColorValue(value),
    [value]
  );
  const parsedDefault = React.useMemo(
    () => parseColorValue(defaultValue),
    [defaultValue]
  );

  const [hex, setHex] = React.useState(parsed.hex);
  const [alpha, setAlpha] = React.useState(parsed.alpha);
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    setHex(parsed.hex);
    setAlpha(parsed.alpha);
  }, [parsed.hex, parsed.alpha]);

  // Fermer le picker si on clique en dehors du widget Color
  React.useEffect(() => {
    if (!isPickerOpen) return;

    function handleMouseDownOutside(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDownOutside);
    return () => {
      document.removeEventListener('mousedown', handleMouseDownOutside);
    };
  }, [isPickerOpen]);

  // Le widget Color dispose toujours d'une valeur par défaut (fallback #ffffff|1)
  const hasDefault = true;

  const isAtDefault =
    hasDefault &&
    hex.toLowerCase() === parsedDefault.hex.toLowerCase() &&
    Math.abs(alpha - parsedDefault.alpha) < 0.0005;

  const canEdit = !disabled || !!allowEditWhenDisabled;
  const canCommit = !disabled;

  const showReset = hasDefault && !isAtDefault;
  const canSetDefault = canEdit && !isAtDefault;

  function emit(nextHex, nextAlpha) {
    let h = nextHex;
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) {
      h = '#ffffff';
    }

    let aNum =
      typeof nextAlpha === 'number'
        ? nextAlpha
        : Number(String(nextAlpha).replace(',', '.'));

    if (Number.isNaN(aNum)) {
      aNum = alpha;
    }
    if (aNum < 0) aNum = 0;
    if (aNum > 1) aNum = 1;

    setHex(h);
    setAlpha(aNum);

    const combined = `${h}|${aNum.toFixed(3)}`;
    onChange?.(combined);
  }

  function handleSend(e) {
    e.stopPropagation();
    if (!canCommit) return;
    const combined = `${hex}|${alpha.toFixed(3)}`;
    onCommit?.(combined);
  }

  function handleReset(e) {
    e.stopPropagation();
    if (!hasDefault || !canEdit) return;
    emit(parsedDefault.hex, parsedDefault.alpha);
  }

  function handleSetDefault(e) {
    e.stopPropagation();
    if (!canEdit) return;
    const combined = `${hex}|${alpha.toFixed(3)}`;
    onSetDefault?.(combined);
  }

  const hasLabel = String(label || '').trim() !== '';
  const labelDisplay = hasLabel ? label : t('widgets.common.noLabel');

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (!onDelete) return;
    onDelete();
  };

  const handleDuplicateClick = (e) => {
    e.stopPropagation();
    if (!onDuplicate) return;
    onDuplicate();
  };


  const swatchCss = React.useMemo(
    () => cssRgba(hex, alpha),
    [hex, alpha]
  );

  const showTitleRow = hasLabel || (editMode && onDuplicate);

  return (
    <div className="uu-color-widget" ref={rootRef}>
      {showTitleRow && (
        <div className="uu-item-title-row">
          <div className="uu-item-title" title={label || ''}>
            {labelDisplay}
          </div>
          {editMode && onDuplicate && (
            <div className="uu-item-title-actions">
              <button
                type="button"
                className="uu-btn uu-btn-square"
                onClick={handleDuplicateClick}
                title={t('widgets.common.duplicateWidget')}
                aria-label={t('widgets.common.duplicateWidget')}
              >
                D
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ligne du haut : couleur (cliquable) + alpha */}
      <div className="uu-row uu-color-main-row mt-4">
        <button
          type="button"
          className="uu-color-swatch-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (canEdit) setIsPickerOpen((open) => !open);
          }}
          title={t('widgets.color.openPickerTooltip')}
        >
          <span
            className="uu-color-swatch"
            style={buildColorWidgetBackgroundStyle(swatchCss)}
          />
        </button>

        <span className="uu-muted">Alpha</span>

        <input
          type="number"
          min="0"
          max="1"
          step="0.01"
          className="uu-input uu-input-alpha"
          value={alpha}
          onChange={(e) => emit(hex, e.target.value)}
          disabled={!canEdit}
        />
      </div>

      {/* Ligne du bas : Envoyer + Reset + Supprimer (édition) + pastilles */}
      <div className="uu-row mt-4 uu-align-center">
        <button
          className="uu-btn uu-btn-primary"
          type="button"
          onClick={handleSend}
          disabled={!canCommit}
        >
          {t('widgets.common.send')}
        </button>

        {showReset && (
          <button
            className="uu-reset-btn"
            type="button"
            onClick={handleReset}
            disabled={!canEdit}
            title={t('widgets.common.resetDefault')}
          >
            ↺
          </button>
        )}

        {canSetDefault && (
          <button
            className="uu-reset-btn uu-set-default"
            type="button"
            onClick={handleSetDefault}
            disabled={!canEdit}
            title={t('widgets.common.setAsDefault')}
          >
            ↓
          </button>
        )}

        {/* Supprimer uniquement en mode édition */}
        {editMode && onDelete && (
          <button
            className="uu-btn-delete"
            type="button"
            onClick={handleDeleteClick}
            title={t('widgets.common.deleteWidget')}
            aria-label={t('widgets.common.deleteWidget')}
          >
            ✕
          </button>
        )}

        {/* Pastilles viennent après le dernier bouton visible */}
        {rightSlot && (
          <div className="uu-row uu-row-gap4">
            {rightSlot}
          </div>
        )}
      </div>

      {isPickerOpen && (
        <ColorWheelPopover
          hex={hex}
          alpha={alpha}
          onChange={(nextHex) => emit(nextHex, alpha)}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * ColorEditorRight = menu d’édition (colonne DROITE) pour le widget Color
 */
export function ColorEditorRight({
  selected,
  presetData,
  updateBinding,
  updateSelected,
  setValues
}) {
  if (!selected) return null;

  const defaultHex = (() => {
    const raw = selected.defaultValue;
    if (typeof raw === 'string') {
      const [hexPart] = raw.split('|');
      if (/^#[0-9a-fA-F]{6}$/.test(hexPart)) {
        return hexPart;
      }
    }
    return '#ffffff';
  })();

  return (
    <div className="uu-list prod-editor-right-color">
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="color"
      />

      <div className="uu-row">
        <label className="uu-label w-160">Couleur par défaut</label>
        <input
          type="color"
          className="uu-input-color"
          value={defaultHex}
          onChange={(e) => {
            const hex = e.target.value;
            const defaultString = `${hex}|1.000`;

            updateSelected({
              defaultValue: defaultString
            });

            if (setValues) {
              setValues((prev) => ({
                ...prev,
                [selected.id]: defaultString
              }));
            }
          }}
        />
      </div>
    </div>
  );
}

/**
 * ColorLabelEditor = menu d’édition (colonne GAUCHE) pour le label du widget Color
 */
export function ColorLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const t = getWidgetT();

  return (
    <div className="uu-row">
      <label
        className={`uu-label w-160 ${
          !selected.label?.trim() ? 'uu-label-error' : ''
        }`}
      >
        {t('widgets.common.label')}
      </label>

      <input
        className="uu-input uu-input-label"
        value={selected.label || ''}
        onChange={(e) => updateSelected({ label: e.target.value })}
      />
    </div>
  );
}

/**
 * ColorEditorLeftExtras = options spécifiques colonne GAUCHE (sous Cibles) :
 * snippets Companion (URL + Body)
 */
export function ColorEditorLeftExtras({ selected, layoutId = '' }) {
  if (!selected) return null;
  const t = getWidgetT();
  const widgetId = selected.id;

  // Base URL pour Companion (IP du HUB si dispo)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('ColorEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  if (!widgetId) return null;

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = `${baseUrl}/agent/ui/widgets/${encodeURIComponent(
    widgetId
  )}/press${layoutQuery}`;

  // Exemple de body basé sur la couleur par défaut si dispo
  const parsedExample = parseColorValue(
    selected.defaultValue || selected.value || '#ffffff|1.000'
  );
  const exampleBody = `{"value":"${parsedExample.hex}|${parsedExample.alpha.toFixed(
    3
  )}"}`;

  const handleCopy = (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        console.warn('Clipboard API not available');
      }
    } catch (e) {
      console.error('Failed to copy Companion snippet', e);
    }
  };

  return (
    <>
      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.companion.urlLabel')}</label>
        <div className="uu-value uu-buttons-row">
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy(url)}
            title={url}
          >
            {t('widgets.companion.copy')}
          </button>
        </div>
      </div>

      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.companion.bodyLabel')}</label>
        <div className="uu-value uu-buttons-row">
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy('{}')}
            title="{}"
          >
            {t('widgets.common.send')}
          </button>
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy('{"action":"reset"}')}
            title='{"action":"reset"}'
          >
            Reset
          </button>
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy(exampleBody)}
            title={exampleBody}
          >
            {t('widgets.companion.example')}
          </button>
        </div>
      </div>
    </>
  );
}

