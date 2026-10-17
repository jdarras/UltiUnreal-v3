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
import {
  normalizeLaunchMode,
  normalizeScheduledMode,
  normalizeScheduledAt,
} from "../../../shared/autoRenderHelpers";

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
  taskSequenceName = "",
  autoRenderOffscreen = false,
  autoRenderExportDestinationIds = [],
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
  allowAssignmentDraft = false,
} = {}) {
  const expectedRenderCount = normalizeTaskExpectedRenderCountInput(expectedRenderCountInput);
  const expectedRenderNames = buildTaskExpectedRenderNamesPreview(title, expectedRenderCount);
  const selectedTemplatePayload = {};
  const assignmentDraftMode = allowAssignmentDraft === true;

  if (!assignmentDraftMode && renderTemplatesForSelectedAutoForm.length > 0 && !selectedAutoRenderTemplate) {
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
    taskSequenceName,
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
  if (!assignmentDraftMode && missingRequiredField) {
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
    requireCompleteAutoRenderConfig: assignmentDraftMode !== true,
  });
  if (resolvedContextError) {
    return {
      ok: false,
      error: resolvedContextError,
    };
  }

  const launchMode = assignmentDraftMode ? "" : normalizeLaunchMode(autoRenderLaunchMode);
  const scheduledMode = (
    assignmentDraftMode || launchMode !== "scheduled"
      ? ""
      : normalizeScheduledMode(autoRenderScheduledMode)
  );
  const scheduledAt = (
    assignmentDraftMode
      ? ""
      : (
        launchMode === "scheduled" && scheduledMode === "datetime"
          ? normalizeScheduledAt(autoRenderScheduledAt)
          : ""
      )
  );

  const { basePayload, autoRenderConfig } = buildAutoRenderPayloads({
    selectedTemplatePayload,
    selectedFormData,
    formProjectRef: context.formProjectRef,
    effectiveMapName: context.effectiveMapName,
    effectiveSequenceName: context.effectiveSequenceName,
    effectiveOutputProfile: context.effectiveOutputProfile,
    effectiveWrcPresetName: context.effectiveWrcPresetName,
    effectiveWrcPresetPath: context.effectiveWrcPresetPath,
    effectiveRenderPresetName: context.effectiveRenderPresetName,
    effectiveWorkerKey: context.effectiveWorkerKey,
    renderStation: context.renderStation,
    renderStationName: context.renderStationName,
    effectiveOutputDir: context.effectiveOutputDir,
    effectiveTemplateName: context.effectiveTemplateName,
    effectiveProjectPath: context.effectiveProjectPath,
    selectedFormIdNum: context.selectedFormIdNum,
    autoRenderOffscreen: autoRenderOffscreen === true,
    autoRenderExportDestinationIds,
    autoRenderLaunchMode: launchMode,
    autoRenderScheduledMode: scheduledMode,
    autoRenderScheduledAt: scheduledAt,
  });

  if (assignmentDraftMode) {
    autoRenderConfig.assignmentDraft = true;
  }

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
  assigneeUserId = null,
  expectedRenderCount = 1,
  expectedRenderNames = [],
  projectRef = "",
  autoRenderConfig = null,
  selectedResourceRefs = [],
} = {}) {
  const normalizedProjectRef = String(projectRef || "").trim();
  const taskPayload = {
    title,
    description,
    status: "A faire",
    priority: 3,
    requestType: "auto_render",
    expectedRenderCount,
    expectedRenderNames,
    projectRefs: normalizedProjectRef ? [normalizedProjectRef] : [],
    autoRenderConfig,
    assigneeUserId: (() => {
      if (assigneeUserId == null || assigneeUserId === "") return null;
      const parsed = Number(assigneeUserId);
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return Math.trunc(parsed);
    })(),
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
