import { resolveTaskFormInputKind } from "./helpers";
import { TaskFormFieldInput } from "./TaskFormFieldInput";

function TaskFormFieldItem({
  t,
  field = {},
  index = 0,
  autoRenderFormValues = {},
  tasksLoading = false,
  onUpdateFieldValue = null,
}) {
  const fieldKey = String(field?.fieldKey || `field_${index}`).trim();
  const fieldLabel = String(field?.fieldLabel || fieldKey || `Field ${index + 1}`).trim();
  const inputKind = resolveTaskFormInputKind(field);
  const rawValue = Object.prototype.hasOwnProperty.call(autoRenderFormValues || {}, fieldKey)
    ? autoRenderFormValues[fieldKey]
    : field?.defaultValue ?? "";
  const requiredMark = field?.isRequired === true ? " *" : "";

  return (
    <div className="uu-grid-field">
      {inputKind === "checkbox" ? (
        <label className="uu-check">
          <TaskFormFieldInput
            t={t}
            inputKind={inputKind}
            field={field}
            fieldKey={fieldKey}
            rawValue={rawValue}
            tasksLoading={tasksLoading}
            onUpdateFieldValue={onUpdateFieldValue}
          />
          <span>{`${fieldLabel}${requiredMark}`}</span>
        </label>
      ) : (
        <>
          <label className="uu-label">{`${fieldLabel}${requiredMark}`}</label>
          <TaskFormFieldInput
            t={t}
            inputKind={inputKind}
            field={field}
            fieldKey={fieldKey}
            rawValue={rawValue}
            tasksLoading={tasksLoading}
            onUpdateFieldValue={onUpdateFieldValue}
          />
        </>
      )}
      {field?.helpText ? <div className="uu-muted mt-8">{String(field.helpText)}</div> : null}
    </div>
  );
}

export { TaskFormFieldItem };
