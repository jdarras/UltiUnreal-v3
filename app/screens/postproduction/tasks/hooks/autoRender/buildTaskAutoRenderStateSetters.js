function buildTaskAutoRenderStateSetters({
  setExpectedRenderCountInput = null,
  setAutoRenderProjectRef = null,
  setAutoRenderWorkerKey = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
  setAutoRenderLaunchMode = null,
} = {}) {
  return {
    setExpectedRenderCountInput,
    setAutoRenderProjectRef,
    setAutoRenderWorkerKey,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setAutoRenderLaunchMode,
  };
}

export {
  buildTaskAutoRenderStateSetters,
};

export default buildTaskAutoRenderStateSetters;
