// app/widgets/togglewidget.jsx
import './togglewidget.css';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';
import {
  getBindingTypeLabel,
  getButtonColorLabel,
  getBoolsLabel,
  getFalseValueTextLabel,
  getTrueValueTextLabel,
} from './widgetI18n.js';

export default function ToggleWidget({
  widget,
  value,
  defaultValue,
  disabled = false,
  editMode = false,
  onChange,
  onCommit,
  onSetDefault,
  onDelete,
  onDuplicate,
  targetsSlot
}) {
  const t = getWidgetT();
  const w = widget || {};
  const ui = w.ui || {};

  const parseToggleBoolean = (raw, fallback = false) => {
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw !== 0;
    if (typeof raw === 'string') {
      const s = raw.trim().toLowerCase();
      if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true;
      if (s === 'false' || s === '0' || s === 'off' || s === 'no' || s === '') return false;
    }
    return fallback;
  };

  const rawDefaultValue =
    defaultValue !== undefined ? defaultValue : w.defaultValue;
  const defaultBool = parseToggleBoolean(rawDefaultValue, false);
  const hasExplicitDefault = true;

  // valeur courante (booléen)
  const current = parseToggleBoolean(value ?? rawDefaultValue ?? false, false);
  const canReset = hasExplicitDefault && current !== defaultBool;
  const canSetDefault = !disabled && canReset;

const offLabel =
  ui.falseLabel !== undefined && ui.falseLabel !== null
    ? ui.falseLabel
    : t('widgets.common.offLabel');

const onLabel =
  ui.trueLabel !== undefined && ui.trueLabel !== null
    ? ui.trueLabel
    : t('widgets.common.onLabel');

  // showLabel = false → on cache le label
  const showLabel = ui.showLabel !== false;

  const color = ui.buttonColor;

  const apply = (next) => {
    if (disabled) return;
    if (next === current) return;
    onChange?.(next);
    onCommit?.(next);
  };

  const handleExecute = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const next = !current; // Off -> On, On -> Off
    apply(next);
  };

  const handleReset = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (!canReset || disabled) return;
    apply(defaultBool);
  };

  const handleSetDefault = (e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (!canSetDefault || !onSetDefault || disabled) return;
    onSetDefault(current);
  };

  const buttonText = current ? (onLabel || 'On') : (offLabel || 'Off');

  const showTitleRow = showLabel || (editMode && onDuplicate);

  return (
    <div className="uu-toggle-widget">
      {showTitleRow && (
        <div className="uu-item-title-row">
          {showLabel ? (
            <div
              className="uu-item-title uu-item-title-toggle"
              title={w.label || ''}
            >
              {w.label || t('widgets.common.noLabel')}
            </div>
          ) : (
            <div className="uu-item-title-spacer" />
          )}
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

      {/* Bouton Toggle */}
      <div className="uu-row uu-toggle-row">
        <button
          type="button"
          className="uu-btn uu-btn-primary uu-toggle-button"
          disabled={!!disabled}
          onClick={handleExecute}
          style={
            color
              ? {
                  '--uu-button-bg': color,
                  '--uu-button-border': color,
                  backgroundColor: color,
                  borderColor: color
                }
              : undefined
          }
        >
          {buttonText}
        </button>
      </div>


      {/* Ligne : Supprimer (édition) + pastilles */}
      <div
        className={`uu-row uu-align-center ${
          editMode ? 'mt-4' : 'mt-8'
        }`}
      >
        {canReset && (
          <button
            className="uu-reset-btn"
            type="button"
            disabled={disabled}
            title={t('widgets.common.resetDefault')}
            onClick={handleReset}
          >
            ⟲
          </button>
        )}

        {canSetDefault && (
          <button
            className="uu-reset-btn uu-set-default"
            type="button"
            disabled={disabled}
            title={t('widgets.common.setAsDefault')}
            onClick={handleSetDefault}
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
          <div className={editMode ? 'uu-row ml-8' : 'uu-row'}>
            {targetsSlot}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----- Éditeur colonne GAUCHE : couleur du bouton + Companion ----- */
export function ToggleEditorLeftExtras({ selected, updateSelected, updateBinding, layoutId = '' }) {
  if (!selected) return null;
  const t = getWidgetT();
  const ui = selected.ui || {};
  const widgetId = selected.id;
  const binding = selected.binding || {};
  const bindingKind = binding.kind === 'function' ? 'function' : 'property';

  // Textes pour les boutons ON / OFF (basés sur les labels du toggle)
  const trueText =
    (ui.trueLabel && ui.trueLabel.trim()) || t('widgets.toggle.trueLabel');
  const falseText =
    (ui.falseLabel && ui.falseLabel.trim()) || t('widgets.toggle.falseLabel');


  // URL de base de l'agent (127.0.0.1 ou serverIp, avec le bon port)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('ToggleEditorLeftExtras: getCompanionBaseUrl failed', e);
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
      {/* Type de liaison : propriété ou fonction */}
      <div className="uu-row uu-toggle-binding-row">
        <label className="uu-label w-160">{getBindingTypeLabel(getWidgetT())}</label>
        <select
          className="uu-input uu-toggle-binding-select"
          value={bindingKind}
          onChange={(e) => {
            const nextKind = e.target.value === 'function' ? 'function' : 'property';
            updateBinding?.({
              kind: nextKind,
              paramBools: {},
              argValues: {},
              ...(nextKind === 'function'
                ? { path: '', valueType: 'bool' }
                : { displayName: '', valueType: 'bool' })
            });
          }}
        >
          <option value="property">{t('widgets.binding.property')}</option>
          <option value="function">{t('widgets.binding.function')}</option>
        </select>
      </div>

      {/* Couleur du bouton */}
      <div className="uu-row uu-toggle-color-row">
        <label className="uu-label w-160">{getButtonColorLabel(getWidgetT())}</label>
        <input
          type="color"
          className="uu-input-color"
          value={ui.buttonColor || '#2563eb'}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                buttonColor: e.target.value,
              },
            })
          }
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
                {t('widgets.toggle.toggleAction')}
              </button>
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy('{"value":true}')}
                title='{"value":true}'
              >
                {trueText}
              </button>
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy('{"value":false}')}
                title='{"value":false}'
              >
                {falseText}
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

