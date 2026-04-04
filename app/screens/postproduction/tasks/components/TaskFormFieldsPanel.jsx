import { TaskFormFieldItem } from "./taskFormFields/TaskFormFieldItem";

function TaskFormFieldsPanel({
  t,
  tasksLoading = false,
  visibleAutoRenderFormFields = [],
  autoRenderFormValues = {},
  onUpdateFieldValue = null,
}) {
  if (!Array.isArray(visibleAutoRenderFormFields) || visibleAutoRenderFormFields.length <= 0) {
    return null;
  }

  return (
    <div className="uu-grid-2 mt-12">
      {visibleAutoRenderFormFields.map((field, index) => {
        const fieldKey = String(field?.fieldKey || `field_${index}`).trim();
        return (
          <TaskFormFieldItem
            key={`task-auto-render-form-field-${fieldKey}`}
            t={t}
            field={field}
            index={index}
            autoRenderFormValues={autoRenderFormValues}
            tasksLoading={tasksLoading}
            onUpdateFieldValue={onUpdateFieldValue}
          />
        );
      })}
    </div>
  );
}

export { TaskFormFieldsPanel };
