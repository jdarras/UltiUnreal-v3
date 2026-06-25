// app/widgets/sliderwidget.jsx
// app/widgets/sliderwidget.jsx
import { useRef } from 'react';
import './sliderwidget.css';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';
import {
  getMinLabel,
  getMaxLabel,
  getStepLabel,
  getHorizontalLabel,
  getVerticalLabel,
} from './widgetI18n.js';

export default function SliderWidget({
  widget,
  value,
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

  const lastCommitRef = useRef(0);
  const LIVE_THROTTLE_MS = 50; // tempo d'envoi en mode live (ms)

  if (!widget) return null;

  const w = widget || {};
  const ui = w.ui || {};
  const isLive = ui.live === true;

  const orientation = ui.orientation || 'horizontal';
  const isVertical = orientation === 'vertical';

  // Couleur du slider
  const sliderColor = ui.sliderColor || ui.buttonColor || ui.color;

  // --- Min / Max sécurisés ---
  const minRaw =
    ui.min !== undefined && ui.min !== null && ui.min !== ''
      ? Number(ui.min)
      : -10;

  const maxRaw =
    ui.max !== undefined && ui.max !== null && ui.max !== ''
      ? Number(ui.max)
      : 10;

  const sliderMinSafe = Number.isFinite(minRaw) ? minRaw : 0;
  const sliderMaxSafe = Number.isFinite(maxRaw)
    ? Math.max(maxRaw, sliderMinSafe)
    : sliderMinSafe + 1;

  // --- Step sécurisé ---
  const stepRaw =
    ui.step !== undefined && ui.step !== null && ui.step !== ''
      ? Number(ui.step)
      : 0.1;
  const sliderStep =
    Number.isFinite(stepRaw) && stepRaw > 0 ? stepRaw : 0.1;

  // --- Valeur par défaut ---
  const sliderRawDefault =
    w.defaultValue !== undefined && w.defaultValue !== null && w.defaultValue !== ''
      ? w.defaultValue
      : ui.default;

  let sliderDefaultSafe = sliderMinSafe;
  let sliderHasExplicitDefault = false;

  if (
    sliderRawDefault !== undefined &&
    sliderRawDefault !== null &&
    sliderRawDefault !== ''
  ) {
    const d = Number(sliderRawDefault);
    if (Number.isFinite(d)) {
      sliderHasExplicitDefault = true;
      if (d < sliderMinSafe) sliderDefaultSafe = sliderMinSafe;
      else if (d > sliderMaxSafe) sliderDefaultSafe = sliderMaxSafe;
      else sliderDefaultSafe = d;
    }
  }

  // --- Valeur courante clampée ---
  const sliderValue = (() => {
    const base =
      value ?? (sliderHasExplicitDefault ? sliderDefaultSafe : 0);
    const num = Number(base);
    if (!Number.isFinite(num)) return sliderMinSafe;
    if (num < sliderMinSafe) return sliderMinSafe;
    if (num > sliderMaxSafe) return sliderMaxSafe;
    return num;
  })();

  const sliderDisplayValue = (() => {
    if (!Number.isFinite(sliderValue)) return '0.00';
    const rounded = Math.round(sliderValue * 100) / 100;
    const normalized = Object.is(rounded, -0) ? 0 : rounded;
    return normalized.toFixed(2);
  })();

  // --- Règle du bouton Reset ---
  const sliderIsAtDefault =
    sliderHasExplicitDefault && sliderValue === sliderDefaultSafe;
  const sliderCanReset = sliderHasExplicitDefault && !sliderIsAtDefault;

  // --- Normalisation 0..1 pour la bulle (OK avec bornes négatives) ---
  let ratio = 0;
  if (sliderMaxSafe !== sliderMinSafe) {
    ratio =
      (sliderValue - sliderMinSafe) /
      (sliderMaxSafe - sliderMinSafe);
  }
  if (!Number.isFinite(ratio)) ratio = 0;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;

  // Variables CSS
  const rootStyle = {
    '--uu-slider-t': ratio
  };
  if (sliderColor) {
    rootStyle['--uu-slider-accent'] = sliderColor;
  }

  // --- Valeur DOM pour le <input type="range"> ---
  const domMin = sliderMinSafe;
  const domMax = sliderMaxSafe;

  // En vertical : on inverse pour que haut = max, bas = min
  const displayedDomValue = (() => {
    if (!Number.isFinite(sliderValue)) return '';
    if (isVertical && Number.isFinite(domMin) && Number.isFinite(domMax)) {
      return domMin + domMax - sliderValue;
    }
    return sliderValue;
  })();

  const clampToRange = (v) => {
    if (v < sliderMinSafe) return sliderMinSafe;
    if (v > sliderMaxSafe) return sliderMaxSafe;
    return v;
  };

  const handleChange = (e) => {
    let v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    // Conversion dom → logique en mode vertical
    if (isVertical && Number.isFinite(domMin) && Number.isFinite(domMax)) {
      v = domMin + domMax - v;
    }

    v = clampToRange(v);

    // 1) On met à jour la valeur locale (bulle, etc.)
    onChange?.(v);

    // 2) En mode live, on envoie aussi vers Unreal avec un throttle
    if (isLive && !disabled && onCommit) {
      const now = Date.now();
      if (now - lastCommitRef.current >= LIVE_THROTTLE_MS) {
        lastCommitRef.current = now;
        onCommit(v);
      }
    }
  };

  const handleCommit = (e) => {
    let v = Number(e.target.value);
    if (!Number.isFinite(v)) return;

    if (isVertical && Number.isFinite(domMin) && Number.isFinite(domMax)) {
      v = domMin + domMax - v;
    }

    v = clampToRange(v);

    onChange?.(v);

    // Dernier envoi garanti en mode live (même si dans la fenêtre du throttle)
    if (isLive && !disabled && onCommit) {
      onCommit(v);
    }
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (!sliderHasExplicitDefault) return;
    const next = sliderDefaultSafe;
    onChange?.(next);
    onCommit?.(next);
  };

  const handleSetDefault = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onSetDefault?.(sliderValue);
  };

  const label = w.label || t('widgets.common.noLabel');

  return (
    <div
      className={
        'uu-slider-root ' +
        (isVertical ? 'uu-slider-vertical' : 'uu-slider-horizontal') +
        (disabled ? ' is-disabled' : '')
      }
      style={rootStyle}
    >
      {/* Label du slider */}
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

      {/* Barre + Min/Max + bulle */}
      <div className="uu-slider-track">
        {/* Min au début */}
        <div className="uu-slider-limit uu-slider-limit-min">
          {sliderMinSafe}
        </div>

        {/* Barre + curseur + bulle */}
        <div className="uu-slider-track-inner">
          <input
            className="uu-slider-input"
            type="range"
            min={domMin}
            max={domMax}
            step={sliderStep}
            value={displayedDomValue}
            disabled={disabled}
            onChange={handleChange}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
          />

          {/* Bulle (valeur logique) */}
          <div className="uu-slider-thumb-value">
            {sliderDisplayValue}
          </div>
        </div>

        {/* Max à la fin */}
        <div className="uu-slider-limit uu-slider-limit-max">
          {sliderMaxSafe}
        </div>
      </div>

            {/* Ligne du bas : Envoyer (si non live) + Reset + Supprimer + pastilles */}
      <div className="uu-row mt-4 uu-align-center">
              {!isLive && (
        <button
          type="button"
          className="uu-btn uu-btn-primary uu-btn-sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!onCommit || disabled) return;
            onCommit(sliderValue);
          }}
        >
          {t('widgets.common.send')}
        </button>
      )}

        {sliderCanReset && (
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

        {(!disabled && (!sliderHasExplicitDefault || sliderCanReset)) && (
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
          <div className="uu-row uu-row-gap4">
            {targetsSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// Éditeur "colonne de droite" pour le slider (Min / Max / Step / Default)
export function SliderEditorRight({ selected, updateSelected }) {
  if (!selected) return null;

  const t = getWidgetT();
  const ui = selected.ui || {};
  const currentDefaultDisplay =
    ui.default !== undefined ? ui.default : selected.defaultValue ?? '';

  const handleMinChange = (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        min: raw === '' || raw === '-' ? raw : Number(raw),
      },
    });
  };

  const handleMaxChange = (e) => {
    const raw = e.target.value;
    updateSelected({
      ui: {
        ...ui,
        max: raw === '' || raw === '-' ? raw : Number(raw),
      },
    });
  };

  const handleStepChange = (e) => {
    updateSelected({
      ui: {
        ...ui,
        step: Number(e.target.value),
      },
    });
  };

  return (
    <div className="uu-list prod-editor-right-slider">
      {/* Min / Max / Step sur UNE ligne */}
      <div className="uu-row uu-slider-editor-row">
        <label className="uu-label w-160">{t('widgets.slider.boundsLabel')}</label>

        <span className="uu-muted">{getMinLabel(getWidgetT())}</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={ui.min ?? -10}
          onChange={handleMinChange}
        />

        <span className="uu-muted">{getMaxLabel(getWidgetT())}</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={ui.max ?? 10}
          onChange={handleMaxChange}
        />

        <span className="uu-muted">{getStepLabel(getWidgetT())}</span>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-editor-input"
          value={ui.step ?? 0.1}
          onChange={handleStepChange}
        />
      </div>

      {/* Valeur par défaut : on garde ton comportement actuel */}
      <div className="uu-row uu-slider-default-row">
        <label className="uu-label w-160">{t('widgets.common.defaultValueLabel')}</label>
        <input
          type="number"
          className="uu-input uu-input-arg uu-slider-default-input"

          value={currentDefaultDisplay}
          onChange={(e) => {
            // on stocke ce que tape l’utilisateur tel quel (string)
            const raw = e.target.value;
            const next = {
              ui: {
                ...ui,
                default: raw,
              },
            };
            if (raw === '') {
              next.defaultValue = undefined;
            } else {
              const n = Number(raw);
              if (Number.isFinite(n)) {
                next.defaultValue = n;
              }
            }
            updateSelected(next);
          }}
          onBlur={(e) => {
            const raw = e.target.value;

            // si vide ou juste "-", on considère "pas de valeur par défaut"
            if (raw === '' || raw === '-') {
              updateSelected({
                ui: {
                  ...ui,
                  default: '',
                },
                defaultValue: undefined
              });
              return;
            }

            const minRaw = ui.min;
            const maxRaw = ui.max;

            const minNum = Number(
              minRaw !== undefined &&
                minRaw !== null &&
                minRaw !== '' &&
                minRaw !== '-'
                ? minRaw
                : 0
            );

            const maxNum = Number(
              maxRaw !== undefined &&
                maxRaw !== null &&
                maxRaw !== '' &&
                maxRaw !== '-'
                ? maxRaw
                : minNum + 1
            );

            let num = Number(raw);
            if (!Number.isFinite(num)) {
              num = minNum;
            }

            if (num < minNum) num = minNum;
            if (num > maxNum) num = maxNum;

            updateSelected({
              ui: {
                ...ui,
                default: num,
              },
              defaultValue: num
            });

            e.target.value = String(num);
          }}
        />
      </div>
    </div>
  );
}

// Éditeur "colonne de gauche" pour le slider (options propres : couleur, orientation + snippets Companion)
export function SliderEditorLeftExtras({ selected, updateSelected, layoutId = '' }) {
  if (!selected) return null;

  const t = getWidgetT();
  const ui = selected.ui || {};
  const widgetId = selected.id;

  // Base URL pour Companion (IP du HUB si dispo)
  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('SliderEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  // Pour le slider, on utilise l'action /nudge (gère value + delta)
  const url =
    widgetId && baseUrl
      ? `${baseUrl}/agent/ui/widgets/${encodeURIComponent(widgetId)}/nudge${
          layoutId ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}` : ''
        }`
      : '';

  // Step pour incrémenter / décrémenter
  let step = Number(ui.step);
  if (!Number.isFinite(step) || step === 0) {
    step = 0.1;
  }

  const incBody = `{"delta":${step}}`;
  const decBody = `{"delta":-${step}}`;

  // Exemple de valeur basé sur min/max ou valeur par défaut
  const rawDefault = ui.default ?? selected.defaultValue;
  let exampleValue = NaN;

  if (
    rawDefault !== undefined &&
    rawDefault !== null &&
    rawDefault !== '' &&
    rawDefault !== '-'
  ) {
    const d = Number(rawDefault);
    if (Number.isFinite(d)) {
      exampleValue = d;
    }
  }

  if (!Number.isFinite(exampleValue)) {
    let min = typeof ui.min === 'number' ? ui.min : -10;
    let max = typeof ui.max === 'number' ? ui.max : 10;

    if (!Number.isFinite(min)) min = -10;
    if (!Number.isFinite(max)) max = 10;
    if (min > max) {
      const tmp = min;
      min = max;
      max = tmp;
    }

    exampleValue = (min + max) / 2;
  }

  const exampleBody = `{"value":${exampleValue}}`;

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
      {/* Couleur du slider */}
      <div className="uu-row">
        <label className="uu-label w-160">{t('widgets.slider.colorLabel')}</label>
        <input
          type="color"
          className="uu-input-color"
          value={ui.sliderColor || '#60A5FA'}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                sliderColor: e.target.value,
              },
            })
          }
        />
      </div>

      {/* Orientation du slider */}
      <div className="uu-row uu-slider-orientation-row">
        <label className="uu-label w-160">{t('widgets.slider.orientationLabel')}</label>
        <select
          className="uu-input uu-slider-orientation-select"
          value={ui.orientation || 'horizontal'}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                orientation: e.target.value,
              },
            })
          }
        >
          <option value="horizontal">{getHorizontalLabel(getWidgetT())}</option>
          <option value="vertical">{getVerticalLabel(getWidgetT())}</option>
        </select>
      </div>

      {/* Snippets Companion */}
      {widgetId && baseUrl && (
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
              {/* Sync valeur actuelle (aucune valeur → delta 0) */}
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

              {/* Décrémenter */}
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(decBody)}
                title={decBody}
              >
                X-
              </button>

              {/* Incrémenter */}
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(incBody)}
                title={incBody}
              >
                X+
              </button>

              {/* Exemple valeur absolue */}
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

// Éditeur de label pour le widget Slider (colonne gauche)
export function SliderLabelEditor({ selected, updateSelected }) {
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

