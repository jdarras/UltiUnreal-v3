import { renderTimelineBindingParamRow } from './TimelineInspectorBindingArgsParamRowFactory.jsx';
import { hasTimelineBindingParameters } from './timelineInspectorBindingArgsParamListHelpers.js';
import { buildTimelineBindingParamRowModels } from './timelineInspectorBindingArgsParamRowFactory.js';
import { getTimelineBindingNoArgsLabel } from './timelineInspectorBindingArgsI18n.js';
import { INSPECTOR_COL_GAP_10_STYLE } from './timelineInspectorStyles.js';

export function TimelineInspectorBindingArgsParamList({
  t,
  func,
  argValues,
  setArgValue,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  const noArgsLabel = getTimelineBindingNoArgsLabel(t);

  if (!hasTimelineBindingParameters(func)) {
    return (
      <div className="uu-col mt-8" style={INSPECTOR_COL_GAP_10_STYLE}>
        <div className="uu-muted">{noArgsLabel}</div>
      </div>
    );
  }

  const rowModels = buildTimelineBindingParamRowModels(func, argValues, t);

  return (
    <div className="uu-col mt-8" style={INSPECTOR_COL_GAP_10_STYLE}>
      {rowModels.map((model) =>
        renderTimelineBindingParamRow({
          model,
          t,
          setArgValue,
          argColorPicker,
          setArgColorPicker,
          setColorPickerOpen
        })
      )}
    </div>
  );
}
