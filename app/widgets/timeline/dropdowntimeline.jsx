import BindingPicker from '../bindingpicker.jsx';
import { readIdentity } from '../../utils/identity';
import { createT } from '../../i18n';

function getT() {
  const id = readIdentity() || {};
  const lang = String(id.lang || 'fr').trim();
  return createT(lang);
}

export function DropdownTimelineEditor({
  selected,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;
  const t = getT();
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
  const options = rawOptions.length ? rawOptions : [{ label: '', value: '' }];

  const updateOption = (index, patch) => {
    const next = options.map((opt, i) =>
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
    const next = [...options, { label: '', value: '' }];
    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

  const removeOption = (index) => {
    if (options.length <= 1) {
      updateSelected({
        ui: {
          ...(selected.ui || {}),
          options: [{ label: '', value: '' }]
        }
      });
      return;
    }
    const next = options.filter((_, i) => i !== index);
    updateSelected({
      ui: {
        ...(selected.ui || {}),
        options: next
      }
    });
  };

  return (
    <div className="uu-list">
      <BindingPicker
        kind="property"
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="dropdown"
      />

      <div className="uu-item-title">{t('widgets.dropdown.optionsTitle')}</div>
      <>
        {options.map((opt, idx) => {
          const label = String(opt.label ?? '');
          const value = String(opt.value ?? '');
          const hasError = !label.trim() || !value.trim();

          return (
            <div key={idx} className="uu-row">
              <label
                className={`uu-label w-160${hasError ? ' uu-label-error' : ''}`}
              >
                Option {idx + 1}
              </label>
              <div className="uu-col">
                <div className="uu-row uu-row-gap4 uu-row-nowrap uu-dropdown-option-row">
                  <input
                    className="uu-input uu-dropdown-option-input"
                    placeholder={t('widgets.dropdown.labelPlaceholder')}
                    value={label}
                    onChange={(e) =>
                      updateOption(idx, {
                        label: e.target.value
                      })
                    }
                  />
                  <input
                    className="uu-input uu-dropdown-option-input"
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
                    X
                  </button>
                </div>
                {hasError && (
                  <div className="uu-error-text">
                    {t('widgets.dropdown.errorRequired')}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="uu-row mt-4">
          <button type="button" className="uu-btn uu-btn-ghost" onClick={addOption}>
            {t('widgets.dropdown.addOption')}
          </button>
        </div>
      </>
    </div>
  );
}
