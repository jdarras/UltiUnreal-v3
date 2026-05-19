import { pickKeys } from "../../../shared/objectProps";

const DATA_KEYS = [
  "isEditingTask",
  "editingTaskVisualStatusKey",
  "editingTaskRejectionInfo",
  "editingTaskId",
  "title",
  "description",
  "assigneeUserId",
  "assigneeIsCurrentUser",
  "assigneeOptions",
  "assigneeUserIdLocked",
  "setTitle",
  "setDescription",
  "normalizedProjectOptions",
  "autoRenderProjectRef",
  "filteredAutoRenderForms",
  "autoRenderFormId",
  "renderTemplatesForSelectedAutoForm",
  "autoRenderTemplateId",
  "autoRenderProjectCatalogLoading",
  "autoRenderProjectCatalogError",
  "selectedAutoRenderForm",
  "autoRenderWorkerKey",
  "availableRenderWorkers",
  "autoRenderLaunchMode",
  "autoRenderScheduledMode",
  "autoRenderScheduledAt",
  "autoRenderOffscreen",
  "autoRenderExportDestinationIds",
  "renderExportDestinationOptions",
  "autoRenderFormFieldsLoading",
  "autoRenderFormFieldsError",
  "visibleAutoRenderFormFields",
  "autoRenderFormValues",
  "autoExpectedRenderName",
  "autoOutputType",
  "formError",
  "taskSequenceName",
  "projectCatalogSequenceOptions",
];

const LIFECYCLE_KEYS = [
  "closeTaskForm",
];

const EDITOR_KEYS = [
  "autoSaveEditedTaskOnBlur",
  "handleUpdateAutoRenderFormValue",
  "canSubmitTaskForm",
  "submitTaskFormDisabled",
  "submitTaskFormLabel",
  "handleSubmitTaskForm",
  "reservedRenderId",
];

const UI_KEYS = [
  "changeAutoRenderProject",
  "changeAutoRenderForm",
  "changeAutoRenderTemplate",
  "changeAutoRenderWorker",
  "changeAssigneeUserId",
  "changeAutoRenderLaunchMode",
  "changeAutoRenderScheduledMode",
  "changeAutoRenderScheduledAt",
  "changeAutoRenderSequence",
  "changeAutoRenderOffscreen",
  "changeAutoRenderExportDestinationIds",
];

const DIALOG_KEYS = [
  "openDeleteTaskDialog",
];

export function buildRenderEditorSectionPropsInputEditor({
  data = {},
  lifecycle = {},
  editor = {},
  ui = {},
  dialog = {},
} = {}) {
  return {
    ...pickKeys(data, DATA_KEYS),
    ...pickKeys(lifecycle, LIFECYCLE_KEYS),
    ...pickKeys(editor, EDITOR_KEYS),
    ...pickKeys(ui, UI_KEYS),
    ...pickKeys(dialog, DIALOG_KEYS),
  };
}
