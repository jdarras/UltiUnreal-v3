import BindingPicker from '../bindingpicker.jsx';
import { getWidgetT } from '../widgetTranslator.js';
import { getBoolsShortLabel } from '../widgetI18n.js';

export function ToggleTimelineEditor({
  selected,
  presetData,
  updateBinding,
  updateSelected
}) {
  if (!selected) return null;

  const t = getWidgetT();
  const binding = selected.binding || {};
  const bindingKind = binding.kind === 'function' ? 'function' : 'property';

  const handleBindingKindChange = (e) => {
    const nextKind = e.target.value === 'function' ? 'function' : 'property';
    if (nextKind === 'function') {
      updateSelected({
        binding: {
          kind: 'function',
          displayName: '',
          path: '',
          valueType: 'bool',
          paramBools: {},
          argValues: {}
        }
      });
      return;
    }
    updateSelected({
      binding: {
        kind: 'property',
        path: '',
        valueType: 'bool'
      }
    });
  };

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
      <div className="uu-row uu-binding-row">
        <label className="uu-label w-160">{t('widgets.binding.kind')}</label>
        <select
          className="uu-input"
          value={bindingKind}
          onChange={handleBindingKindChange}
        >
          <option value="property">{t('widgets.binding.property')}</option>
          <option value="function">{t('widgets.binding.function')}</option>
        </select>
      </div>

      <BindingPicker
        kind={bindingKind}
        presetData={presetData}
        value={selected.binding}
        onChange={updateBinding}
        valueMode="toggle"
      />

      {bindingKind === 'function' && (
        <div className="uu-row mt-8">
          <label className="uu-label w-160">{getBoolsShortLabel(t)}</label>
          <div className="uu-col uu-row-gap4">
            {boolParams.length === 0 && (
              <div className="uu-muted">{t('widgets.binding.noFunction')}</div>
            )}
            {boolParams.map((bp) => {
              const follows = !!paramBools[bp.name];
              return (
                <label key={bp.name} className="uu-row uu-align-center uu-gap-8">
                  <input
                    type="checkbox"
                    checked={follows}
                    onChange={(e) => {
                      const next = {
                        ...paramBools,
                        [bp.name]: e.target.checked
                      };
                      updateBinding({ paramBools: next });
                    }}
                  />
                  <span>{bp.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
