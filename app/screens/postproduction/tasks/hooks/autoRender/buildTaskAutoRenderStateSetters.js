function buildTaskAutoRenderStateSetters({
  setExpectedRenderCountInput = null,
  setAutoRenderProjectRef = null,
  setAutoRenderWorkerKey = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
  setAutoRenderLaunchMode = null,
  setAutoRenderScheduledMode = null,
  setAutoRenderScheduledAt = null,
  setTaskSequenceName = null,
  setAutoRenderOffscreen = null,
  setAutoRenderExportDestinationIds = null,
} = {}) {
  return {
    setExpectedRenderCountInput,
    setAutoRenderProjectRef,
    setAutoRenderWorkerKey,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setAutoRenderLaunchMode,
    setAutoRenderScheduledMode,
    setAutoRenderScheduledAt,
    setTaskSequenceName,
    setAutoRenderOffscreen,
    setAutoRenderExportDestinationIds,
  };
}

export {
  buildTaskAutoRenderStateSetters,
};

export default buildTaskAutoRenderStateSetters;
