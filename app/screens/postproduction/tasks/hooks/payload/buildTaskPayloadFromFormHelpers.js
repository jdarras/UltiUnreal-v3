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
} from "./taskPayloadGuards";

function buildMissingRenderModeError(t) {
  return safeT(
    t,
    "postprod.tasks.form.renderMode.required",
    "Selectionne un mode de rendu."
  );
}

function resolveTaskPayloadBuildContext({
  t,
  title = "",
  expectedRenderCountInput = "1",
  renderTemplatesForSelectedAutoForm = [],
  selectedAutoRenderTemplate = null,
  selectedAutoRenderProjectRef = "",
  selectedForm = null,
  projectOptionByRef = new Map(),
  projectLookupByAny = new Map(),
  availableRenderWorkers = [],
  autoRenderWorkerKey = "",
  renderOutputDir = "",
  autoRenderFormId = "",
  autoRenderFormFields = [],
  autoRenderFormValues = {},
} = {}) {
  const expectedRenderCount = normalizeTaskExpectedRenderCountInput(expectedRenderCountInput);
  const expectedRenderNames = buildTaskExpectedRenderNamesPreview(title, expectedRenderCount);
  const selectedTemplatePayload = {};

  if (renderTemplatesForSelectedAutoForm.length > 0 && !selectedAutoRenderTemplate) {
    return {
      ok: false,
      error: buildMissingRenderModeError(t),
    };
  }

  const context = resolveAutoRenderContext({
    selectedForm,
    selectedAutoRenderTemplate,
    selectedAutoRenderProjectRef,
    projectOptionByRef,
    projectLookupByAny,
    renderWorkerLookupByKey: (() => {
      const lookup = new Map();
      const list = Array.isArray(availableRenderWorkers) ? availableRenderWorkers : [];
      for (const worker of list) {
        const key = String(worker?.workerKey || worker?.ip || "").trim();
        if (!key || lookup.has(key)) continue;
        lookup.set(key, worker);
      }
      return lookup;
    })(),
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
    formProjectRef: context.formProjectRef,
    effectiveTemplateName: context.effectiveTemplateName,
    effectiveProjectPath: context.effectiveProjectPath,
    effectiveMapName: context.effectiveMapName,
    effectiveSequenceName: context.effectiveSequenceName,
    effectiveOutputProfile: context.effectiveOutputProfile,
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
    formProjectRef: context.formProjectRef,
    effectiveMapName: context.effectiveMapName,
    effectiveSequenceName: context.effectiveSequenceName,
    effectiveOutputProfile: context.effectiveOutputProfile,
    effectiveWrcPresetName: context.effectiveWrcPresetName,
    effectiveRenderPresetName: context.effectiveRenderPresetName,
    effectiveWorkerKey: context.effectiveWorkerKey,
    renderStation: context.renderStation,
    renderStationName: context.renderStationName,
    effectiveOutputDir: context.effectiveOutputDir,
    effectiveTemplateName: context.effectiveTemplateName,
    effectiveProjectPath: context.effectiveProjectPath,
    selectedFormIdNum: context.selectedFormIdNum,
  });

  return {
    ok: true,
    expectedRenderCount,
    expectedRenderNames,
    basePayload,
    autoRenderConfig,
    effectiveTemplateName: context.effectiveTemplateName,
    projectRef: context.formProjectRef,
    renderStation: context.renderStation,
    renderStationName: context.renderStationName,
  };
}

function buildTaskPayloadFromResolvedContext({
  title = "",
  description = "",
  expectedRenderCount = 1,
  expectedRenderNames = [],
  projectRef = "",
  autoRenderConfig = null,
  selectedResourceRefs = [],
} = {}) {
  const taskPayload = {
    title,
    description,
    status: "A faire",
    priority: 3,
    requestType: "auto_render",
    expectedRenderCount,
    expectedRenderNames,
    projectRefs: [projectRef],
    autoRenderConfig,
  };

  if (Array.isArray(selectedResourceRefs) && selectedResourceRefs.length > 0) {
    taskPayload.resourceRefs = selectedResourceRefs
      .map((ref) => String(ref || "").trim())
      .filter(Boolean);
  }

  return taskPayload;
}

export {
  resolveTaskPayloadBuildContext,
  buildTaskPayloadFromResolvedContext,
};

export default resolveTaskPayloadBuildContext;
