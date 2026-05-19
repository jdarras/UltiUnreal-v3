// app/widgets/buttonwidget.jsx
import React from "react";
import "./buttonwidget.css";
import { getCompanionBaseUrl } from "../utils/agent";
import { ColorWheelPopover } from "./colorwidget.jsx";
import { getColorPickLabel } from "./widgetI18n.js";
import { getWidgetT } from "./widgetTranslator.js";

function buildButtonWidgetBackgroundStyle(background) {
  return { background };
}

function clampByte(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(255, Math.round(num)));
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function bytesToHex(rByte, gByte, bByte) {
  const toHex = (n) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(rByte)}${toHex(gByte)}${toHex(bByte)}`;
}

function parseHexColor(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || '').trim());
  if (!m) return null;
  const raw = m[1];
  return {
    rByte: parseInt(raw.slice(0, 2), 16),
    gByte: parseInt(raw.slice(2, 4), 16),
    bByte: parseInt(raw.slice(4, 6), 16),
  };
}

function resolveColorArgUiState(rawType, currentValue) {
  const cur =
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
      ? currentValue
      : {};
  const rawTypeNorm = String(rawType || '').trim().toLowerCase();
  const isDeclaredByte =
    rawTypeNorm.includes('fcolor') && !rawTypeNorm.includes('linearcolor');
  const isDeclaredLinear = rawTypeNorm.includes('linearcolor');

  const rawR = Number(cur.R);
  const rawG = Number(cur.G);
  const rawB = Number(cur.B);
  const valueLooksByte =
    (Number.isFinite(rawR) && rawR > 1) ||
    (Number.isFinite(rawG) && rawG > 1) ||
    (Number.isFinite(rawB) && rawB > 1);

  const useByteScale = isDeclaredByte || (!isDeclaredLinear && valueLooksByte);

  const toByte = (rawChannel) =>
    useByteScale
      ? clampByte(rawChannel)
      : clampByte(clamp01(rawChannel) * 255);

  const rByte = toByte(Number.isFinite(rawR) ? rawR : useByteScale ? 255 : 1);
  const gByte = toByte(Number.isFinite(rawG) ? rawG : useByteScale ? 255 : 1);
  const bByte = toByte(Number.isFinite(rawB) ? rawB : useByteScale ? 255 : 1);

  const rawA = Number(cur.A);
  const alpha01 = Number.isFinite(rawA)
    ? rawA > 1
      ? clamp01(rawA / 255)
      : clamp01(rawA)
    : 1;

  return {
    hex: bytesToHex(rByte, gByte, bByte),
    alpha01,
    useByteScale,
    currentObject: cur,
  };
}

function buildColorArgValueFromHex(hex, uiState, nextAlpha) {
  const parsed = parseHexColor(hex);
  if (!parsed) return uiState?.currentObject || {};

  const useByteScale = !!uiState?.useByteScale;
  const alpha01 = clamp01(
    typeof nextAlpha === 'number' && Number.isFinite(nextAlpha)
      ? nextAlpha
      : uiState?.alpha01 ?? 1
  );
  const base =
    uiState?.currentObject && typeof uiState.currentObject === 'object'
      ? uiState.currentObject
      : {};
  const toUnit = (byte) => Number((clampByte(byte) / 255).toFixed(6));

  return {
    ...base,
    R: useByteScale ? clampByte(parsed.rByte) : toUnit(parsed.rByte),
    G: useByteScale ? clampByte(parsed.gByte) : toUnit(parsed.gByte),
    B: useByteScale ? clampByte(parsed.bByte) : toUnit(parsed.bByte),
    A: useByteScale ? clampByte(alpha01 * 255) : Number(alpha01.toFixed(6)),
  };
}

/**
 * Widget bouton simple
 * - Un seul bouton
 * - PAS de label au-dessus (le champ "Label" sert au texte du bouton)
 * - Pastilles :
 *   - ÉDITION : à droite du bouton "Supprimer"
 *   - PRODUCTION : sous le bouton
 */
export default function ButtonWidget({
  label,
  color,
  disabled,
  showArguments,
  argDefs,
  argValues,
  onArgChange,
  canResetArgs,
  canSetDefaultArgs,
  onResetArgs,
  onSetDefaultArgs,
  onExecute,
  onDelete,
  onDuplicate,
  rightSlot,
  editMode
}) {
  const t = getWidgetT();
  const colorPickLabel = getColorPickLabel(t);
  const buttonText = (label || '').trim() || t('production.widgets.buttonLabel');
  const [argColorPicker, setArgColorPicker] = React.useState({
    open: false,
    name: '',
    hex: '#ffffff',
    alpha: 1,
    useByteScale: false,
  });
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (typeof onExecute === 'function') {
      onExecute();
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (typeof onDelete === 'function') {
      onDelete();
    }
  };

  const handleDuplicateClick = (e) => {
    e.stopPropagation();
    if (typeof onDuplicate === 'function') {
      onDuplicate();
    }
  };

  const handleResetArgs = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (typeof onResetArgs === 'function') {
      onResetArgs();
    }
  };

  const handleSetDefaultArgs = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (typeof onSetDefaultArgs === 'function') {
      onSetDefaultArgs();
    }
  };

  // Style du bouton via variables CSS
  const buttonStyle = {};
  if (color) {
    buttonStyle['--uu-button-bg'] = color;
    buttonStyle['--uu-button-border'] = color;
  }

  const argumentDefs = Array.isArray(argDefs) ? argDefs : [];
  const argumentValues =
    argValues && typeof argValues === 'object' ? argValues : {};

  return (
    <div className="uu-button-widget">
      {/* Bouton principal */}
      <div className="uu-row uu-align-center">
        <button
          type="button"
          className="uu-btn uu-btn-primary uu-button-widget-main"
          disabled={!!disabled}
          onClick={handleClick}
          style={buttonStyle}
        >
          {buttonText}
        </button>
      </div>

      {showArguments && argumentDefs.length > 0 && (
        <div
          className="uu-col mt-6 uu-button-widget-args"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {argumentDefs.map((arg, idx) => {
            const name = String(arg?.name || '').trim();
            if (!name) return null;

            const rawType = String(arg?.rawType || '').trim();
            const inputKind = String(arg?.kind || 'text').toLowerCase();
            const isInteger = !!arg?.integer;
            const isByte = !!arg?.isByte;
            const enumOptions = Array.isArray(arg?.enumOptions)
              ? arg.enumOptions
              : [];
            const current = argumentValues[name];

            const parseNumber = (raw) => {
              if (raw === '') return '';
              const num = Number(raw);
              if (!Number.isFinite(num)) return null;
              if (isByte) return Math.max(0, Math.min(255, Math.round(num)));
              if (isInteger) return Math.trunc(num);
              return num;
            };

            const renderNumberInput = (
              value,
              placeholder,
              onValueChange,
              extraClass = ''
            ) => (
              <input
                className={`uu-input uu-button-widget-arg-input ${extraClass}`.trim()}
                type="number"
                min={isByte ? 0 : undefined}
                max={isByte ? 255 : undefined}
                step={isInteger ? 1 : 'any'}
                placeholder={placeholder}
                value={
                  value === undefined || value === null ? '' : String(value)
                }
                onChange={(e) => {
                  const parsed = parseNumber(e.target.value);
                  if (parsed === null) return;
                  onValueChange(parsed);
                }}
              />
            );

            const labelNode = (
              <label className="uu-label uu-button-widget-arg-label">
                {name}
              </label>
            );

            if (inputKind === 'vector2d') {
              const cur = current && typeof current === 'object' ? current : {};
              return (
                <div key={`${name}-${idx}`} className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                  {labelNode}
                  {renderNumberInput(
                    cur.X,
                    'X',
                    (next) => onArgChange?.(name, { ...cur, X: next }),
                    'uu-button-widget-arg-small'
                  )}
                  {renderNumberInput(
                    cur.Y,
                    'Y',
                    (next) => onArgChange?.(name, { ...cur, Y: next }),
                    'uu-button-widget-arg-small'
                  )}
                </div>
              );
            }

            if (inputKind === 'vector3d') {
              const cur = current && typeof current === 'object' ? current : {};
              return (
                <div key={`${name}-${idx}`} className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                  {labelNode}
                  {renderNumberInput(
                    cur.X,
                    'X',
                    (next) => onArgChange?.(name, { ...cur, X: next }),
                    'uu-button-widget-arg-small'
                  )}
                  {renderNumberInput(
                    cur.Y,
                    'Y',
                    (next) => onArgChange?.(name, { ...cur, Y: next }),
                    'uu-button-widget-arg-small'
                  )}
                  {renderNumberInput(
                    cur.Z,
                    'Z',
                    (next) => onArgChange?.(name, { ...cur, Z: next }),
                    'uu-button-widget-arg-small'
                  )}
                </div>
              );
            }

            if (inputKind === 'rotator') {
              const cur = current && typeof current === 'object' ? current : {};
              return (
                <div key={`${name}-${idx}`} className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                  {labelNode}
                  {renderNumberInput(
                    cur.Pitch,
                    'Pitch',
                    (next) => onArgChange?.(name, { ...cur, Pitch: next }),
                    'uu-button-widget-arg-small'
                  )}
                  {renderNumberInput(
                    cur.Yaw,
                    'Yaw',
                    (next) => onArgChange?.(name, { ...cur, Yaw: next }),
                    'uu-button-widget-arg-small'
                  )}
                  {renderNumberInput(
                    cur.Roll,
                    'Roll',
                    (next) => onArgChange?.(name, { ...cur, Roll: next }),
                    'uu-button-widget-arg-small'
                  )}
                </div>
              );
            }

            if (inputKind === 'transform') {
              const cur = current && typeof current === 'object' ? current : {};
              const translation = cur.Translation || {};
              const rotation = cur.Rotation || {};
              const scale3d = cur.Scale3D || {};

              return (
                <div key={`${name}-${idx}`} className="uu-col uu-button-widget-arg-transform">
                  <div className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                    {labelNode}
                  </div>

                  <div className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                    <label className="uu-label uu-button-widget-arg-label">
                      {t('widgets.transform.location')}
                    </label>
                    {renderNumberInput(
                      translation.X,
                      'X',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Translation: { ...translation, X: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      translation.Y,
                      'Y',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Translation: { ...translation, Y: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      translation.Z,
                      'Z',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Translation: { ...translation, Z: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                  </div>

                  <div className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                    <label className="uu-label uu-button-widget-arg-label">
                      {t('widgets.transform.rotation')}
                    </label>
                    {renderNumberInput(
                      rotation.Roll,
                      'Roll',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Rotation: { ...rotation, Roll: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      rotation.Pitch,
                      'Pitch',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Rotation: { ...rotation, Pitch: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      rotation.Yaw,
                      'Yaw',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Rotation: { ...rotation, Yaw: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                  </div>

                  <div className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                    <label className="uu-label uu-button-widget-arg-label">
                      {t('widgets.transform.scale')}
                    </label>
                    {renderNumberInput(
                      scale3d.X,
                      'X',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Scale3D: { ...scale3d, X: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      scale3d.Y,
                      'Y',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Scale3D: { ...scale3d, Y: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                    {renderNumberInput(
                      scale3d.Z,
                      'Z',
                      (next) =>
                        onArgChange?.(name, {
                          ...cur,
                          Scale3D: { ...scale3d, Z: next }
                        }),
                      'uu-button-widget-arg-small'
                    )}
                  </div>
                </div>
              );
            }

            if (inputKind === 'color') {
              const uiState = resolveColorArgUiState(rawType, current);
              const showPicker =
                argColorPicker.open && argColorPicker.name === name;
              const activeHex = showPicker ? argColorPicker.hex : uiState.hex;
              const activeAlpha = showPicker ? argColorPicker.alpha : uiState.alpha01;
              return (
                <div
                  key={`${name}-${idx}`}
                  className="uu-row uu-row-nowrap uu-button-widget-arg-row uu-button-widget-arg-color-row"
                >
                  {labelNode}
                  <button
                    type="button"
                    className="uu-color-swatch uu-button-widget-arg-color-swatch"
                    style={buildButtonWidgetBackgroundStyle(activeHex)}
                    onClick={() =>
                      setArgColorPicker({
                        open: true,
                        name,
                        hex: uiState.hex,
                        alpha: uiState.alpha01,
                        useByteScale: uiState.useByteScale,
                      })
                    }
                    title={colorPickLabel}
                  />
                  <span className="uu-muted">{t('widgets.common.alpha')}</span>
                  <input
                    className="uu-input uu-input-alpha"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={Number.isFinite(activeAlpha) ? activeAlpha : ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed =
                        raw === '' ? 1 : Math.max(0, Math.min(1, Number(raw)));
                      const nextState = {
                        ...uiState,
                        alpha01: parsed,
                      };
                      onArgChange?.(
                        name,
                        buildColorArgValueFromHex(activeHex, nextState, parsed)
                      );
                      if (showPicker) {
                        setArgColorPicker((prev) =>
                          prev.name === name
                            ? { ...prev, alpha: parsed }
                            : prev
                        );
                      }
                    }}
                  />

                  {showPicker && (
                    <div className="uu-button-widget-arg-color-popover">
                      <ColorWheelPopover
                        hex={argColorPicker.hex}
                        alpha={argColorPicker.alpha}
                        onChange={(nextHex, nextAlpha) => {
                          const nextState = {
                            ...uiState,
                            alpha01: nextAlpha,
                            useByteScale: argColorPicker.useByteScale,
                          };
                          onArgChange?.(
                            name,
                            buildColorArgValueFromHex(nextHex, nextState, nextAlpha)
                          );
                          setArgColorPicker((prev) =>
                            prev.name === name
                              ? { ...prev, hex: nextHex, alpha: nextAlpha }
                              : prev
                          );
                        }}
                        onClose={() =>
                          setArgColorPicker({
                            open: false,
                            name: '',
                            hex: '#ffffff',
                            alpha: 1,
                            useByteScale: false,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            }

            if (inputKind === 'enum') {
              return (
                <div key={`${name}-${idx}`} className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                  {labelNode}
                  <select
                    className="uu-input uu-button-widget-arg-input"
                    value={
                      current === undefined || current === null
                        ? ''
                        : String(current)
                    }
                    onChange={(e) => onArgChange?.(name, e.target.value)}
                  >
                    {enumOptions.map((opt, optIdx) => (
                      <option key={`${name}-opt-${optIdx}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={`${name}-${idx}`} className="uu-row uu-row-nowrap uu-button-widget-arg-row">
                {labelNode}
                {inputKind === 'bool' ? (
                  <input
                    type="checkbox"
                    className="uu-checkbox-inline"
                    checked={!!current}
                    onChange={(e) =>
                      onArgChange?.(name, !!e.target.checked)
                    }
                  />
                ) : inputKind === 'number' ? (
                  renderNumberInput(current, '', (next) =>
                    onArgChange?.(name, next)
                  )
                ) : (
                  <input
                    className="uu-input uu-button-widget-arg-input"
                    type="text"
                    value={
                      current === undefined || current === null
                        ? ''
                        : String(current)
                    }
                    onChange={(e) => onArgChange?.(name, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCTION : pastilles sous le bouton */}
      {!editMode && (rightSlot || canResetArgs || canSetDefaultArgs) && (
        <div className="uu-row mt-4 uu-align-center">
          {canResetArgs && (
            <button
              className="uu-reset-btn"
              type="button"
              onClick={handleResetArgs}
              disabled={!!disabled}
              title={t('widgets.common.resetDefault')}
              aria-label={t('widgets.common.resetDefault')}
            >
              ⟲
            </button>
          )}

          {canSetDefaultArgs && (
            <button
              className="uu-reset-btn uu-set-default"
              type="button"
              onClick={handleSetDefaultArgs}
              disabled={!!disabled}
              title={t('widgets.common.setAsDefault')}
              aria-label={t('widgets.common.setAsDefault')}
            >
              ↓
            </button>
          )}

          {rightSlot}
        </div>
      )}

      {/* ÉDITION : Supprimer + pastilles à droite */}
      {editMode && (onDelete || onDuplicate) && (
        <div className="uu-row mt-4 uu-align-center">
          {onDuplicate && (
            <button
              type="button"
              className="uu-btn uu-btn-square"
              onClick={handleDuplicateClick}
              title={t('widgets.common.duplicateWidget')}
              aria-label={t('widgets.common.duplicateWidget')}
            >
              D
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className="uu-btn-delete"
              onClick={handleDeleteClick}
              title={t('widgets.common.deleteWidget')}
              aria-label={t('widgets.common.deleteWidget')}
            >
              ✕
            </button>
          )}

          {rightSlot && (
            <div className="uu-row-gap4">
              {rightSlot}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/**
 * Panneau d'édition (colonne de gauche) pour le widget Button.
 * - Sélection de la fonction WRC
 * - Couleur du bouton
 */
// Éditeur côté GAUCHE pour Button : couleur + snippets Companion
export function ButtonEditorLeft({ selected, updateSelected, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();

  const buttonColor =
    selected.ui?.buttonColor ||
    selected.ui?.color ||
    '#2563eb';
  const showArguments = !!selected.ui?.showArguments;

  const widgetId = selected.id;

  // URL de base de l'agent (127.0.0.1 ou serverIp, avec le bon port)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('ButtonEditorLeft: getCompanionBaseUrl failed', e);
  }


  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = widgetId
    ? `${baseUrl}/agent/ui/widgets/${encodeURIComponent(widgetId)}/press${layoutQuery}`
    : '';

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
      {/* Couleur du bouton */}
      <div className="uu-row mt-8">
        <label className="uu-label w-160">{t('widgets.button.colorLabel')}</label>
        <input
          type="color"
          className="uu-input-color"
          value={buttonColor}
          onChange={(e) => {
            const value = e.target.value;
            updateSelected({
              ui: {
                ...(selected.ui || {}),
                buttonColor: value,
                color: value,
              },
            });
          }}
        />
      </div>

      <div className="uu-row mt-8">
        <label className="uu-label w-160">{t('widgets.button.showArgumentsLabel')}</label>
        <input
          type="checkbox"
          checked={showArguments}
          onChange={(e) => {
            updateSelected({
              ui: {
                ...(selected.ui || {}),
                showArguments: !!e.target.checked
              }
            });
          }}
        />
      </div>

      {/* Snippets Companion */}
      {widgetId && (
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
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Éditeur de label pour le widget Button (colonne gauche)
export function ButtonLabelEditor({ selected, updateSelected }) {
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

