import { pickKeys } from "../../../shared/objectProps";

const STATE_KEYS = [
  "expectedRenderCountInput",
  "setExpectedRenderCountInput",
  "autoRenderProjectRef",
  "setAutoRenderProjectRef",
  "autoRenderWorkerKey",
  "setAutoRenderWorkerKey",
  "autoRenderFormId",
  "setAutoRenderFormId",
  "autoRenderTemplateId",
  "setAutoRenderTemplateId",
  "autoRenderFormValues",
  "setAutoRenderFormValues",
  "autoRenderLaunchMode",
  "setAutoRenderLaunchMode",
];

const DATA_KEYS = [
  "autoRenderFormFields",
  "autoRenderFormFieldsLoading",
  "autoRenderFormFieldsError",
  "autoRenderProjectCatalogLoading",
  "autoRenderProjectCatalogError",
  "filteredAutoRenderForms",
  "selectedAutoRenderForm",
  "visibleAutoRenderFormFields",
  "selectedAutoRenderProjectRef",
  "renderTemplatesForSelectedAutoForm",
  "selectedAutoRenderTemplate",
  "expectedRenderCountForForm",
  "expectedRenderNamesPreview",
  "autoExpectedRenderName",
  "projectOptionByRef",
  "projectLookupByAny",
  "availableRenderWorkers",
  "resetAutoRenderState",
  "hydrateAutoRenderFromTask",
];

function buildTaskAutoRenderControllerOutput(state = {}) {
  return {
    ...pickKeys(state, STATE_KEYS),
    ...pickKeys(state, DATA_KEYS),
  };
}

export {
  buildTaskAutoRenderControllerOutput,
};

export default buildTaskAutoRenderControllerOutput;
