import { pickKeys } from "../../../shared/objectProps";

const DATA_KEYS = [
  "isEditingTask",
  "editingTaskVisualStatusKey",
  "title",
  "description",
  "assigneeUserId",
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

export function buildRenderEditorSectionPropsInputEditor({
  data = {},
  lifecycle = {},
  editor = {},
  ui = {},
} = {}) {
  return {
    ...pickKeys(data, DATA_KEYS),
    ...pickKeys(lifecycle, LIFECYCLE_KEYS),
    ...pickKeys(editor, EDITOR_KEYS),
    ...pickKeys(ui, UI_KEYS),
  };
}

export default buildRenderEditorSectionPropsInputEditor;
