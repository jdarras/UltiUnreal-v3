// app/widgets/enumwidget.jsx
import './enumwidget.css';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from "./widgetTranslator.js";
import {
  getOptionsLabel,
  getEnumLabelPlaceholder,
  getEnumValuePlaceholder,
} from "./widgetI18n.js";

/**
 * EnumWidget
 * ...
 *
 * Les options peuvent venir :
 *   - automatiquement de binding.enumValues (Enum Unreal)
 *   - ou manuellement de selected.ui.options (fallback)
 */
export default function EnumWidget({
  label,
  value,
  options,
  defaultValue,
  disabled,
  editMode,
  onChange,
  onCommit,
  onDelete,
  onDuplicate,
  rightSlot
}) {
  const t = getWidgetT();

  const opts = Array.isArray(options) ? options : [];
  const rawValue = value ?? '';

  const hasDefault =
    defaultValue !== undefined &&
    defaultValue !== null &&
    String(defaultValue).trim() !== '';
  const isAtDefault =
    hasDefault && String(rawValue) === String(defaultValue);
  const showReset = hasDefault && !isAtDefault;

  const hasLabel = String(label || '').trim() !== '';
  const labelDisplay = hasLabel ? label : t('widgets.common.noLabel');

  const handleSelectChange = (e) => {
    const next = e.target.value;
    onChange?.(next);
  };

  const handleSendClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onCommit?.(rawValue);
  };

  const handleResetClick = (e) => {
    e.stopPropagation();
    if (!hasDefault) return;
    onChange?.(defaultValue ?? '');
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

  const showTitleRow = hasLabel || (editMode && onDuplicate);

  return (
    <div className="uu-enum-widget">
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

      {/* Ligne 1 : select */}
      <div className="mt-4">
        <select
          className="uu-input uu-enum-select"
          value={String(rawValue)}
          onChange={handleSelectChange}
          disabled={!!disabled || opts.length === 0}
        >
          {opts.length === 0 && (
            <option value="">{t('widgets.enum.noOptions')}</option>
          )}
          {opts.map((opt, i) => (
            <option key={`${opt.value}::${i}`} value={String(opt.value ?? '')}>
              {opt.label ?? String(opt.value ?? '')}
            </option>
          ))}
        </select>
      </div>

      {/* Ligne 2 : boutons + pastilles */}
      <div className="uu-row mt-2 uu-enum-actions-row">
        <button
          className="uu-btn uu-btn-primary"
          type="button"
          onClick={handleSendClick}
          disabled={!!disabled || opts.length === 0}
        >
          {t('widgets.common.send')}
        </button>

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

        {/* Pastilles machines */}
        {rightSlot}
      </div>
    </div>
  );
}

/**
 * Éditeur de label (colonne gauche)
 */
export function EnumLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;
  const t = getWidgetT();
  const label = selected.label ?? '';
  const hasError = !label.trim();

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

// Options spécifiques colonne GAUCHE : snippets Companion pour l'Enum
export function EnumEditorLeftExtras({ selected, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();
  const widgetId = selected.id;

  // On essaie d'abord les valeurs récupérées depuis Unreal
  const bindingEnumValues = Array.isArray(selected.binding?.enumValues)
    ? selected.binding.enumValues
    : [];

  const ui = selected.ui || {};
  const uiOptions = Array.isArray(ui.options) ? ui.options : [];

  const rawOptions =
    bindingEnumValues.length > 0 ? bindingEnumValues : uiOptions;

  const options = rawOptions.length
    ? rawOptions
    : [{ label: '', value: '' }];

  const currentDefault =
    selected.defaultValue !== undefined &&
    selected.defaultValue !== null
      ? String(selected.defaultValue)
      : '';

  // Base URL pour Companion (IP du HUB si dispo)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('EnumEditorLeftExtras: getCompanionBaseUrl failed', e);
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
    const found = normalizedOptions.find(
      (opt) => opt.value === currentDefault
    );
    if (found) {
      exampleValue = found.value;
    }
  }

  // 2) Sinon, on prend la première option disponible
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

/**
 * Éditeur colonne droite pour Enum :
 * - si les valeurs viennent d'Unreal (binding.enumValues) → on ne montre rien
 * - sinon → on permet de gérer manuellement les options
 */
export function EnumEditorRight({ selected, updateSelected }) {
  if (!selected) return null;

  // Si les valeurs sont fournies par l'Enum Unreal, on masque l'édition
  const bindingEnumValues =
    Array.isArray(selected.binding?.enumValues) &&
    selected.binding.enumValues.length > 0
      ? selected.binding.enumValues
      : null;

  if (bindingEnumValues) {
    return null;
  }

  const ui = selected.ui || {};
  const rawOptions = Array.isArray(ui.options) ? ui.options : [];

  const options = rawOptions.length
    ? rawOptions
    : [{ label: '', value: '' }];

  const updateOptions = (next) => {
    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

  const handleOptionChange = (idx, field, newValue) => {
    const next = options.slice();
    const current = next[idx] || { label: '', value: '' };
    next[idx] = { ...current, [field]: newValue };
    updateOptions(next);
  };

  const handleAddOption = () => {
    const next = options.concat({
      label: 'Nouvelle option',
      value: 'Nouvelle option'
    });
    updateOptions(next);
  };

  const handleRemoveOption = (idx) => {
    if (options.length <= 1) {
      // On garde au moins une ligne vide
      updateOptions([{ label: '', value: '' }]);
      return;
    }
    const next = options.filter((_, i) => i !== idx);
    updateOptions(next);
  };

  return (
    <div className="prod-editor-right-enum">
      <div className="uu-row mt-8">
        <label className="uu-label w-160">{getOptionsLabel(getWidgetT())}</label>
        <div className="uu-col uu-enum-options">
          {options.map((opt, idx) => {
            const label = String(opt.label ?? '');
            const value = String(opt.value ?? '');
            const hasError = !label.trim() || !value.trim();

            return (
              <div key={idx} className="uu-row uu-enum-option-row">
                <input
                  className="uu-input uu-enum-option-label"
                  placeholder={getEnumLabelPlaceholder(getWidgetT())}
                  value={label}
                  onChange={(e) =>
                    handleOptionChange(idx, 'label', e.target.value)
                  }
                />
                <input
                  className="uu-input uu-enum-option-value"
                  placeholder={getEnumValuePlaceholder(getWidgetT())}
                  value={value}
                  onChange={(e) =>
                    handleOptionChange(idx, 'value', e.target.value)
                  }
                />
                <button
                  type="button"
                  className="uu-btn uu-btn-ghost uu-btn-sm"
                  onClick={() => handleRemoveOption(idx)}
                >
                  ✕
                </button>

                {hasError && (
                  <div className="uu-error-text">
                    Label et valeur sont obligatoires.
                  </div>
                )}
              </div>
            );
          })}

          <div className="uu-row uu-row-gap4 mt-4">
            <button
              type="button"
              className="uu-btn uu-btn-ghost uu-btn-sm"
              onClick={handleAddOption}
            >
              Ajouter une option
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

