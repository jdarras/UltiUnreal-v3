import BindingPicker from '../bindingpicker.jsx';
import { getWidgetT } from '../widgetTranslator.js';
import {
  getOptionsFromUnrealLabel,
  getOptionsLabel,
  getEnumLabelPlaceholder,
  getEnumValuePlaceholder,
  getLabelValueRequiredLabel,
  getSelectBindingFirstLabel,
} from '../widgetI18n.js';

export function EnumTimelineEditor({
  selected,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;
  const hasBindingPath = !!String(selected.binding?.path || '').trim();

  const bindingEnumValues =
    Array.isArray(selected.binding?.enumValues) &&
    selected.binding.enumValues.length > 0
      ? selected.binding.enumValues
      : null;

  const ui = selected.ui || {};
  const rawOptions = Array.isArray(ui.options) ? ui.options : [];
  const options = rawOptions.length ? rawOptions : [{ label: '', value: '' }];

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
      updateOptions([{ label: '', value: '' }]);
      return;
    }
    const next = options.filter((_, i) => i !== idx);
    updateOptions(next);
  };

  return (
    <div className="uu-list">
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="enum"
      />

      {!hasBindingPath ? (
        <div className="uu-muted">{getSelectBindingFirstLabel(getWidgetT())}</div>
      ) : bindingEnumValues ? (
        <div className="uu-muted">{getOptionsFromUnrealLabel(getWidgetT())}</div>
      ) : (
        <>
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
                      X
                    </button>

                    {hasError && (
                      <div className="uu-error-text">{getLabelValueRequiredLabel(getWidgetT())}</div>
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
        </>
      )}
    </div>
  );
}
