// app/widgets/dropdownwidget.jsx
import { useEffect, useMemo, useState } from 'react';
import './dropdownwidget.css';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';

/**
 * DropdownWidget
 *  - visuel dans la carte (prod + édition)
 *  - gère : label, select, Envoyer, Reset, Supprimer, pastilles (rightSlot)
 *
 * Props :
 *  - label
 *  - value           : valeur courante (string)
 *  - defaultValue    : valeur par défaut (string, optionnel)
 *  - options         : [{ label, value }]
 *  - disabled        : bool (editMode, binding KO, etc.)
 *  - editMode        : bool
 *  - onChange(v)     : maj valeur locale (state widget)
 *  - onCommit(v)     : envoi vers Unreal
 *  - onDelete()      : supprime le widget (édition)
 *  - rightSlot       : pastilles machines, etc.
 */
export default function DropdownWidget({
  label,
  value,
  defaultValue,
  options,
  valueType,
  disabled,
  editMode,
  onChange,
  onCommit,
  onDelete,
  onDuplicate,
  rightSlot
}) {

  const t = getWidgetT();
  const vt = String(valueType || '').toLowerCase();
  const isByte =
    vt === 'byte' ||
    vt === 'uint8' ||
    vt.includes('byte') ||
    vt.includes('uint8');

  const clampByte = (input) => {
    if (input === '' || input === null || input === undefined) return '';
    const n = Number(input);
    if (!Number.isFinite(n)) return '';
    return String(Math.max(0, Math.min(255, Math.round(n))));
  };

  // Normalisation des options
  const normalizedOptions = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    if (!base.length) {
      return [
        {
          label: 'Option 1',
          value: 'Option 1'
        }
      ];
    }

    return base.map((opt, idx) => {
      const lbl =
        String(opt.label ?? '').trim() || `Option ${idx + 1}`;
      const val =
        String(opt.value ?? '').trim() || lbl;
      return { label: lbl, value: val };
    });
  }, [options]);

  // Choix d'une valeur "safe" si value / defaultValue n'existent pas
  const [localValue, setLocalValue] = useState(() => {
    const first = normalizedOptions[0]?.value ?? '';
    let next = '';
    if (value !== undefined && value !== null && value !== '') {
      next = isByte ? clampByte(value) : String(value);
    } else if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
      next = isByte ? clampByte(defaultValue) : String(defaultValue);
    }

    if (!next) {
      next = isByte ? clampByte(first) : String(first);
    }

    return next;
  });

  // Quand value / defaultValue / options changent, on recalcule
  useEffect(() => {
    const first = normalizedOptions[0]?.value ?? '';

    let next = value;
    if (next === undefined || next === null) {
      next = defaultValue !== undefined && defaultValue !== null
        ? defaultValue
        : first;
    }

    if (next === undefined || next === null) {
      next = '';
    }

    next = String(next);

    if (isByte) {
      const normalized = clampByte(next);
      if (normalized) {
        next = normalized;
      } else {
        const fallback = normalizedOptions[0]?.value ?? '';
        next = clampByte(fallback);
      }
    }

    // Si la valeur n'existe plus dans les options, on retombe sur la première
    const exists = normalizedOptions.some((o) => o.value === next);
    if (!exists && normalizedOptions.length > 0) {
      const fallback = normalizedOptions[0].value;
      next = isByte ? (clampByte(fallback) || '') : fallback;
    }

    setLocalValue(next);
  }, [value, defaultValue, normalizedOptions, isByte]);

  const hasDefault = defaultValue !== undefined && defaultValue !== null;
  const hasChangedFromDefault =
    hasDefault && String(localValue) !== String(defaultValue ?? '');

  // Le bouton Reset ne doit être visible que si une valeur par défaut existe
  // ET que la valeur courante est différente de cette valeur par défaut.
  const showReset = hasChangedFromDefault;

  const handleChange = (e) => {
    let v = e.target.value;
    if (isByte) {
      const normalized = clampByte(v);
      if (normalized === '') return;
      v = normalized;
    }
    setLocalValue(v);
    if (onChange) onChange(v);
  };

  const handleSend = () => {
    if (disabled || !onCommit) return;
    let v = localValue;
    if (isByte) {
      const normalized = clampByte(v);
      if (normalized === '') return;
      v = normalized;
    }
    onCommit(v);
  };

  const handleReset = () => {
    if (!hasDefault) return;
    const next = String(defaultValue ?? '');
    setLocalValue(next);
    if (onChange) onChange(next);
  };

  const hasLabelText = String(label || '').trim() !== '';
  const labelDisplay = hasLabelText ? label : t('widgets.common.noLabel');
  const showTitleRow = hasLabelText || (editMode && onDuplicate);

  return (
    <div className="uu-dropdown-widget">
      {/* En-tête : label uniquement */}
      <div className="prod-widget-header">
        {showTitleRow && (
          <div className="prod-widget-label-row uu-item-title-row">
            <div className="uu-item-title">{labelDisplay}</div>
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
        )}
      </div>

      {/* Corps : select */}
      <div className="uu-dropdown-inner">
        <select
          className="uu-input uu-dropdown-select"
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
        >
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pied : Envoyer + Reset + pastilles + delete (édition) */}
      <div className="uu-dropdown-footer">
        <div className="uu-dropdown-footer-left">
          <button
            type="button"
            className="uu-btn uu-btn-primary uu-btn-sm"
            onClick={handleSend}
            disabled={disabled}
          >
            {t('widgets.common.send')}
          </button>

          {showReset && (
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
        </div>

        <div className="uu-dropdown-footer-right">
          {editMode && onDelete && (
            <button
              type="button"
              className="uu-btn-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title={t('widgets.common.deleteWidget')}
              aria-label={t('widgets.common.deleteWidget')}
            >
              ✕
            </button>
          )}

          {/* Pastilles en bas à côté d'Envoyer (édition + production) */}
          {rightSlot && (
            <div className="uu-row uu-row-gap4">
              {rightSlot}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DropdownEditorRight
 *  - partie "menu édition" (colonne de droite dans Production)
 *  - gère la liste des options : label + valeur
 *
 * Props :
 *  - selected        : widget complet
 *  - updateSelected  : (partial) => void
 */
export function DropdownEditorRight({ selected, updateSelected }) {
  if (!selected) return null;

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
    return String(Math.max(0, Math.min(255, Math.round(n))));
  };

  const rawOptions = Array.isArray(selected.ui?.options)
    ? selected.ui.options
    : [];

  const editableOptions = rawOptions.length
    ? rawOptions
    : [{ label: '', value: '' }];
  const options = editableOptions;

  const currentDefault =
    selected.defaultValue !== undefined && selected.defaultValue !== null
      ? String(selected.defaultValue)
      : '';

  const handleDefaultChange = (e) => {
    const val = e.target.value;
    if (!val) {
      // Aucune valeur par défaut
      updateSelected({ defaultValue: undefined });
    } else {
      updateSelected({ defaultValue: val });
    }
  };

  const updateOption = (index, patch) => {
    const next = editableOptions.map((opt, i) =>
      i === index ? { ...opt, ...patch } : opt
    );

    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

  const addOption = () => {
    const next = [
      ...editableOptions,
      { label: '', value: '' }
    ];

    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

  const removeOption = (index) => {
    if (editableOptions.length <= 1) {
      // On garde toujours au moins une ligne vide
      updateSelected({
        ui: {
          ...(selected.ui || {}),
          options: [{ label: '', value: '' }]
        }
      });
      return;
    }

    const next = editableOptions.filter((_, i) => i !== index);
    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

    return (
    <div className="uu-list">
      <div className="uu-item-title">{t('widgets.dropdown.optionsTitle')}</div>

      <>
        {editableOptions.map((opt, idx) => {
          const label = String(opt.label ?? '');
          const value = String(opt.value ?? '');

          const hasError =
            !label.trim() || !value.trim();

          return (
            <div key={idx} className="uu-row">
              <label
                className={
                  'uu-label w-160' +
                  (hasError ? ' uu-label-error' : '')
                }
              >
                Option {idx + 1}
              </label>

              <div className="uu-col">
                <div className="uu-row uu-row-gap4">
                  <input
                    className="uu-input"
                    placeholder={t('widgets.dropdown.labelPlaceholder')}
                    value={label}
                    onChange={(e) =>
                      updateOption(idx, {
                        label: e.target.value
                      })
                    }
                  />
                  <input
                    className="uu-input"
                    placeholder={t('widgets.dropdown.valuePlaceholder')}
                    value={value}
                    type={isByte ? 'number' : 'text'}
                    min={isByte ? 0 : undefined}
                    max={isByte ? 255 : undefined}
                    step={isByte ? 1 : undefined}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!isByte) {
                        updateOption(idx, { value: raw });
                        return;
                      }
                      if (raw === '') {
                        updateOption(idx, { value: '' });
                        return;
                      }
                      const clamped = clampByte(raw);
                      if (clamped === '') return;
                      updateOption(idx, { value: clamped });
                    }}
                  />
                  <button
                    type="button"
                    className="uu-btn uu-btn-ghost uu-btn-sm"
                    onClick={() => removeOption(idx)}
                  >
                    ✕
                  </button>
                </div>

                {hasError && (
                  <div className="uu-error-text">{t('widgets.dropdown.errorRequired')}</div>
                )}
              </div>
            </div>
          );
        })}

        <div className="uu-row uu-row-gap4">
          <button
            type="button"
            className="uu-btn uu-btn-ghost uu-btn-sm"
            onClick={addOption}
          >
            {t('widgets.dropdown.addOption')}
          </button>
        </div>
      </>

        {/* Option par défaut (utilisée par le bouton Reset) */}
        <div className="uu-row mt-12">
          <label className="uu-label w-160">
            {t('widgets.dropdown.defaultOptionLabel')}
          </label>
          <div className="uu-col">
            <select
              className="uu-input"
              value={currentDefault}
              onChange={handleDefaultChange}
            >
              <option value="">{t('widgets.common.none')}</option>
              {options.map((opt, idx) => (
                <option
                  key={idx}
                  value={String(opt.value ?? '')}
                >
                  {String(opt.label ?? '') || `Option ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
  );
}

export function DropdownLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;

  const hasError = !selected.label || !selected.label.trim();
  const t = getWidgetT();

  return (
    <div className="uu-row">
      <label
        className={`uu-label w-160 ${hasError ? 'uu-label-error' : ''}`}
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

// Options spécifiques colonne GAUCHE : snippets Companion pour la dropdown
export function DropdownEditorLeftExtras({ selected /*, updateSelected */, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();
  const widgetId = selected.id;
  const ui = selected.ui || {};

  const rawOptions = Array.isArray(ui.options) ? ui.options : [];
  const options =
    rawOptions.length
      ? rawOptions
      : [{ label: '', value: '' }];

  const currentDefault =
    selected.defaultValue !== undefined && selected.defaultValue !== null
      ? String(selected.defaultValue)
      : '';

  // Base URL pour Companion (IP du HUB si dispo)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('DropdownEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  if (!widgetId || !baseUrl) return null;

  // Normalisation des options pour trouver un exemple correct
  const normalizedOptions = options.map((opt, index) => {
    const label = String(opt.label ?? '').trim();
    const value = String(opt.value ?? '');
    return {
      label: label || `Option ${index + 1}`,
      value
    };
  });

  let exampleValue = '';

  // 1) Si une valeur par défaut existe et correspond à une option → on la prend
  if (currentDefault) {
    const found = normalizedOptions.find((opt) => opt.value === currentDefault);
    if (found) {
      exampleValue = found.value;
    }
  }

  // 2) Sinon, on prend la première option si dispo
  if (!exampleValue && normalizedOptions.length > 0) {
    exampleValue = normalizedOptions[0].value;
  }

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = `${baseUrl}/agent/ui/widgets/${encodeURIComponent(
    widgetId
  )}/press${layoutQuery}`;

  const exampleBody = JSON.stringify({ value: exampleValue });

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


