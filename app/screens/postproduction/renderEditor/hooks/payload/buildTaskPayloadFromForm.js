import {
  validateTaskPayloadInputs,
} from "./taskPayloadGuards";
import {
  buildTaskPayloadFromResolvedContext,
  resolveTaskPayloadBuildContext,
} from "./buildTaskPayloadFromFormHelpers";

export function buildTaskPayloadFromForm({
  t,
  title = "",
  description = "",
  assigneeUserId = null,
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
  availableRenderWorkers = [],
  taskSequenceName = "",
  autoRenderOffscreen = false,
  autoRenderExportDestinationIds = [],
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
  allowAssignmentDraft = false,
} = {}) {
  const selectedForm = selectedAutoRenderForm;
  const assignmentDraftMode = allowAssignmentDraft === true;
  const inputValidationError = validateTaskPayloadInputs({
    t,
    title,
    renderOutputDir,
    filteredAutoRenderForms,
    autoRenderFormId,
    selectedForm,
    requireCompleteAutoRenderConfig: assignmentDraftMode !== true,
  });
  if (inputValidationError) {
    return {
      ok: false,
      error: inputValidationError,
    };
  }

  const context = resolveTaskPayloadBuildContext({
    t,
    title,
    expectedRenderCountInput,
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
    selectedAutoRenderProjectRef,
    selectedForm,
    projectOptionByRef,
    projectLookupByAny,
    availableRenderWorkers,
    autoRenderWorkerKey,
    renderOutputDir,
    autoRenderFormId,
    autoRenderFormFields,
    autoRenderFormValues,
    taskSequenceName,
    autoRenderOffscreen,
    autoRenderExportDestinationIds,
    autoRenderLaunchMode,
    autoRenderScheduledMode,
    autoRenderScheduledAt,
    allowAssignmentDraft: assignmentDraftMode,
  });

  if (!context.ok) {
    return {
      ok: false,
      error: context.error,
    };
  }

  const taskPayload = buildTaskPayloadFromResolvedContext({
    title,
    description,
    assigneeUserId,
    expectedRenderCount: context.expectedRenderCount,
    expectedRenderNames: context.expectedRenderNames,
    projectRef: context.projectRef,
    autoRenderConfig: context.autoRenderConfig,
    selectedResourceRefs,
  });

  return {
    ok: true,
    taskPayload,
    expectedRenderCount: context.expectedRenderCount,
    expectedRenderNames: context.expectedRenderNames,
    basePayload: context.basePayload,
    effectiveTemplateName: context.effectiveTemplateName,
    projectRef: context.projectRef,
    renderStation: context.renderStation,
    renderStationName: context.renderStationName,
  };
}

export default buildTaskPayloadFromForm;
