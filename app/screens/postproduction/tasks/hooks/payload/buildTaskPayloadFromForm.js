import { safeT } from "../../../shared/helpers";
import {
  buildTaskExpectedRenderNamesPreview,
  normalizeTaskExpectedRenderCountInput,
} from "../../helpers";
import {
  buildAutoRenderPayloads,
  buildSelectedFormData,
  resolveAutoRenderContext,
} from "./autoRenderPayloadBuilder";
import {
  buildInvalidFormFieldError,
  buildMissingRequiredFieldError,
  validateResolvedAutoRenderContext,
  validateTaskPayloadInputs,
} from "./taskPayloadGuards";

export function buildTaskPayloadFromForm({
  t,
  title = "",
  description = "",
  expectedRenderCountInput = "1",
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  autoRenderWorkerKey = "",
  renderOutputDir = "",
  selectedAutoRenderTemplate = null,
  renderTemplatesForSelectedAutoForm = [],
  autoRenderFormFields = [],
  autoRenderFormValues = {},
  selectedResourceRefs = [],
  selectedAutoRenderForm = null,
  selectedAutoRenderProjectRef = "",
  projectOptionByRef = new Map(),
  projectLookupByAny = new Map(),
} = {}) {
  const selectedForm = selectedAutoRenderForm;
  const inputValidationError = validateTaskPayloadInputs({
    t,
    title,
    renderOutputDir,
    filteredAutoRenderForms,
    autoRenderFormId,
    selectedForm,
  });
  if (inputValidationError) {
    return {
      ok: false,
      error: inputValidationError,
    };
  }

  const expectedRenderCount = normalizeTaskExpectedRenderCountInput(expectedRenderCountInput);
  const expectedRenderNames = buildTaskExpectedRenderNamesPreview(title, expectedRenderCount);
  const selectedTemplatePayload = {};
  const formProjectRef = String(selectedAutoRenderProjectRef || selectedForm?.projectName || "").trim();
  if (renderTemplatesForSelectedAutoForm.length > 0 && !selectedAutoRenderTemplate) {
    return {
      ok: false,
      error: safeT(
        t,
        "postprod.tasks.form.renderMode.required",
        "Selectionne un mode de rendu."
      ),
    };
  }
  const {
    effectiveMapName,
    effectiveSequenceName,
    effectiveOutputProfile,
    effectiveWrcPresetName,
    effectiveRenderPresetName,
    effectiveWorkerKey,
    effectiveOutputDir,
    effectiveTemplateName,
    effectiveProjectPath,
    selectedFormIdNum,
  } = resolveAutoRenderContext({
    selectedForm,
    selectedAutoRenderTemplate,
    selectedAutoRenderProjectRef,
    projectOptionByRef,
    projectLookupByAny,
    autoRenderWorkerKey,
    renderOutputDir,
    autoRenderFormId,
  });
  const {
    selectedFormData,
    invalidFormField,
    missingRequiredField,
  } = buildSelectedFormData({
    autoRenderFormFields,
    autoRenderFormValues,
  });
  if (invalidFormField) {
    return {
      ok: false,
      error: buildInvalidFormFieldError(t, invalidFormField),
    };
  }
  if (missingRequiredField) {
    return {
      ok: false,
      error: buildMissingRequiredFieldError(t, missingRequiredField),
    };
  }
  const resolvedContextError = validateResolvedAutoRenderContext({
    t,
    formProjectRef,
    effectiveTemplateName,
    effectiveProjectPath,
    effectiveMapName,
    effectiveSequenceName,
    effectiveOutputProfile,
  });
  if (resolvedContextError) {
    return {
      ok: false,
      error: resolvedContextError,
    };
  }
  const { basePayload, autoRenderConfig } = buildAutoRenderPayloads({
    selectedTemplatePayload,
    selectedFormData,
    formProjectRef,
    effectiveMapName,
    effectiveSequenceName,
    effectiveOutputProfile,
    effectiveWrcPresetName,
    effectiveRenderPresetName,
    effectiveWorkerKey,
    effectiveOutputDir,
    effectiveTemplateName,
    effectiveProjectPath,
    selectedFormIdNum,
  });
  const taskPayload = {
    title,
    description,
    status: "A faire",
    priority: 3,
    requestType: "auto_render",
    expectedRenderCount,
    expectedRenderNames,
    projectRefs: [formProjectRef],
    autoRenderConfig,
  };
  if (Array.isArray(selectedResourceRefs) && selectedResourceRefs.length > 0) {
    taskPayload.resourceRefs = selectedResourceRefs
      .map((ref) => String(ref || "").trim())
      .filter(Boolean);
  }
  return {
    ok: true,
    taskPayload,
    expectedRenderCount,
    expectedRenderNames,
    basePayload,
    effectiveTemplateName,
    projectRef: formProjectRef,
  };
}

export default buildTaskPayloadFromForm;
