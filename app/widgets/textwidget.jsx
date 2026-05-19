// app/widgets/textwidget.jsx
import { useEffect, useRef } from 'react';
import './textwidget.css';
import BindingPicker from './bindingpicker.jsx';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';

/**
 * TextWidget
 * - Affiche le label (interne au widget)
 * - Champ texte / numérique
 * - Boutons Envoyer / Reset / Supprimer
 * - Slot rightSlot pour les pastilles machines
 */
export default function TextWidget({
  label,
  value,
  onChange,
  onCommit,
  disabled,
  onDelete,
  onDuplicate,
  valueType,
  defaultValue,
  rightSlot,
  editMode,
}) {
  
  const t = getWidgetT();

  const rawValue = value ?? '';

  // valueType vient de la normalisation du preset : 'text', 'int', 'float', etc.
  const vt = String(valueType || '').toLowerCase();
  const isByte =
    vt === 'byte' ||
    vt === 'uint8' ||
    vt.includes('byte') ||
    vt.includes('uint8');
  const isInt =
    vt === 'int' ||
    vt === 'integer' ||
    vt === 'int64' ||
    vt === 'integer64';
  const isFloat = vt === 'float' || vt === 'double';
  const isNumeric = isInt || isFloat || isByte;
  const isTextLike =
    vt === 'text' ||
    vt === 'string' ||
    vt === 'name' ||
    !isNumeric; // Name/String/Text ou autre
  
  const hasDefault =
    defaultValue !== undefined &&
    defaultValue !== null &&
    String(defaultValue).trim() !== '';
  const isAtDefault =
    hasDefault && String(rawValue) === String(defaultValue);
  const showReset = hasDefault && !isAtDefault;

  const placeholder = isTextLike
  ? t('widgets.common.textPlaceholder')
  : t('widgets.common.numericPlaceholder');

  const clampByte = (input) => {
    if (input === '' || input === null || input === undefined) return '';
    const n = Number(input);
    if (!Number.isFinite(n)) return '';
    return Math.max(0, Math.min(255, Math.round(n)));
  };

  const textRef = useRef(null);

  // Fonction utilitaire pour ajuster la hauteur du textarea
  const resizeTextarea = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Auto-resize quand la valeur change (parent, reset, valeur par défaut…)
  useEffect(() => {
    resizeTextarea();
  }, [rawValue, isTextLike]);

  const commit = () => {
    if (disabled) return;

    let final = rawValue;

    if (isNumeric) {
      const normalized = String(rawValue).replace(',', '.');
      const n = parseFloat(normalized);
      if (Number.isFinite(n)) {
        if (isByte) {
          final = String(clampByte(n));
        } else {
          final = isInt ? String(Math.round(n)) : String(n);
        }
      }
    }

    onCommit?.(final);
  };

  const handleChange = (e) => {
    const next = e.target.value;
    if (isByte) {
      if (next === '') {
        onChange?.('');
        return;
      }
      const clamped = clampByte(next);
      if (clamped === '') return;
      onChange?.(String(clamped));
      return;
    }

    onChange?.(next);

    // Ajuste immédiatement la hauteur pendant la frappe
    resizeTextarea();
  };

  const handleKeyDown = (e) => {
    if (isTextLike) {
      // Texte multi-ligne : Ctrl+Enter / Cmd+Enter = envoyer
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        commit();
      }
      return;
    }

    // Numérique : Enter = envoyer
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commit();
    }
  };

  const handleResetClick = (e) => {
    e.stopPropagation();
    if (!hasDefault) return;
    const next = defaultValue ?? '';
    onChange?.(String(next));
  };

  const handleSendClick = (e) => {
    e.stopPropagation();
    commit();
  };

  const handleDeleteClick = (e) => {
    if (!onDelete) return;
    e.stopPropagation();
    onDelete();
  };

  const handleDuplicateClick = (e) => {
    if (!onDuplicate) return;
    e.stopPropagation();
    onDuplicate();
  };

  const hasLabel = String(label || '').trim() !== '';

  const labelDisplay = hasLabel ? label : t('widgets.common.noLabel');
  const showTitleRow = hasLabel || (editMode && onDuplicate);
  const showInlineLiveLabel = !editMode && hasLabel;

  return (
    <div className="uu-text-widget">
      {!showInlineLiveLabel && showTitleRow && (
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

      {/* Ligne 1 : champ texte / numérique (même rendu) */}
        <div className={`mt-4${showInlineLiveLabel ? ' uu-text-widget-live-row' : ''}`}>
          {showInlineLiveLabel ? (
            <label className="uu-label uu-text-widget-live-label" title={label || ''}>
              {labelDisplay}
            </label>
          ) : null}
          <div className={showInlineLiveLabel ? 'uu-text-widget-live-input-wrap' : ''}>
          {isByte ? (
            <input
              className="uu-input uu-input-text-widget"
              type="number"
              min="0"
              max="255"
              step="1"
              placeholder={placeholder}
              value={
                rawValue === undefined || rawValue === null
                  ? ''
                  : String(rawValue)
              }
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={!!disabled}
            />
          ) : (
            <textarea
              ref={textRef}
              className="uu-input uu-input-textarea uu-input-text-widget"
              placeholder={placeholder}
              rows={1}
              value={rawValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={!!disabled}
            />
          )}
          </div>
        </div>

      {/* Ligne 2 : boutons + pastilles */}
      <div className="uu-row mt-2">
        {/* Envoyer en premier */}
        <button
          className="uu-btn uu-btn-primary"
          type="button"
          onClick={handleSendClick}
          disabled={!!disabled}
        >
          {t('widgets.common.send')}
        </button>

        {/* Reset uniquement si une valeur par défaut différente existe */}
        {showReset && (
          <button
            className="uu-reset-btn"
            type="button"
            onClick={handleResetClick}
            disabled={!!disabled}
            title={t('widgets.common.resetDefault')}
          >
            ↺
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

        {/* Pastilles machines : collées après le dernier bouton visible */}
        {rightSlot}
      </div>
    </div>
  );
}

// Éditeur colonne droite pour le widget Text
// - BindingPicker (propriété texte)
// - Champ "Valeur par défaut" qui alimente selected.defaultValue
//   et met aussi à jour la valeur courante pour que le bouton Reset fonctionne.
export function TextEditorRight({
  selected,
  presetData,
  updateBinding,
  updateSelected,
  setValues,
}) {
  if (!selected) return null;

  const defaultValue = selected.defaultValue ?? '';
  const defaultRef = useRef(null);
  
  const t = getWidgetT();
  const valueType = String(selected.binding?.valueType || '').toLowerCase();
  const isByte =
    valueType === 'byte' ||
    valueType === 'uint8' ||
    valueType.includes('byte') ||
    valueType.includes('uint8');

  const clampByte = (input) => {
    if (input === '' || input === null || input === undefined) return '';
    const n = Number(input);
    if (!Number.isFinite(n)) return '';
    return Math.max(0, Math.min(255, Math.round(n)));
  };

  // Auto-resize de la "valeur par défaut" quand elle change
  useEffect(() => {
    if (isByte) return;
    if (!defaultRef.current) return;
    const el = defaultRef.current;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [defaultValue, isByte]);

  const handleDefaultChange = (e) => {
    const next = e.target.value;

    if (isByte) {
      if (next === '') {
        updateSelected({ defaultValue: '' });
        if (setValues && selected.id) {
          setValues((prev) => ({
            ...prev,
            [selected.id]: ''
          }));
        }
        return;
      }
      const clamped = clampByte(next);
      if (clamped === '') return;
      const normalized = String(clamped);
      updateSelected({ defaultValue: normalized });
      if (setValues && selected.id) {
        setValues((prev) => ({
          ...prev,
          [selected.id]: normalized
        }));
      }
      return;
    }

    // On enregistre la nouvelle valeur par défaut dans le widget
    updateSelected({
      defaultValue: next,
    });

    // On force aussi la valeur courante sur cette valeur par défaut
    // pour que le bouton Reset du widget soit cohérent immédiatement.
    if (setValues && selected.id) {
      setValues((prev) => ({
        ...prev,
        [selected.id]: next,
      }));
    }
  };

  return (
    <>
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="text"
      />

      <div className="uu-row mt-8 uu-row-text-default">
        <label className="uu-label w-160">{t('widgets.common.defaultValueLabel')}</label>
        {isByte ? (
          <input
            className="uu-input"
            type="number"
            min="0"
            max="255"
            step="1"
            placeholder={t('widgets.common.optionalPlaceholder')}
            value={
              defaultValue === undefined || defaultValue === null
                ? ''
                : String(defaultValue)
            }
            onChange={handleDefaultChange}
          />
        ) : (
          <textarea
            ref={defaultRef}
            className="uu-input uu-input-textarea"
            placeholder={t('widgets.common.optionalPlaceholder')}
            rows={1}
            value={defaultValue}
            onChange={handleDefaultChange}
          />
        )}
      </div>
    </>
  );
}

// Éditeur de label pour le widget Text (colonne gauche)
export function TextLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const label = selected.label ?? '';
  const hasError = !label.trim();

  const t = getWidgetT();

  return (
    <div className="uu-row">
      <label
        className={`uu-label w-160 ${
          hasError ? 'uu-label-error' : ''
        }`}
      >
        {t('widgets.common.label')}
      </label>

      <input
        className="uu-input uu-input-label"
        value={label}
        onChange={(e) =>
          updateSelected({ label: e.target.value })
        }
      />
    </div>
  );
}

// Options spécifiques colonne gauche pour Text : snippets Companion
export function TextEditorLeftExtras({ selected /*, updateSelected */, layoutId = '' }) {
  if (!selected) return null;
  const t = getWidgetT();

  const widgetId = selected?.id;

  // Base URL pour Companion (IP du HUB si dispo)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('TextEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = widgetId
    ? `${baseUrl}/agent/ui/widgets/${encodeURIComponent(widgetId)}/press${layoutQuery}`
    : '';
  const exampleBody = '{"value":"Nouveau texte"}';

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

  if (!widgetId) return null;

  return (
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

