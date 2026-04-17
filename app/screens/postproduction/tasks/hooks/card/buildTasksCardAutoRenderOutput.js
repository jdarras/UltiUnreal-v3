function buildTasksCardAutoRenderOutput({
  autoRender = {},
  buildTaskPayloadFromCurrentForm = null,
} = {}) {
  return {
    autoRenderWorkerKey: autoRender.autoRenderWorkerKey,
    setAutoRenderWorkerKey: autoRender.setAutoRenderWorkerKey,
    autoRenderProjectRef: autoRender.autoRenderProjectRef,
    setAutoRenderProjectRef: autoRender.setAutoRenderProjectRef,
    autoRenderFormId: autoRender.autoRenderFormId,
    setAutoRenderFormId: autoRender.setAutoRenderFormId,
    autoRenderTemplateId: autoRender.autoRenderTemplateId,
    setAutoRenderTemplateId: autoRender.setAutoRenderTemplateId,
    autoRenderFormFields: autoRender.autoRenderFormFields,
    autoRenderFormFieldsLoading: autoRender.autoRenderFormFieldsLoading,
    autoRenderFormFieldsError: autoRender.autoRenderFormFieldsError,
    autoRenderFormValues: autoRender.autoRenderFormValues,
    setAutoRenderFormValues: autoRender.setAutoRenderFormValues,
    autoRenderProjectCatalogLoading: autoRender.autoRenderProjectCatalogLoading,
    autoRenderProjectCatalogError: autoRender.autoRenderProjectCatalogError,
    autoRenderLaunchMode: autoRender.autoRenderLaunchMode,
    setAutoRenderLaunchMode: autoRender.setAutoRenderLaunchMode,
    autoRenderScheduledMode: autoRender.autoRenderScheduledMode,
    setAutoRenderScheduledMode: autoRender.setAutoRenderScheduledMode,
    autoRenderScheduledAt: autoRender.autoRenderScheduledAt,
    setAutoRenderScheduledAt: autoRender.setAutoRenderScheduledAt,
    filteredAutoRenderForms: autoRender.filteredAutoRenderForms,
    selectedAutoRenderForm: autoRender.selectedAutoRenderForm,
    visibleAutoRenderFormFields: autoRender.visibleAutoRenderFormFields,
    renderTemplatesForSelectedAutoForm: autoRender.renderTemplatesForSelectedAutoForm,
    autoExpectedRenderName: autoRender.autoExpectedRenderName,
    taskSequenceName: autoRender.taskSequenceName,
    setTaskSequenceName: autoRender.setTaskSequenceName,
    projectCatalogSequenceOptions: autoRender.projectCatalogSequenceOptions,
    resetAutoRenderState: autoRender.resetAutoRenderState,
    hydrateAutoRenderFromTask: autoRender.hydrateAutoRenderFromTask,
    buildTaskPayloadFromCurrentForm,
  };
}

export {
  buildTasksCardAutoRenderOutput,
};

export default buildTasksCardAutoRenderOutput;
