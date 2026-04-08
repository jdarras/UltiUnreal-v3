import {
  buildTaskExpectedRenderNamesPreview,
  normalizeTaskExpectedRenderCountInput,
} from "../../helpers";

function buildVisibleAutoRenderFormFields(autoRenderFormFields = []) {
  const list = Array.isArray(autoRenderFormFields) ? autoRenderFormFields : [];
  return list
    .filter((field) => field?.isVisible !== false)
    .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
}

function buildExpectedRenderMeta({
  title = "",
  expectedRenderCountInput = "1",
} = {}) {
  const expectedRenderCountForForm = normalizeTaskExpectedRenderCountInput(expectedRenderCountInput);
  const expectedRenderNamesPreview = buildTaskExpectedRenderNamesPreview(title, expectedRenderCountForForm);
  const autoExpectedRenderName = String(expectedRenderNamesPreview[0] || "").trim();
  return {
    expectedRenderCountForForm,
    expectedRenderNamesPreview,
    autoExpectedRenderName,
  };
}

function applyAutoRenderStateSetters(stateSetters = {}, nextState = {}) {
  stateSetters.setExpectedRenderCountInput?.(nextState.expectedRenderCountInput);
  stateSetters.setAutoRenderProjectRef?.(nextState.autoRenderProjectRef);
  stateSetters.setAutoRenderWorkerKey?.(nextState.autoRenderWorkerKey);
  stateSetters.setAutoRenderFormId?.(nextState.autoRenderFormId);
  stateSetters.setAutoRenderTemplateId?.(nextState.autoRenderTemplateId);
  stateSetters.setAutoRenderFormValues?.(nextState.autoRenderFormValues);
  stateSetters.setAutoRenderLaunchMode?.(nextState.autoRenderLaunchMode);
}

export {
  applyAutoRenderStateSetters,
  buildExpectedRenderMeta,
  buildVisibleAutoRenderFormFields,
};

export default buildVisibleAutoRenderFormFields;
