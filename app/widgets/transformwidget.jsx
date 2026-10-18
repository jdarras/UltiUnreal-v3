import React from 'react';
import './transformwidget.css';
import BindingPicker from './bindingpicker.jsx';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';
import { decimalsCount, isIntermediateNumeric, stepFromCaret } from "./numericFieldEditing";

export default function TransformWidget({
  widget,
  value,
  defaultValue,
  disabled = false,
  editMode = false,
  onSetDefault,
  onChange,
  onCommit,
  onDelete,
  onDuplicate,
  targetsSlot
}) {
  const t = getWidgetT();
  const w = widget || {};
  const label = w.label || 'Transform';
  const ui = w.ui || {};
  const isLive = ui.live === true;

  const fallbackDefault = {
    Location: { X: 0, Y: 0, Z: 0 },
    Rotation: { Pitch: 0, Yaw: 0, Roll: 0 },
    Scale3D: { X: 1, Y: 1, Z: 1 }
  };

  const explicitDefault =
    (defaultValue && typeof defaultValue === 'object' && defaultValue) ||
    (w.defaultValue && typeof w.defaultValue === 'object' && w.defaultValue) ||
    null;

  // On merge toujours avec le fallback pour éviter les champs manquants
  const baseDefault = {
    Location: { ...fallbackDefault.Location, ...(explicitDefault?.Location || {}) },
    Rotation: { ...fallbackDefault.Rotation, ...(explicitDefault?.Rotation || {}) },
    Scale3D: { ...fallbackDefault.Scale3D, ...(explicitDefault?.Scale3D || {}) },
  };
  const hasExplicitDefault = !!explicitDefault;

  const current = value || baseDefault;

  const loc = current.Location || baseDefault.Location;
  const rot = current.Rotation || baseDefault.Rotation;
  const scale = current.Scale3D || baseDefault.Scale3D;

  function parseNumber(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  const committed = {
    Location: {
      X: parseNumber(loc.X, baseDefault.Location.X),
      Y: parseNumber(loc.Y, baseDefault.Location.Y),
      Z: parseNumber(loc.Z, baseDefault.Location.Z),
    },
    Rotation: {
      Pitch: parseNumber(rot.Pitch, baseDefault.Rotation.Pitch),
      Yaw: parseNumber(rot.Yaw, baseDefault.Rotation.Yaw),
      Roll: parseNumber(rot.Roll, baseDefault.Rotation.Roll),
    },
    Scale3D: {
      X: parseNumber(scale.X, baseDefault.Scale3D.X),
      Y: parseNumber(scale.Y, baseDefault.Scale3D.Y),
      Z: parseNumber(scale.Z, baseDefault.Scale3D.Z),
    },
  };

  const numericFields = [
    ['Location', 'X'],
    ['Location', 'Y'],
    ['Location', 'Z'],
    ['Rotation', 'Pitch'],
    ['Rotation', 'Yaw'],
    ['Rotation', 'Roll'],
    ['Scale3D', 'X'],
    ['Scale3D', 'Y'],
    ['Scale3D', 'Z'],
  ];

  const fieldRefs = React.useRef({});
  const [fieldDrafts, setFieldDrafts] = React.useState(() => {
    const next = {};
    numericFields.forEach(([section, key]) => {
      next[`${section}.${key}`] = String(committed[section][key]);
    });
    return next;
  });

  React.useEffect(() => {
    setFieldDrafts((prev) => {
      const next = { ...prev };
      let changed = false;

      numericFields.forEach(([section, key]) => {
        const id = `${section}.${key}`;
        const el = fieldRefs.current[id];
        const focused = !!(el && document.activeElement === el);
        if (focused) return;

        const target = String(committed[section][key]);
        if (next[id] !== target) {
          next[id] = target;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- committed est recalculé à chaque rendu : les dépendances sont ses valeurs
  }, [
    committed.Location.X,
    committed.Location.Y,
    committed.Location.Z,
    committed.Rotation.Pitch,
    committed.Rotation.Yaw,
    committed.Rotation.Roll,
    committed.Scale3D.X,
    committed.Scale3D.Y,
    committed.Scale3D.Z,
  ]);

  function buildPayload(source) {
    const srcLoc = source.Location || {};
    const srcRot = source.Rotation || {};
    const srcScale = source.Scale3D || {};

    const loc = {
      X: parseNumber(srcLoc.X, baseDefault.Location.X),
      Y: parseNumber(srcLoc.Y, baseDefault.Location.Y),
      Z: parseNumber(srcLoc.Z, baseDefault.Location.Z)
    };

    const rot = {
      Pitch: parseNumber(srcRot.Pitch, baseDefault.Rotation.Pitch),
      Yaw: parseNumber(srcRot.Yaw, baseDefault.Rotation.Yaw),
      Roll: parseNumber(srcRot.Roll, baseDefault.Rotation.Roll)
    };

    const scale = {
      X: parseNumber(srcScale.X, baseDefault.Scale3D.X),
      Y: parseNumber(srcScale.Y, baseDefault.Scale3D.Y),
      Z: parseNumber(srcScale.Z, baseDefault.Scale3D.Z)
    };

    // Forme "interne" du widget (utilisée pour Reset, affichage, etc.)
    return {
      Location: loc,
      Rotation: rot,
      Scale3D: scale
    };
  }

  function eulerToQuaternion(rot) {
    // Rotator Unreal : Roll = X, Pitch = Y, Yaw = Z (en degrés) 
    const rollDeg = parseNumber(rot.Roll, baseDefault.Rotation.Roll);
    const pitchDeg = parseNumber(rot.Pitch, baseDefault.Rotation.Pitch);
    const yawDeg = parseNumber(rot.Yaw, baseDefault.Rotation.Yaw);

    const roll = (rollDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const yaw = (yawDeg * Math.PI) / 180;

    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);

    // Formule standard roll/pitch/yaw -> quaternion (w,x,y,z) 
    const w = cr * cp * cy + sr * sp * sy;
    const x = sr * cp * cy - cr * sp * sy;
    const y = cr * sp * cy + sr * cp * sy;
    const z = cr * cp * sy - sr * sp * cy;

    // Unreal FQuat = { X, Y, Z, W }
    return { X: x, Y: y, Z: z, W: w };
  }

  function buildUnrealTransform(source) {
    // Normalisation d'abord (nombres propres, valeurs par défaut appliquées)
    const normalized = buildPayload(source);

    const loc = normalized.Location || {};
    const rot = normalized.Rotation || {};
    const scale = normalized.Scale3D || {};

    const translation = {
      X: parseNumber(loc.X, baseDefault.Location.X),
      Y: parseNumber(loc.Y, baseDefault.Location.Y),
      Z: parseNumber(loc.Z, baseDefault.Location.Z)
    };

    const rotationQuat = eulerToQuaternion(rot);

    const scale3D = {
      X: parseNumber(scale.X, baseDefault.Scale3D.X),
      Y: parseNumber(scale.Y, baseDefault.Scale3D.Y),
      Z: parseNumber(scale.Z, baseDefault.Scale3D.Z)
    };

    // Vrai FTransform pour le Remote Control
    return {
      Translation: translation,
      Rotation: rotationQuat,
      Scale3D: scale3D
    };
  }

  function commitValue(source) {
    if (disabled || !onCommit) return;
    const payload = buildUnrealTransform(source);
    onCommit(payload);
  }

  const setFieldDraft = (section, key, value) => {
    const id = `${section}.${key}`;
    setFieldDrafts((prev) => {
      if (prev[id] === value) return prev;
      return { ...prev, [id]: value };
    });
  };

  const getCommittedFieldValue = (section, key) => {
    return committed?.[section]?.[key];
  };

  const parseDraftFieldNumber = (section, key) => {
    const id = `${section}.${key}`;
    const raw = String(fieldDrafts[id] || '').replace(',', '.');
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
    return getCommittedFieldValue(section, key);
  };

  const pushFieldNumeric = (section, key, fieldNumber) => {
    const next = {
      Location: {
        X: parseDraftFieldNumber('Location', 'X'),
        Y: parseDraftFieldNumber('Location', 'Y'),
        Z: parseDraftFieldNumber('Location', 'Z'),
      },
      Rotation: {
        Pitch: parseDraftFieldNumber('Rotation', 'Pitch'),
        Yaw: parseDraftFieldNumber('Rotation', 'Yaw'),
        Roll: parseDraftFieldNumber('Rotation', 'Roll'),
      },
      Scale3D: {
        X: parseDraftFieldNumber('Scale3D', 'X'),
        Y: parseDraftFieldNumber('Scale3D', 'Y'),
        Z: parseDraftFieldNumber('Scale3D', 'Z'),
      },
    };
    next[section][key] = fieldNumber;

    onChange?.(next);
    if (isLive) commitValue(next);
  };

  const handleFieldChange = (section, key) => (e) => {
    const raw = e.target.value;
    setFieldDraft(section, key, raw);
    if (isIntermediateNumeric(raw)) return;

    const normalized = String(raw || '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return;
    pushFieldNumeric(section, key, n);
  };

  const nudgeFieldAtCaret = (section, key, direction, caretPos) => {
    const id = `${section}.${key}`;
    const normalized = String(fieldDrafts[id] || '').replace(',', '.');
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

    setFieldDraft(section, key, nextRaw);
    pushFieldNumeric(section, key, normalizedNextNum);

    requestAnimationFrame(() => {
      const el = fieldRefs.current[id];
      if (!el || document.activeElement !== el) return;
      const p = Math.max(0, Math.min(Number(caretPos) || 0, nextRaw.length));
      el.setSelectionRange(p, p);
    });
  };

  const handleFieldKeyDown = (section, key) => (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const dir = e.key === 'ArrowUp' ? 1 : -1;
      const caret = e.currentTarget.selectionStart;
      nudgeFieldAtCaret(section, key, dir, caret);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleFieldBlur = (section, key) => () => {
    const id = `${section}.${key}`;
    const normalized = String(fieldDrafts[id] || '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) {
      setFieldDraft(section, key, String(getCommittedFieldValue(section, key)));
      return;
    }
    const normalizedNum = Object.is(n, -0) ? 0 : n;
    setFieldDraft(section, key, String(normalizedNum));
    pushFieldNumeric(section, key, normalizedNum);
  };

  const handleFieldWheel = (section, key) => (e) => {
    if (document.activeElement !== e.currentTarget) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const caret = e.currentTarget.selectionStart;
    nudgeFieldAtCaret(section, key, dir, caret);
  };

    function handleReset() {
    if (disabled) return;

    const base = {
      Location: { ...baseDefault.Location },
      Rotation: { ...baseDefault.Rotation },
      Scale3D: { ...baseDefault.Scale3D }
    };

    // On remet l’état interne
    onChange?.(base);
    // Reset doit TOUJOURS envoyer la valeur par défaut à Unreal,
    // même si le widget n’est pas en mode "live".
    commitValue(base);
  }

    function handleSend(e) {
    if (disabled) return;
    if (e && e.stopPropagation) e.stopPropagation();

    // On envoie la valeur courante (current)
    commitValue(current);
  }

  // --- Règle du bouton Reset : visible si différent des valeurs par défaut ---
  const normalizedCurrent = buildPayload(current);
  const normalizedDefault = buildPayload(baseDefault);

  const isAtDefault =
    normalizedCurrent.Location.X === normalizedDefault.Location.X &&
    normalizedCurrent.Location.Y === normalizedDefault.Location.Y &&
    normalizedCurrent.Location.Z === normalizedDefault.Location.Z &&
    normalizedCurrent.Rotation.Pitch === normalizedDefault.Rotation.Pitch &&
    normalizedCurrent.Rotation.Yaw === normalizedDefault.Rotation.Yaw &&
    normalizedCurrent.Rotation.Roll === normalizedDefault.Rotation.Roll &&
    normalizedCurrent.Scale3D.X === normalizedDefault.Scale3D.X &&
    normalizedCurrent.Scale3D.Y === normalizedDefault.Scale3D.Y &&
    normalizedCurrent.Scale3D.Z === normalizedDefault.Scale3D.Z;

  const transformCanReset = hasExplicitDefault && !isAtDefault;
  const canSetDefault = !disabled && (!hasExplicitDefault || !isAtDefault);

  function handleSetDefault() {
    if (disabled) return;
    const next = buildPayload(current);
    onSetDefault?.(next);
  }

  function renderRow(labelRow, section, fields) {
    return (
      <div className="uu-row mt-4 uu-transform-row">
        <span className="uu-muted uu-transform-label">{labelRow}</span>
        {fields.map(({ key, propKey }) => {
          const axisLabel = key;              // ce qu'on affiche : X / Y / Z
          const prop = propKey || key;        // clé réelle dans l'objet (Pitch/Yaw/Roll, etc.)
          const id = `${section}.${prop}`;
          const value =
            fieldDrafts[id] !== undefined
              ? fieldDrafts[id]
              : String(getCommittedFieldValue(section, prop));

          return (
            <React.Fragment key={`${section}-${prop}`}>
              <span className="uu-muted">{axisLabel}</span>
              <input
                ref={(el) => { fieldRefs.current[id] = el; }}
                type="text"
                inputMode="decimal"
                className="uu-input w-100"
                value={value}
                disabled={disabled}
                onChange={handleFieldChange(section, prop)}
                onBlur={handleFieldBlur(section, prop)}
                onKeyDown={handleFieldKeyDown(section, prop)}
                onWheel={handleFieldWheel(section, prop)}
              />
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="uu-transform-widget">
      <div className="uu-item-title-row">
        <div className="uu-item-title" title={label}>
          {label}
        </div>
        {editMode && onDuplicate && (
          <div className="uu-item-title-actions">
            <button
              type="button"
              className="uu-btn uu-btn-square"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title={t('widgets.common.duplicateWidget')}
              aria-label={t('widgets.common.duplicateWidget')}
            >
              D
            </button>
          </div>
        )}
      </div>

      {/* PLUS DE SOUS-TITRE ICI */}

      {renderRow(t('widgets.transform.location'), 'Location', [
        { key: 'X', propKey: 'X' },
        { key: 'Y', propKey: 'Y' },
        { key: 'Z', propKey: 'Z' },
      ])}

      {renderRow(t('widgets.transform.rotation'), 'Rotation', [
        // Unreal Rotator: Roll = X, Pitch = Y, Yaw = Z
        { key: 'X', propKey: 'Roll' },
        { key: 'Y', propKey: 'Pitch' },
        { key: 'Z', propKey: 'Yaw' },
      ])}

      {renderRow(t('widgets.transform.scale'), 'Scale3D', [
        { key: 'X', propKey: 'X' },
        { key: 'Y', propKey: 'Y' },
        { key: 'Z', propKey: 'Z' },
      ])}

      {/* Ligne du bas : Envoyer (si non live) + Reset (si modifié) + Supprimer (édition) + pastilles */}
      <div className="uu-row mt-8 uu-align-center">
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

        {transformCanReset && (
          <button
            className="uu-reset-btn"
            type="button"
            disabled={disabled}
            title={t('widgets.common.resetDefault')}
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
          >
            ⟲
          </button>
        )}

        {canSetDefault && (
          <button
            className="uu-reset-btn uu-set-default"
            type="button"
            disabled={disabled}
            title={t('widgets.transform.setAsDefault')}
            onClick={(e) => {
              e.stopPropagation();
              handleSetDefault();
            }}
          >
            ↓
          </button>
        )}

        {editMode && onDelete && (
          <button
            className="uu-btn-delete"
            type="button"
            title={t('widgets.common.deleteWidget')}
            aria-label={t('widgets.common.deleteWidget')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            ✕
          </button>
        )}

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

export function TransformWidgetEditorRight({
  selected,
  presetData,
  updateBinding,
  updateSelected,
}) {
  if (!selected) return null;

  const t = getWidgetT();

  // Valeurs par défaut brutes (peuvent être vides)
  const rawDefaults =
    selected.defaultValue && typeof selected.defaultValue === 'object'
      ? selected.defaultValue
      : {};
  const defaults = {
    Location: { ...(rawDefaults.Location || {}) },
    Rotation: { ...(rawDefaults.Rotation || {}) },
    Scale3D: { ...(rawDefaults.Scale3D || {}) },
  };

  const loc = defaults.Location || {};
  const rot = defaults.Rotation || {};
  const scale = defaults.Scale3D || {};

  const updateDefault = (section, key, fallback) => (e) => {
    const raw = e.target.value;
    const empty = raw === '';
    const n = Number(raw);
    const value = empty ? undefined : Number.isFinite(n) ? n : fallback;

    const next = {
      Location: {
        ...loc,
      },
      Rotation: {
        ...rot,
      },
      Scale3D: {
        ...scale,
      },
    };

    if (section === 'Location') {
      if (value === undefined) delete next.Location[key];
      else next.Location[key] = value;
    } else if (section === 'Rotation') {
      if (value === undefined) delete next.Rotation[key];
      else next.Rotation[key] = value;
    } else if (section === 'Scale3D') {
      if (value === undefined) delete next.Scale3D[key];
      else next.Scale3D[key] = value;
    }

    // Nettoyage des sections vides
    const clean = { ...next };
    ['Location', 'Rotation', 'Scale3D'].forEach((sec) => {
      if (clean[sec] && Object.keys(clean[sec]).length === 0) {
        delete clean[sec];
      }
    });

    const finalDefault =
      Object.keys(clean).length === 0 ? null : clean;

    updateSelected({ defaultValue: finalDefault });
  };

  return (
    <>
      {/* Choix Blueprint / propriété */}
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="transform"
      />

      <div className="uu-item-title mt-8">{t('widgets.common.defaultValuesTitle')}</div>

      {/* Location : Label principal + X / Y / Z sur une seule ligne */}
      <div className="uu-row mt-8 uu-transform-row">
        <label className="uu-label w-160">{t('widgets.transform.location')}</label>

        {['X', 'Y', 'Z'].map((axis) => (
          <React.Fragment key={`def-loc-${axis}`}>
            <span className="uu-muted">{axis}</span>
            <input
              type="number"
              className="uu-input w-80"
              value={
                loc[axis] === undefined || loc[axis] === null
                  ? ''
                  : loc[axis]
              }
              onChange={updateDefault('Location', axis, 0)}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Rotation : Label principal + X / Y / Z sur une seule ligne */}
      <div className="uu-row mt-4 uu-transform-row">
        <label className="uu-label w-160">{t('widgets.transform.rotation')}</label>

        {[
          { key: 'Pitch', label: 'X' },
          { key: 'Yaw', label: 'Y' },
          { key: 'Roll', label: 'Z' },
        ].map(({ key, label }) => (
          <React.Fragment key={`def-rot-${key}`}>
            <span className="uu-muted">{label}</span>
            <input
              type="number"
              className="uu-input w-80"
              value={
                rot[key] === undefined || rot[key] === null
                  ? ''
                  : rot[key]
              }
              onChange={updateDefault('Rotation', key, 0)}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Scale : Label principal + X / Y / Z sur une seule ligne */}
      <div className="uu-row mt-4 uu-transform-row">
        <label className="uu-label w-160">{t('widgets.transform.scale')}</label>

        {['X', 'Y', 'Z'].map((axis) => (
          <React.Fragment key={`def-scale-${axis}`}>
            <span className="uu-muted">{axis}</span>
            <input
              type="number"
              className="uu-input w-80"
              value={
                scale[axis] === undefined || scale[axis] === null
                  ? ''
                  : scale[axis]
              }
              onChange={updateDefault('Scale3D', axis, 1)}
            />
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export function TransformEditorLeftExtras({ selected, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();
  const widgetId = selected.id;

  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('TransformEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  if (!widgetId || !baseUrl) {
    return null;
  }

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = `${baseUrl}/agent/ui/widgets/${encodeURIComponent(
    widgetId
  )}/nudge${layoutQuery}`;

  const locStep = 10;    // delta Location
  const rotStep = 10;    // delta Rotation (degrés)
  const scaleStep = 0.1; // delta Scale

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

  const copyDelta = (field, delta) => {
    handleCopy(deltaBody(field, delta));
  };
  const deltaBody = (field, delta) => JSON.stringify({ [field]: delta });
  const scalePlusBody = JSON.stringify({
    dScaleX: scaleStep,
    dScaleY: scaleStep,
    dScaleZ: scaleStep
  });
  const scaleMinusBody = JSON.stringify({
    dScaleX: -scaleStep,
    dScaleY: -scaleStep,
    dScaleZ: -scaleStep
  });

  const exampleBodyString =
    '{"value":{"Location":{"X":140,"Y":-140,"Z":184.3},"Rotation":{"Roll":140,"Pitch":-140,"Yaw":140},"Scale3D":{"X":0.6,"Y":1.6,"Z":0.6}}}';

  return (
    <>
      {/* URL PUT */}
      <div className="uu-row mt-4">
        <label className="uu-label w-160">{t('widgets.companion.urlLabel')}</label>
        <div className="uu-col">
          <div className="uu-buttons-row">
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
      </div>

      <div className="uu-row mt-4">
        <label className="uu-label w-160">{t('widgets.companion.bodyLabel')}</label>
        <div className="uu-col">
          <div className="uu-buttons-row">
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
              onClick={() => handleCopy(exampleBodyString)}
              title={exampleBodyString}
            >
              {t('widgets.companion.example')}
            </button>
          </div>
        </div>
      </div>

      {/* Location : X+/X-/Y+/Y-/Z+/Z- */}
      <div className="uu-row mt-4">
        <label className="uu-label w-160">{t('widgets.transform.location')}</label>
        <div className="uu-col">
          <div className="uu-buttons-row">
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocX', locStep)}
              title={deltaBody('dLocX', locStep)}
            >
              X+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocX', -locStep)}
              title={deltaBody('dLocX', -locStep)}
            >
              X-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocY', locStep)}
              title={deltaBody('dLocY', locStep)}
            >
              Y+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocY', -locStep)}
              title={deltaBody('dLocY', -locStep)}
            >
              Y-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocZ', locStep)}
              title={deltaBody('dLocZ', locStep)}
            >
              Z+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dLocZ', -locStep)}
              title={deltaBody('dLocZ', -locStep)}
            >
              Z-
            </button>
          </div>
        </div>
      </div>

      {/* Rotation : X+/X-/Y+/Y-/Z+/Z- (X=Roll, Y=Pitch, Z=Yaw) */}
      <div className="uu-row mt-4">
        <label className="uu-label w-160">{t('widgets.transform.rotation')}</label>
        <div className="uu-col">
          <div className="uu-buttons-row">
            {/* X → Roll */}
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotRoll', rotStep)}
              title={deltaBody('dRotRoll', rotStep)}
            >
              X+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotRoll', -rotStep)}
              title={deltaBody('dRotRoll', -rotStep)}
            >
              X-
            </button>

            {/* Y → Pitch */}
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotPitch', rotStep)}
              title={deltaBody('dRotPitch', rotStep)}
            >
              Y+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotPitch', -rotStep)}
              title={deltaBody('dRotPitch', -rotStep)}
            >
              Y-
            </button>

            {/* Z → Yaw */}
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotYaw', rotStep)}
              title={deltaBody('dRotYaw', rotStep)}
            >
              Z+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dRotYaw', -rotStep)}
              title={deltaBody('dRotYaw', -rotStep)}
            >
              Z-
            </button>
          </div>
        </div>
      </div>

      {/* Scale : axes individuels + XYZ global */}
      <div className="uu-row mt-4">
        <label className="uu-label w-160">{t('widgets.transform.scale')}</label>
        <div className="uu-col">
          <div className="uu-buttons-row">
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleX', scaleStep)}
              title={deltaBody('dScaleX', scaleStep)}
            >
              X+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleX', -scaleStep)}
              title={deltaBody('dScaleX', -scaleStep)}
            >
              X-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleY', scaleStep)}
              title={deltaBody('dScaleY', scaleStep)}
            >
              Y+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleY', -scaleStep)}
              title={deltaBody('dScaleY', -scaleStep)}
            >
              Y-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleZ', scaleStep)}
              title={deltaBody('dScaleZ', scaleStep)}
            >
              Z+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => copyDelta('dScaleZ', -scaleStep)}
              title={deltaBody('dScaleZ', -scaleStep)}
            >
              Z-
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(scalePlusBody)}
              title={scalePlusBody}
            >
              Scale+
            </button>
            <button
              type="button"
              className="uu-btn-secondary"
              onClick={() => handleCopy(scaleMinusBody)}
              title={scaleMinusBody}
            >
              Scale-
            </button>
          </div>
        </div>
      </div>

    </>
  );
}

// Éditeur de label pour le widget Transform (colonne gauche)
export function TransformLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const t = getWidgetT();
  const label = selected.label ?? '';
  const hasError = !label.trim();

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

