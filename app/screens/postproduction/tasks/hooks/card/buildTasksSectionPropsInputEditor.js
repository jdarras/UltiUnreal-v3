import { pickKeys } from "../../../shared/objectProps";

const DATA_KEYS = [
  "isEditingTask",
  "title",
  "description",
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
  "autoRenderFormFieldsLoading",
  "autoRenderFormFieldsError",
  "visibleAutoRenderFormFields",
  "autoRenderFormValues",
  "autoExpectedRenderName",
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
  "submitTaskFormLabel",
  "handleSubmitTaskForm",
];

const UI_KEYS = [
  "changeAutoRenderProject",
  "changeAutoRenderForm",
  "changeAutoRenderTemplate",
  "changeAutoRenderWorker",
  "changeAutoRenderLaunchMode",
  "changeAutoRenderScheduledMode",
  "changeAutoRenderScheduledAt",
  "changeAutoRenderSequence",
];

export function buildTasksSectionPropsInputEditor({
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

export default buildTasksSectionPropsInputEditor;
