// app/widgets/vectorwidget.jsx
import React from 'react';
import './vectorwidget.css';
import { getCompanionBaseUrl } from '../utils/agent';
import { getVectorDefaultsTitleLabel, getValuesLabel } from './widgetI18n.js';
import { getWidgetT } from './widgetTranslator.js';
import { decimalsCount, isIntermediateNumeric, stepFromCaret } from "./numericFieldEditing";

/**
 * VectorWidget
 *  - Affiche le label du widget
 *  - 3 champs X / Y / Z
 *  - Boutons Envoyer + Reset
 *  - Bouton Supprimer (édition uniquement)
 *  - Pastilles machines en bas, à côté de "Envoyer"
 */
export default function VectorWidget({
  widget,
  value,
  disabled,
  editMode,
  onSetDefault,
  onChange,
  onCommit,
  onDelete,
  onDuplicate,
  rightSlot
}) {
  const t = getWidgetT();
  const ui = widget?.ui || {};
  const isLive = ui.live === true;

  const parseNumber = (raw, fallback = 0) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  // Valeurs par défaut (colonne de droite du menu édition)
  const dv = widget?.defaultValue || {};
  const defX = dv.X !== undefined
    ? parseNumber(dv.X)
    : ui.defaultX !== undefined && ui.defaultX !== ''
    ? parseNumber(ui.defaultX)
    : 0;
  const defY = dv.Y !== undefined
    ? parseNumber(dv.Y)
    : ui.defaultY !== undefined && ui.defaultY !== ''
    ? parseNumber(ui.defaultY)
    : 0;
  const defZ = dv.Z !== undefined
    ? parseNumber(dv.Z)
    : ui.defaultZ !== undefined && ui.defaultZ !== ''
    ? parseNumber(ui.defaultZ)
    : 0;

  // Valeur courante du widget (state production)
  const current = value && typeof value === 'object' ? value : {};
  const curX = current.X !== undefined ? parseNumber(current.X, defX) : defX;
  const curY = current.Y !== undefined ? parseNumber(current.Y, defY) : defY;
  const curZ = current.Z !== undefined ? parseNumber(current.Z, defZ) : defZ;

  const axisRefs = React.useRef({ X: null, Y: null, Z: null });
  const [axisDrafts, setAxisDrafts] = React.useState(() => ({
    X: String(curX),
    Y: String(curY),
    Z: String(curZ),
  }));

  React.useEffect(() => {
    setAxisDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      const targets = {
        X: String(curX),
        Y: String(curY),
        Z: String(curZ),
      };

      for (const axis of ['X', 'Y', 'Z']) {
        const el = axisRefs.current[axis];
        const focused = !!(el && document.activeElement === el);
        if (focused) continue;
        if (next[axis] !== targets[axis]) {
          next[axis] = targets[axis];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [curX, curY, curZ]);

  const hasExplicitDefaultX = dv.X !== undefined || (ui.defaultX !== undefined && ui.defaultX !== '');
  const hasExplicitDefaultY = dv.Y !== undefined || (ui.defaultY !== undefined && ui.defaultY !== '');
  const hasExplicitDefaultZ = dv.Z !== undefined || (ui.defaultZ !== undefined && ui.defaultZ !== '');
  const hasExplicitDefault =
    hasExplicitDefaultX || hasExplicitDefaultY || hasExplicitDefaultZ;

  const isAtDefault =
    curX === defX &&
    curY === defY &&
    curZ === defZ;

  const canReset = hasExplicitDefault && !isAtDefault;

  const getCommittedAxisValue = (axis) => {
    if (axis === 'X') return curX;
    if (axis === 'Y') return curY;
    return curZ;
  };

  const parseDraftAxisNumber = (axis) => {
    const raw = String(axisDrafts[axis] || '').replace(',', '.');
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
    return getCommittedAxisValue(axis);
  };

  const setAxisDraft = (axis, value) => {
    setAxisDrafts((prev) => {
      if (prev[axis] === value) return prev;
      return { ...prev, [axis]: value };
    });
  };

  const pushAxisNumeric = (axis, axisNumber) => {
    const next = {
      X: axis === 'X' ? axisNumber : parseDraftAxisNumber('X'),
      Y: axis === 'Y' ? axisNumber : parseDraftAxisNumber('Y'),
      Z: axis === 'Z' ? axisNumber : parseDraftAxisNumber('Z')
    };
    onChange?.(next);
    if (isLive) onCommit?.(next);
  };

  const handleAxisDraftChange = (axis) => (e) => {
    const raw = e.target.value;
    setAxisDraft(axis, raw);
    if (isIntermediateNumeric(raw)) return;
    const normalized = String(raw || '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return;
    pushAxisNumeric(axis, n);
  };

  const nudgeAxisAtCaret = (axis, direction, caretPos) => {
    const normalized = String(axisDrafts[axis] || '').replace(',', '.');
    const base = Number(normalized);
    if (!Number.isFinite(base)) return;

    const step = stepFromCaret(normalized, caretPos);
    if (!Number.isFinite(step) || step <= 0) return;

    const precision = Math.min(
      6,
      Math.max(decimalsCount(normalized), decimalsCount(step))
    );
    const nextNum = Number((base + direction * step).toFixed(precision));
    const normalizedNextNum = Object.is(nextNum, -0) ? 0 : nextNum;
    const nextRaw = String(normalizedNextNum);

    setAxisDraft(axis, nextRaw);
    pushAxisNumeric(axis, normalizedNextNum);

    requestAnimationFrame(() => {
      const el = axisRefs.current[axis];
      if (!el || document.activeElement !== el) return;
      const p = Math.max(0, Math.min(Number(caretPos) || 0, nextRaw.length));
      el.setSelectionRange(p, p);
    });
  };

  const handleAxisKeyDown = (axis) => (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      const caret = e.currentTarget.selectionStart;
      nudgeAxisAtCaret(axis, dir, caret);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleAxisBlur = (axis) => () => {
    const draft = axisDrafts[axis];
    const normalized = String(draft || '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) {
      setAxisDraft(axis, String(getCommittedAxisValue(axis)));
      return;
    }
    const normalizedNum = Object.is(n, -0) ? 0 : n;
    setAxisDraft(axis, String(normalizedNum));
    pushAxisNumeric(axis, normalizedNum);
  };

  const handleAxisWheel = (axis) => (e) => {
    if (document.activeElement !== e.currentTarget) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const caret = e.currentTarget.selectionStart;
    nudgeAxisAtCaret(axis, dir, caret);
  };

  const handleSend = (e) => {
    e.stopPropagation();
    if (!onCommit || disabled) return;

    const next = {
      X: curX,
      Y: curY,
      Z: curZ
    };
    onCommit(next);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (disabled) return;

    const next = {
      X: defX,
      Y: defY,
      Z: defZ
    };

    onChange?.(next);
    onCommit?.(next);
  };

  const handleSetDefault = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const next = { X: curX, Y: curY, Z: curZ };
    onSetDefault?.(next);
  };

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

  const rawLabel = widget?.label || '';
  const hasLabel = rawLabel.trim() !== '';
  const labelDisplay = hasLabel ? rawLabel : t('widgets.common.noLabel');

  const showTitleRow = hasLabel || (editMode && onDuplicate);

  return (
    <div className="uu-vector">
      {showTitleRow && (
        <div className="uu-item-title-row">
          <div className="uu-item-title" title={rawLabel}>
            {labelDisplay}
          </div>
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

      {/* Lignes X / Y / Z */}
      <div className="uu-row mt-4 uu-align-center">
        <span className="uu-muted w-80">X</span>
        <input
          ref={(el) => { axisRefs.current.X = el; }}
          type="text"
          inputMode="decimal"
          className="uu-input uu-input-arg"
          value={axisDrafts.X}
          onChange={handleAxisDraftChange('X')}
          onBlur={handleAxisBlur('X')}
          onKeyDown={handleAxisKeyDown('X')}
          onWheel={handleAxisWheel('X')}
          disabled={disabled}
        />

        <span className="uu-muted w-80">Y</span>
        <input
          ref={(el) => { axisRefs.current.Y = el; }}
          type="text"
          inputMode="decimal"
          className="uu-input uu-input-arg"
          value={axisDrafts.Y}
          onChange={handleAxisDraftChange('Y')}
          onBlur={handleAxisBlur('Y')}
          onKeyDown={handleAxisKeyDown('Y')}
          onWheel={handleAxisWheel('Y')}
          disabled={disabled}
        />

        <span className="uu-muted w-80">Z</span>
        <input
          ref={(el) => { axisRefs.current.Z = el; }}
          type="text"
          inputMode="decimal"
          className="uu-input uu-input-arg"
          value={axisDrafts.Z}
          onChange={handleAxisDraftChange('Z')}
          onBlur={handleAxisBlur('Z')}
          onKeyDown={handleAxisKeyDown('Z')}
          onWheel={handleAxisWheel('Z')}
          disabled={disabled}
        />
      </div>

          {/* Ligne du bas : Envoyer (si non live) + Reset + Supprimer (édition) + pastilles */}
          <div className="uu-row mt-4 uu-align-center">
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

            {canReset && (
              <button
                type="button"
                className="uu-reset-btn"
                disabled={disabled}
                onClick={handleReset}
                title={t('widgets.common.resetDefault')}
              >
                ↺
              </button>
            )}

            {(!disabled && (!hasExplicitDefault || canReset)) && (
              <button
                type="button"
                className="uu-reset-btn uu-set-default"
                disabled={disabled}
                onClick={handleSetDefault}
                title={t('widgets.common.setAsDefault')}
              >
                ↓
              </button>
            )}

            {/* Bouton Supprimer uniquement en mode édition */}
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

            {/* Pastilles en bas, à côté des boutons */}
            {rightSlot && (
              <div
                className="uu-row uu-row-gap4"
              >
                {rightSlot}
              </div>
            )}
          </div>
     </div>
    );
}

/**
 * Panneau d’édition (colonne de droite) pour Vector
 *  - Valeurs par défaut X / Y / Z
 */
export function VectorEditorRight({ selected, updateSelected }) {
  if (!selected) return null;

  const t = getWidgetT();
  const vectorDefaultsTitle = getVectorDefaultsTitleLabel(t);
  const ui = selected.ui || {};

  const handleDefaultChange = (axis) => (e) => {
    const raw = e.target.value;

    let nextValue;
    if (raw === '') {
      nextValue = '';
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        nextValue = n;
      } else {
        // On garde l’ancienne valeur si la saisie est invalide
        nextValue = ui[`default${axis}`] ?? 0;
      }
    }

    // mise à jour des valeurs par défaut côté UI
    const nextUi = {
      ui: {
        ...ui,
        [`default${axis}`]: nextValue,
      },
    };

    // mise à jour des valeurs par défaut persistées (defaultValue)
    const axisKey = axis;
    const prevDefaults =
      (selected.defaultValue && typeof selected.defaultValue === 'object'
        ? selected.defaultValue
        : {}) || {};
    const nextDefaults = { ...prevDefaults };

    if (raw === '') {
      delete nextDefaults[axisKey];
    } else if (Number.isFinite(Number(raw))) {
      nextDefaults[axisKey] = Number(raw);
    }

    const hasDefaults = Object.keys(nextDefaults).length > 0;

    updateSelected({
      ...nextUi,
      defaultValue: hasDefaults ? nextDefaults : undefined,
    });
  };

  return (
    <div className="uu-list prod-editor-right-vector">
      <div className="uu-item-title">{vectorDefaultsTitle}</div>

      {/* Une seule ligne : label principal + X / Y / Z */}
      <div className="uu-row mt-4 uu-vector-editor-row">
        <label className="uu-label w-160">{getValuesLabel(getWidgetT())}</label>

        <span className="uu-muted">X</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-vector-editor-input"
          value={ui.defaultX ?? ''}
          onChange={handleDefaultChange('X')}
        />

        <span className="uu-muted">Y</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-vector-editor-input"
          value={ui.defaultY ?? ''}
          onChange={handleDefaultChange('Y')}
        />

        <span className="uu-muted">Z</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-vector-editor-input"
          value={ui.defaultZ ?? ''}
          onChange={handleDefaultChange('Z')}
        />
      </div>
    </div>
  );
}

// -----------------------------------------
// Options spécifiques (colonne de gauche)
//  -> Snippets Companion pour Vector
// -----------------------------------------
export function VectorEditorLeftExtras({ selected, updateSelected: _updateSelected, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();
  const ui = selected.ui || {};

  const parseNumber = (raw, fallback = 0) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const defX =
    ui.defaultX !== undefined && ui.defaultX !== ''
      ? parseNumber(ui.defaultX)
      : 0;
  const defY =
    ui.defaultY !== undefined && ui.defaultY !== ''
      ? parseNumber(ui.defaultY)
      : 0;
  const defZ =
    ui.defaultZ !== undefined && ui.defaultZ !== ''
      ? parseNumber(ui.defaultZ)
      : 0;

  const widgetId = selected.id;

  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('VectorEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  if (!widgetId || !baseUrl) return null;

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const urlNudge = `${baseUrl}/agent/ui/widgets/${encodeURIComponent(
    widgetId
  )}/nudge${layoutQuery}`;

  // Bodies pour /nudge (incrément / décrément)
  const nudgeStep = 1;
  const bodyDXPlus = JSON.stringify({ dX: nudgeStep });
  const bodyDXMinus = JSON.stringify({ dX: -nudgeStep });
  const bodyDYPlus = JSON.stringify({ dY: nudgeStep });
  const bodyDYMinus = JSON.stringify({ dY: -nudgeStep });
  const bodyDZPlus = JSON.stringify({ dZ: nudgeStep });
  const bodyDZMinus = JSON.stringify({ dZ: -nudgeStep });
  const exampleBodyNudge = JSON.stringify({
    value: {
      X: defX,
      Y: defY,
      Z: defZ,
    },
  });

  const handleCopy = (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        console.warn('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy Companion snippet', err);
    }
  };

  return (
    <>
      {/* URLs Companion */}
      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.companion.urlLabel')}</label>
        <div className="uu-value uu-buttons-row">
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy(urlNudge)}
            title={urlNudge}
          >
            {t('widgets.companion.copy')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.companion.bodyLabel')}</label>
        <div className="uu-value uu-vector-body-buttons">
          <div className="uu-buttons-row uu-vector-body-row-main">
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
              onClick={() => handleCopy(exampleBodyNudge)}
              title={exampleBodyNudge}
            >
              {t('widgets.companion.example')}
            </button>
          </div>

          <div className="uu-buttons-row uu-vector-body-row-axis">
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDXPlus)}
              title={bodyDXPlus}
            >
              X+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDXMinus)}
              title={bodyDXMinus}
            >
              X-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDYPlus)}
              title={bodyDYPlus}
            >
              Y+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDYMinus)}
              title={bodyDYMinus}
            >
              Y-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDZPlus)}
              title={bodyDZPlus}
            >
              Z+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(bodyDZMinus)}
              title={bodyDZMinus}
            >
              Z-
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------
// Éditeur de label (colonne de gauche)
// -----------------------------------------
export function VectorLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const label = selected.label ?? '';
  const hasError = !label.trim();

  const t = getWidgetT();
  const ui = selected.ui || {};
  const live = ui.live === true;

  return (
    <>
      {/* Ligne du label */}
      <div className="uu-row">
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

