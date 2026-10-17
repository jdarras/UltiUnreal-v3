function buildTaskAutoRenderControllerInput({
  t,
  title = "",
  normalizedProjectOptions = [],
  normalizedRenderTemplateOptions = [],
  renderForms = [],
  renderFormsLoading = false,
  availableRenderWorkers = [],
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
} = {}) {
  return {
    t,
    title,
    normalizedProjectOptions,
    normalizedRenderTemplateOptions,
    renderForms,
    renderFormsLoading,
    availableRenderWorkers,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
  };
}

function buildTaskPayloadBuilderInput({
  t,
  title = "",
  description = "",
  assigneeUserId = null,
  assigneeIsCurrentUser = true,
  renderOutputDir = "",
  selectedResourceRefs = [],
  autoRender = {},
} = {}) {
  return {
    t,
    title,
    description,
    assigneeUserId,
    expectedRenderCountInput: autoRender.expectedRenderCountInput,
    filteredAutoRenderForms: autoRender.filteredAutoRenderForms,
    autoRenderFormId: autoRender.autoRenderFormId,
    autoRenderWorkerKey: autoRender.autoRenderWorkerKey,
    renderOutputDir,
    selectedAutoRenderTemplate: autoRender.selectedAutoRenderTemplate,
    renderTemplatesForSelectedAutoForm: autoRender.renderTemplatesForSelectedAutoForm,
    autoRenderFormFields: autoRender.autoRenderFormFields,
    autoRenderFormValues: autoRender.autoRenderFormValues,
    selectedResourceRefs,
    selectedAutoRenderForm: autoRender.selectedAutoRenderForm,
    selectedAutoRenderProjectRef: autoRender.selectedAutoRenderProjectRef,
    projectOptionByRef: autoRender.projectOptionByRef,
    projectLookupByAny: autoRender.projectLookupByAny,
    availableRenderWorkers: autoRender.availableRenderWorkers,
    taskSequenceName: autoRender.taskSequenceName,
    autoRenderOffscreen: autoRender.autoRenderOffscreen,
    autoRenderExportDestinationIds: autoRender.autoRenderExportDestinationIds,
    autoRenderLaunchMode: autoRender.autoRenderLaunchMode,
    autoRenderScheduledMode: autoRender.autoRenderScheduledMode,
    autoRenderScheduledAt: autoRender.autoRenderScheduledAt,
    allowAssignmentDraft: assigneeIsCurrentUser !== true,
  };
}

export {
  buildTaskAutoRenderControllerInput,
  buildTaskPayloadBuilderInput,
};