/* ----- Éditeur colonne DROITE : textes ON / OFF ----- */
export function ToggleEditorRight({ selected, updateSelected, updateBinding, presetData }) {
  if (!selected) return null;
  const t = getWidgetT();
  const ui = selected.ui || {};
  const defaultToggleValue =
    typeof selected.defaultValue === 'boolean'
      ? selected.defaultValue
      : false;

  const binding = selected.binding || {};
  const bindingKind =
    binding.kind === 'function' ? 'function' : 'property';
  const funcs = presetData?.funcs || [];
  const selectedFunc =
    bindingKind === 'function' && binding.displayName
      ? funcs.find((f) => f.displayName === binding.displayName)
      : null;
  const boolParams =
    selectedFunc && Array.isArray(selectedFunc.parameters)
      ? selectedFunc.parameters
          .filter((p) => {
            const typeStr = String(
              p.Type ||
                p.ParameterType ||
                p.InnerType ||
                p.type ||
                ''
            ).toLowerCase();
            return typeStr.includes('bool');
          })
          .map((p, idx) => ({
            name:
              p.Name ||
              p.ParameterName ||
              p.name ||
              `Param${idx + 1}`
          }))
      : [];
  const paramBools = binding.paramBools || {};

  return (
    <div className="uu-list">
      {bindingKind === 'function' && boolParams.length > 0 && (
        <div className="uu-row">
          <label className="uu-label w-160">{getBoolsLabel(getWidgetT())}</label>
          <div className="uu-col uu-row-gap4">
            {boolParams.map((bp) => {
              const follows = !!paramBools[bp.name];
              return (
                <label
                  key={bp.name}
                  className="uu-row uu-align-center uu-gap-8"
                >
                  <input
                    type="checkbox"
                    checked={follows}
                    onChange={(e) => {
                      const next = { ...paramBools, [bp.name]: e.target.checked };
                      updateBinding?.({ paramBools: next });
                    }}
                  />
                  <span>{bp.name}</span>
                </label>
              );
            })}
            {boolParams.length === 0 && (
              <div className="uu-muted">
                {t('widgets.binding.noFunction')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="uu-row">
        <label className="uu-label w-160">{getFalseValueTextLabel(getWidgetT())}</label>
        <input
          className="uu-input"
          value={ui.falseLabel ?? ''}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                falseLabel: e.target.value
              }
            })
          }
        />
      </div>

      <div className="uu-row">
        <label className="uu-label w-160">{getTrueValueTextLabel(getWidgetT())}</label>
        <input
          className="uu-input"
          value={ui.trueLabel ?? ''}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                trueLabel: e.target.value
              }
            })
          }
        />
      </div>

      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.common.defaultValueLabel')}</label>
        <input
          type="checkbox"
          className="uu-checkbox-inline"
          checked={!!defaultToggleValue}
          onChange={(e) =>
            updateSelected({
              defaultValue: !!e.target.checked
            })
          }
        />
      </div>
    </div>
  );
}

// Bouton "œil" générique pour afficher / masquer le label des widgets
function ToggleLabelVisibilityButton({ selected, updateSelected }) {
  if (!selected) return null;

  const showLabel = selected.ui?.showLabel !== false;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    updateSelected({
      ui: {
        ...(selected.ui || {}),
        showLabel: !showLabel
      }
    });
  };

  return (
    <button
      type="button"
      className={`uu-btn-ghost uu-btn-icon prod-label-eye ${
        showLabel ? 'is-on' : 'is-off'
      }`}
      onClick={handleClick}
      title={
        showLabel
          ? 'Masquer le label sur le widget'
          : 'Afficher le label sur le widget'
      }
    >
      {/* remplace par ta propre icône si tu veux */}
      👁
    </button>
  );
}

// Éditeur de label pour le widget Toggle (avec bouton œil)
export function ToggleLabelEditor({ selected, updateSelected }) {
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

      <div className="prod-label-inline">
        <input
          className="uu-input uu-input-label"
          value={selected.label || ''}
          onChange={(e) => updateSelected({ label: e.target.value })}
        />
        <ToggleLabelVisibilityButton
          selected={selected}
          updateSelected={updateSelected}
        />
      </div>
    </div>
  );
}


