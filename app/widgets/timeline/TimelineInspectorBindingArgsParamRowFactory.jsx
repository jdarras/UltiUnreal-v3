import {
  TimelineInspectorBindingArgsCheckboxRow,
  TimelineInspectorBindingArgsTextAreaRow,
  TimelineInspectorBindingArgsTextRow
} from './TimelineInspectorBindingArgsBasicRows.jsx';
import { TimelineInspectorBindingArgsColorRow } from './TimelineInspectorBindingArgsColorRow.jsx';
import {
  TimelineInspectorBindingArgsEnumRow,
  TimelineInspectorBindingArgsNumberRow
} from './TimelineInspectorBindingArgsScalarRows.jsx';
import {
  TimelineInspectorBindingArgsRotatorRow,
  TimelineInspectorBindingArgsTransformRow,
  TimelineInspectorBindingArgsVector3Row
} from './TimelineInspectorBindingArgsSpatialRows.jsx';

export function renderTimelineBindingParamRow({
  model,
  t,
  setArgValue,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  const onChange = (value) => setArgValue(model.name, value);

  switch (model.kind) {
    case 'enum':
      return (
        <TimelineInspectorBindingArgsEnumRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          options={model.options}
          widthPx={model.widthPx}
          onChange={onChange}
        />
      );
    case 'vector':
      return (
        <TimelineInspectorBindingArgsVector3Row
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    case 'rotator':
      return (
        <TimelineInspectorBindingArgsRotatorRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    case 'transform':
      return (
        <TimelineInspectorBindingArgsTransformRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    case 'color':
      return (
        <TimelineInspectorBindingArgsColorRow
          key={model.key}
          t={t}
          name={model.name}
          label={model.label}
          current={model.current}
          argColorPicker={argColorPicker}
          setArgColorPicker={setArgColorPicker}
          setColorPickerOpen={setColorPickerOpen}
          onChange={onChange}
        />
      );
    case 'bool':
      return (
        <TimelineInspectorBindingArgsCheckboxRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    case 'byte':
      return (
        <TimelineInspectorBindingArgsNumberRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          min={model.min}
          max={model.max}
          onChange={onChange}
        />
      );
    case 'int64':
    case 'int':
    case 'float':
      return (
        <TimelineInspectorBindingArgsNumberRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    case 'text':
      return (
        <TimelineInspectorBindingArgsTextAreaRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
    default:
      return (
        <TimelineInspectorBindingArgsTextRow
          key={model.key}
          name={model.name}
          label={model.label}
          current={model.current}
          onChange={onChange}
        />
      );
  }
}
