import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "showCreateForm",
  "isEditingTask",
  "editingTaskVisualStatusKey",
  "editingTaskRejectionInfo",
  "editingTaskId",
  "tasksLoading",
  "title",
  "description",
  "assigneeUserId",
  "assigneeOptions",
  "assigneeUserIdLocked",
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
  "autoRenderOffscreen",
  "autoRenderExportDestinationIds",
  "renderExportDestinationOptions",
  "taskSequenceName",
  "projectCatalogSequenceOptions",
  "autoRenderFormFieldsLoading",
  "autoRenderFormFieldsError",
  "visibleAutoRenderFormFields",
  "autoRenderFormValues",
  "renderOutputDir",
  "autoExpectedRenderName",
  "autoOutputType",
  "formError",
  "submitTaskFormDisabled",
  "reservedRenderId",
];

const ALIASES = {
  onTitleChange: "setTitle",
  onDescriptionChange: "setDescription",
  onChangeAssigneeUserId: "changeAssigneeUserId",
  onAutoSaveOnBlur: "autoSaveEditedTaskOnBlur",
  onChangeAutoRenderForm: "changeAutoRenderForm",
  onChangeAutoRenderProject: "changeAutoRenderProject",
  onChangeAutoRenderTemplate: "changeAutoRenderTemplate",
  onChangeAutoRenderWorker: "changeAutoRenderWorker",
  onChangeAutoRenderLaunchMode: "changeAutoRenderLaunchMode",
  onChangeAutoRenderScheduledMode: "changeAutoRenderScheduledMode",
  onChangeAutoRenderScheduledAt: "changeAutoRenderScheduledAt",
  onChangeAutoRenderOffscreen: "changeAutoRenderOffscreen",
  onChangeAutoRenderExportDestinationIds: "changeAutoRenderExportDestinationIds",
  onChangeAutoRenderSequence: "changeAutoRenderSequence",
  onUpdateAutoRenderFormValue: "handleUpdateAutoRenderFormValue",
  submitLabel: "submitTaskFormLabel",
  onSubmit: "handleSubmitTaskForm",
  onCancel: "closeTaskForm",
};

function buildRenderEditorSectionProps(input = {}) {
  const computedSubmitDisabled = (
    typeof input?.submitTaskFormDisabled === "boolean"
      ? input.submitTaskFormDisabled
      : !input?.canSubmitTaskForm
  );
  return {
    ...buildProps(input, {
      keys: DIRECT_KEYS,
      aliases: ALIASES,
    }),
    submitDisabled: computedSubmitDisabled,
  };
}

export {
  buildRenderEditorSectionProps,
};

export default buildRenderEditorSectionProps;
