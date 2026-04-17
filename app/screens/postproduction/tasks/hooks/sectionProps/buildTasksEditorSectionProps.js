import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "showCreateForm",
  "isEditingTask",
  "editingTaskId",
  "tasksLoading",
  "title",
  "description",
  "normalizedProjectOptions",
  "autoRenderProjectRef",
  "filteredAutoRenderForms",
  "autoRenderFormId",
  "renderFormsLoading",
  "renderFormsError",
  "canManageRenderTemplates",
  "renderTemplatesForSelectedAutoForm",
  "autoRenderTemplateId",
  "autoRenderProjectCatalogLoading",
  "autoRenderProjectCatalogError",
  "selectedAutoRenderForm",
  "autoRenderWorkerKey",
  "availableRenderWorkers",
  "renderWorkersLoading",
  "renderWorkersError",
  "autoRenderLaunchMode",
  "autoRenderScheduledMode",
  "autoRenderScheduledAt",
  "taskSequenceName",
  "projectCatalogSequenceOptions",
  "autoRenderFormFieldsLoading",
  "autoRenderFormFieldsError",
  "visibleAutoRenderFormFields",
  "autoRenderFormValues",
  "renderOutputDir",
  "autoExpectedRenderName",
  "formError",
];

const ALIASES = {
  onTitleChange: "setTitle",
  onDescriptionChange: "setDescription",
  onAutoSaveOnBlur: "autoSaveEditedTaskOnBlur",
  onChangeAutoRenderForm: "changeAutoRenderForm",
  onChangeAutoRenderProject: "changeAutoRenderProject",
  onChangeAutoRenderTemplate: "changeAutoRenderTemplate",
  onChangeAutoRenderWorker: "changeAutoRenderWorker",
  onChangeAutoRenderLaunchMode: "changeAutoRenderLaunchMode",
  onChangeAutoRenderScheduledMode: "changeAutoRenderScheduledMode",
  onChangeAutoRenderScheduledAt: "changeAutoRenderScheduledAt",
  onChangeAutoRenderSequence: "changeAutoRenderSequence",
  onUpdateAutoRenderFormValue: "handleUpdateAutoRenderFormValue",
  submitLabel: "submitTaskFormLabel",
  onSubmit: "handleSubmitTaskForm",
  onCancel: "closeTaskForm",
};

function buildTasksEditorSectionProps(input = {}) {
  return {
    ...buildProps(input, {
      keys: DIRECT_KEYS,
      aliases: ALIASES,
    }),
    submitDisabled: !input?.canSubmitTaskForm,
  };
}

export {
  buildTasksEditorSectionProps,
};

export default buildTasksEditorSectionProps;
