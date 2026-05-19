// app/widgets/joystick.jsx
import { useRef, useState } from 'react';
import './joystickwidget.css';
import BindingPicker from './bindingpicker.jsx';
import { getCompanionBaseUrl } from '../utils/agent';
import { getLimitsTitleLabel } from './widgetI18n.js';
import { getWidgetT } from './widgetTranslator.js';

function buildJoystickKnobStyle(knobX, knobY) {
  return {
    left: `${knobX}%`,
    top: `${knobY}%`
  };
}

/**
 * JoystickWidget
 * - Label (optionnel, géré par le widget)
 * - Pad XY
 * - Valeurs X/Y affichées
 * - Bouton Reset (prod) si valeur par défaut définie
 * - Bouton Supprimer (édition)
 * - Pastilles via targetsSlot
 */
export default function JoystickWidget({
  label,
  showLabel = true,
  value,
  defaultValue,
  ui,
  onChange,
  onCommit,
  disabled,
  editMode,
  targetsSlot,
  onSetDefault,
  onDelete,
  onDuplicate
}) {
  const t = getWidgetT();

  const padRef = useRef(null);
  const [, setDragging] = useState(false);

  const lastCommitRef = useRef(0);
  const LIVE_THROTTLE_MS = 50; // tempo d'envoi en mode live (ms)

    // Plages X / Y configurables (ui.minX, ui.maxX, ui.minY, ui.maxY)
  const toNumberOr = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  let minX = toNumberOr(ui && ui.minX, -10);
  let maxX = toNumberOr(ui && ui.maxX, 10);
  let minY = toNumberOr(ui && ui.minY, -10);
  let maxY = toNumberOr(ui && ui.maxY, 10);

  const isLive = ui && ui.live === true;

  // Sécurisation : on corrige si l'utilisateur met min > max ou égal
  if (maxX < minX) {
    const tmp = minX;
    minX = maxX;
    maxX = tmp;
  }
  if (maxY < minY) {
    const tmp = minY;
    minY = maxY;
    maxY = tmp;
  }
  if (maxX === minX) {
    minX = -10;
    maxX = 10;
  }
  if (maxY === minY) {
    minY = -10;
    maxY = 10;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // Valeur par défaut (optionnelle)
  const rawDefVal = defaultValue && typeof defaultValue === 'object' ? defaultValue : null;
  const defXVal = Number(rawDefVal?.X);
  const defYVal = Number(rawDefVal?.Y);
  const defZVal = Number(rawDefVal?.Z);
  const hasDefault =
    (rawDefVal &&
      ((rawDefVal.X !== undefined &&
        rawDefVal.X !== null &&
        rawDefVal.X !== '' &&
        Number.isFinite(defXVal)) ||
        (rawDefVal.Y !== undefined &&
          rawDefVal.Y !== null &&
          rawDefVal.Y !== '' &&
          Number.isFinite(defYVal)))) ||
    false;

  const baseDefault = {
    X: hasDefault && Number.isFinite(defXVal) ? defXVal : 0,
    Y: hasDefault && Number.isFinite(defYVal) ? defYVal : 0,
    Z: hasDefault && Number.isFinite(defZVal) ? defZVal : 0
  };

  // Valeur courante : on retombe sur le défaut si aucune valeur
  const raw = value || {};
  const current = {
    X: typeof raw.X === 'number' ? raw.X : baseDefault.X,
    Y: typeof raw.Y === 'number' ? raw.Y : baseDefault.Y,
    Z: typeof raw.Z === 'number' ? raw.Z : baseDefault.Z
  };

  // Valeurs courantes dans la plage configurée
  const xVal = clamp(current.X, minX, maxX);
  const yVal = clamp(current.Y, minY, maxY);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Normalisation en [-1, 1] pour le dessin du knob
  const xNorm = ((xVal - minX) / rangeX) * 2 - 1;
  const yNorm = ((yVal - minY) / rangeY) * 2 - 1;

  // Position du knob dans le pad
  const knobX = 50 + xNorm * 40; // -1 -> 10%, 0 -> 50%, 1 -> 90%
  const knobY = 50 - yNorm * 40; // -1 -> 90%, 0 -> 50%, 1 -> 10%

    const emit = (next, doCommit = false) => {
    if (disabled) return;

    // On met à jour l'état local dans UltiUnreal
    onChange?.(next);

    // Envoi vers Unreal uniquement si demandé
    if (doCommit && onCommit) {
      onCommit(next);
    }
  };

    const updateFromEvent = (point, doCommit, forceCommit = false) => {
    if (disabled) return;

    const pad = padRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    let nx = (x / rect.width) * 2 - 1;
    let ny = -((y / rect.height) * 2 - 1);

    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    // On ramène [-1, 1] → [minX, maxX] et [minY, maxY]
    const tX = (nx + 1) / 2; // 0..1
    const tY = (ny + 1) / 2; // 0..1

    const next = {
      X: minX + tX * (maxX - minX),
      Y: minY + tY * (maxY - minY),
      Z: current.Z
    };

    // En mode live, on limite la fréquence des envois pour ne pas saturer
    let shouldCommit = false;

    if (doCommit) {
      if (forceCommit) {
        // On force l'envoi (ex : relâchement)
        shouldCommit = true;
        lastCommitRef.current = Date.now();
      } else {
        const now = Date.now();
        if (now - lastCommitRef.current >= LIVE_THROTTLE_MS) {
          shouldCommit = true;
          lastCommitRef.current = now;
        }
      }
    }

    emit(next, shouldCommit);
  };

 const handleDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const startPoint = e.touches ? e.touches[0] : e;
    setDragging(true);
    updateFromEvent(startPoint, isLive);

    const moveListener = (ev) => {
      const p = ev.touches ? ev.touches[0] : ev;
      updateFromEvent(p, isLive);
    };

    const upListener = (ev) => {
      const p = ev.changedTouches?.[0] || ev;
      updateFromEvent(p, isLive, true); // force le dernier commit si live
      setDragging(false);

      window.removeEventListener('mousemove', moveListener);
      window.removeEventListener('touchmove', moveListener);
      window.removeEventListener('mouseup', upListener);
      window.removeEventListener('touchend', upListener);
      window.removeEventListener('touchcancel', upListener);
    };

    window.addEventListener('mousemove', moveListener);
    window.addEventListener('touchmove', moveListener);
    window.addEventListener('mouseup', upListener);
    window.addEventListener('touchend', upListener);
    window.addEventListener('touchcancel', upListener);
  };

  // Gestion Reset (prod uniquement)
  const isAtDefault =
    hasDefault &&
    Number.isFinite(defXVal) &&
    Number.isFinite(defYVal) &&
    Math.abs(current.X - Number(defXVal)) < 1e-6 &&
    Math.abs(current.Y - Number(defYVal)) < 1e-6;

  const canReset = hasDefault && !isAtDefault;

    const handleReset = (e) => {
    e.stopPropagation();
    if (!hasDefault) return;
    const next = {
      X: clamp(baseDefault.X, minX, maxX),
      Y: clamp(baseDefault.Y, minY, maxY),
      Z: baseDefault.Z
    };
    emit(next, true);
  };

  const handleSend = (e) => {
    e.stopPropagation();
    if (disabled || !onCommit) return;

    const next = {
      X: xVal,
      Y: yVal,
      Z: current.Z
    };

    onCommit(next);
  };

  const handleSetDefault = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const next = { X: xVal, Y: yVal, Z: current.Z };
    onSetDefault?.(next);
  };

  // Supprimer
  const handleDelete = (e) => {
    e.stopPropagation();
    if (!onDelete) return;
    onDelete();
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (!onDuplicate) return;
    onDuplicate();
  };

  const hasLabelText = String(label || '').trim() !== '';
  const labelDisplay = hasLabelText ? label : t('widgets.common.noLabel');

  const showTitleRow =
    (showLabel && hasLabelText) || (editMode && onDuplicate);

  return (
    <div className="uu-joystick-widget">
      {showTitleRow && (
        <div className="uu-item-title-row">
          {showLabel && hasLabelText ? (
            <div className="uu-item-title" title={label || ''}>
              {labelDisplay}
            </div>
          ) : (
            <div className="uu-item-title-spacer" />
          )}
          {editMode && onDuplicate && (
            <div className="uu-item-title-actions">
              <button
                type="button"
                className="uu-btn uu-btn-square"
                onClick={handleDuplicate}
                title={t('widgets.common.duplicateWidget')}
                aria-label={t('widgets.common.duplicateWidget')}
              >
                D
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pad circulaire */}
      <div className="uu-joystick-row mt-4">
        <div
          ref={padRef}
          className="uu-joystick-pad"
          onMouseDown={handleDown}
          onTouchStart={handleDown}
        >
          <div className="uu-joystick-cross" />
          <div
            className="uu-joystick-knob"
            style={buildJoystickKnobStyle(knobX, knobY)}
          />
        </div>
      </div>

      {/* Valeurs X / Y sous le curseur */}
      <div className="uu-joystick-slider">
        <div className="uu-joystick-values">
          <span className="uu-joystick-label">X</span>
          <span>{xVal.toFixed(2)}</span>
        </div>
        <div className="uu-joystick-values">
          <span className="uu-joystick-label">Y</span>
          <span>{yVal.toFixed(2)}</span>
        </div>
      </div>

      {/* Ligne du bas : Envoyer (si non live) + Reset + Supprimer (édition) + pastilles */}
      <div className="uu-row mt-4 uu-align-center">
        {/* Bouton Envoyer uniquement si le mode "live" n'est pas activé */}
        {!isLive && (
          <button
            type="button"
            className="uu-btn uu-btn-primary uu-btn-sm"
            disabled={disabled}
            onClick={handleSend}
          >
            {t('widgets.common.send')}
          </button>
        )}

        {/* Reset : visible en prod ET en édition, si canReset */}
        {canReset && (
          <button
            type="button"
            className="uu-reset-btn"
            onClick={handleReset}
            disabled={disabled}
            title={t('widgets.common.resetDefault')}
          >
            ↺
          </button>
        )}

        {(!hasDefault || canReset) && (
          <button
            type="button"
            className="uu-reset-btn uu-set-default"
            onClick={handleSetDefault}
            disabled={disabled}
            title={t('widgets.common.setAsDefault')}
          >
            ↓
          </button>
        )}

        {/* Supprimer uniquement en mode édition */}
        {editMode && onDelete && (
          <button
            type="button"
            className="uu-btn-delete"
            onClick={handleDelete}
            title={t('widgets.common.deleteWidget')}
            aria-label={t('widgets.common.deleteWidget')}
          >
            ✕
          </button>
        )}

        {/* Pastilles viennent après le dernier bouton visible */}
        {targetsSlot && (
          <div
            className="uu-row uu-row-gap4"
          >
            {targetsSlot}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Colonne GAUCHE : options spécifiques Joystick
 * (Type de liaison Vector2D / Manuel)
 */
export function JoystickEditLeft({ widget, updateSelected, layoutId = '' }) {
  if (!widget) return null;

  const t = getWidgetT();

  const ui = widget?.ui || {};

  const minX = ui.minX ?? -10;
  const maxX = ui.maxX ?? 10;
  const minY = ui.minY ?? -10;
  const maxY = ui.maxY ?? 10;

  const linkType = ui.linkType || 'vector2d';

  function handleChangeLinkType(e) {
    const value = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        linkType: value,
      },
    });
  }

  // ----- Snippets Companion (colonne gauche, sous les cibles) -----
  const widgetId = widget.id;

  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('JoystickEditLeft: getCompanionBaseUrl failed', e);
  }

  const url =
    widgetId && baseUrl
      ? `${baseUrl}/agent/ui/widgets/${encodeURIComponent(widgetId)}/nudge${
          layoutId ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}` : ''
        }`
      : '';

  const rawDef = widget.defaultValue || {};
  const rawDefX = rawDef.X;
  const rawDefY = rawDef.Y;
  const defXNum = Number(rawDefX);
  const defYNum = Number(rawDefY);

  // Valeurs pour l'exemple (fallback médian si non renseigné)
  let defXExample = defXNum;
  let defYExample = defYNum;

  const mid = (a, b) =>
    Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : 0;

  if (!Number.isFinite(defXExample)) defXExample = mid(Number(minX), Number(maxX));
  if (!Number.isFinite(defYExample)) defYExample = mid(Number(minY), Number(maxY));

  const exampleBody = JSON.stringify({
    value: {
      X: defXExample,
      Y: defYExample,
    },
  });

  // Nudge simple : +/-1 sur X ou Y
  const stepX = 1;
  const stepY = 1;

  const bodyXPlus = JSON.stringify({ dx: stepX });
  const bodyXMinus = JSON.stringify({ dx: -stepX });
  const bodyYPlus = JSON.stringify({ dy: stepY });
  const bodyYMinus = JSON.stringify({ dy: -stepY });

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
      {/* Type de liaison (toujours en haut à gauche) */}
      <div className="uu-row uu-joystick-binding-row">
        <label className="uu-label w-160">
          {t('widgets.joystick.linkType')}
        </label>
        <select
          className="uu-input"
          value={linkType}
          onChange={handleChangeLinkType}
        >
          <option value="vector2d">
            {t('widgets.joystick.linkType.vector2d')}
          </option>
          <option value="manual">
            {t('widgets.joystick.linkType.manual')}
          </option>
        </select>
      </div>

      {/* Snippets Companion sous les cibles (colonne gauche) */}
      {widgetId && baseUrl && (
        <>
          <div className="uu-row">
            <label className="uu-label w-160">
              {t('widgets.companion.urlLabel')}
            </label>
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
            <label className="uu-label w-160">
              {t('widgets.companion.bodyLabel')}
            </label>
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
                onClick={() => handleCopy(bodyXPlus)}
                title={bodyXPlus}
              >
                X+
              </button>
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(bodyXMinus)}
                title={bodyXMinus}
              >
                X-
              </button>
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(bodyYPlus)}
                title={bodyYPlus}
              >
                Y+
              </button>
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(bodyYMinus)}
                title={bodyYMinus}
              >
                Y-
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
      )}
    </>
  );
}

/**
 * Colonne DROITE : valeurs par défaut X/Y du joystick
 * (pour activer le bouton Reset en prod)
 */
/**
 * Colonne DROITE : binding + valeurs par défaut du joystick
 * - Vector2D : 1 liaison XY
 * - Manuel   : 2 liaisons X / Y séparées
 */
export function JoystickEditorRight({
  selected,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const t = getWidgetT();
  const limitsTitle = getLimitsTitleLabel(t);

  const ui = selected.ui || {};
  const linkType = ui.linkType || 'vector2d';

// Valeurs affichées dans les champs (string ou nombre)
const minX = ui.minX ?? -10;
const maxX = ui.maxX ?? 10;
const minY = ui.minY ?? -10;
const maxY = ui.maxY ?? 10;

  // ----- Valeurs par défaut (pour le bouton Reset du widget) -----
  const rawDef =
    selected.defaultValue && typeof selected.defaultValue === 'object'
      ? selected.defaultValue
      : {};

  const rawDefX = rawDef.X;
  const rawDefY = rawDef.Y;
  const rawDefZ = rawDef.Z;

  const defX =
    rawDef.X === undefined || rawDef.X === null
      ? ''
      : Number.isFinite(Number(rawDef.X))
      ? Number(rawDef.X)
      : '';
  const defY =
    rawDef.Y === undefined || rawDef.Y === null
      ? ''
      : Number.isFinite(Number(rawDef.Y))
      ? Number(rawDef.Y)
      : '';
  // Valeurs d'affichage dans les inputs (permet de distinguer vide vs 0)
  const defXDisplay = defX;
  const defYDisplay = defY;

  const handleChangeAxisDefault = (axis) => (e) => {
    const raw = e.target.value;
    const empty = raw === '';
    const n = Number(raw);
    const value = empty ? undefined : Number.isFinite(n) ? n : 0;

    const nextDefault = {
      X: axis === 'X' ? value : rawDefX,
      Y: axis === 'Y' ? value : rawDefY,
      Z: rawDefZ
    };

    // Nettoyage : enlever les champs undefined / vides
    Object.keys(nextDefault).forEach((k) => {
      if (nextDefault[k] === undefined || nextDefault[k] === '') {
        delete nextDefault[k];
      }
    });

    const hasXY =
      nextDefault.X !== undefined ||
      nextDefault.Y !== undefined;

    const finalDefault = hasXY ? nextDefault : null;

    updateSelected({
      defaultValue: finalDefault
    });
  };

    const handleChangeLimit = (axis, kind) => (e) => {
  const raw = e.target.value;

  const key =
    axis === 'X'
      ? kind === 'min'
        ? 'minX'
        : 'maxX'
      : kind === 'min'
      ? 'minY'
      : 'maxY';

  updateSelected({
    ui: {
      ...ui,
      [key]: raw   // on garde la string telle quelle (ex: "-", "12.5")
    }
  });
};

  // ----- Bindings pour le mode "Manuel" -----
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
        {/* Partie Binding */}
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

        <div className="uu-item-title mt-8">
          {limitsTitle}
        </div>

        {/* Plage X / Y : min / max */}
        <div className="uu-row uu-row-gap4">
          <label className="uu-label w-160">
            {t('widgets.joystick.rangeXLabel')}
          </label>

          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={t('widgets.joystick.placeholder.xMin')}
            value={minX}
            onChange={handleChangeLimit('X', 'min')}
          />

          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={t('widgets.joystick.placeholder.xMax')}
            value={maxX}
            onChange={handleChangeLimit('X', 'max')}
          />
        </div>

        <div className="uu-row mt-4">
          <label className="uu-label w-160">
            {t('widgets.joystick.rangeYLabel')}
          </label>

          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={t('widgets.joystick.placeholder.yMin')}
            value={minY}
            onChange={handleChangeLimit('Y', 'min')}
          />

          <input
            className="uu-input uu-input-arg"
            type="number"
            placeholder={t('widgets.joystick.placeholder.yMax')}
            value={maxY}
            onChange={handleChangeLimit('Y', 'max')}
          />
        </div>

        {/* Partie valeurs par défaut (tout en bas) */}
        <div className="uu-item-title mt-8">{t('widgets.common.defaultValuesTitle')}</div>

        <div className="uu-row">
          <label className="uu-label w-160">
            {t('widgets.joystick.defaultXYLabel')}
          </label>

          <input
            className="uu-input uu-input-arg"
            type="number"
          placeholder=""
          value={defXDisplay}
          onChange={handleChangeAxisDefault('X')}
        />

        <input
          className="uu-input uu-input-arg"
          type="number"
          placeholder=""
          value={defYDisplay}
          onChange={handleChangeAxisDefault('Y')}
        />
        </div>

      </div>
    );
}

/**
 * Colonne GAUCHE : édition du label du joystick
 */
export function JoystickLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const label = selected.label ?? '';
  const hasError = !label.trim();

  const ui = selected.ui || {};
  const live = ui.live === true;
  const t = getWidgetT();

  return (
    <>
      {/* Ligne du label */}
      <div className="uu-row uu-joystick-binding-row">
        <label
          className={`uu-label w-160 ${hasError ? 'uu-label-error' : ''}`}
        >
          {t('widgets.common.label')}
        </label>

        <input
          className="uu-input uu-input-label"
          value={label}
          onChange={(e) => updateSelected({ label: e.target.value })}
        />
      </div>

      {/* Option : Envoyer en direct (colonne gauche, sous le label) */}
      <div className="uu-row mt-4">
        <label className="uu-label w-160">
          {t('widgets.joystick.liveSendLabel')}
        </label>

        <input
          type="checkbox"
          className="uu-checkbox-inline"
          checked={live}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                live: e.target.checked
              }
            })
          }
        />
      </div>
    </>
  );
}

