import { useCallback } from "react";
import { buildTaskPayloadFromForm } from "./payload/buildTaskPayloadFromForm";

export function useTaskPayloadBuilder({
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
}) {
  const buildTaskPayloadFromCurrentForm = useCallback(() => (
    buildTaskPayloadFromForm({
      t,
      title,
      description,
      expectedRenderCountInput,
      filteredAutoRenderForms,
      autoRenderFormId,
      autoRenderWorkerKey,
      renderOutputDir,
      selectedAutoRenderTemplate,
      renderTemplatesForSelectedAutoForm,
      autoRenderFormFields,
      autoRenderFormValues,
      selectedResourceRefs,
      selectedAutoRenderForm,
      selectedAutoRenderProjectRef,
      projectOptionByRef,
      projectLookupByAny,
    })
  ), [
    t,
    title,
    description,
    expectedRenderCountInput,
    filteredAutoRenderForms,
    autoRenderFormId,
    autoRenderWorkerKey,
    renderOutputDir,
    selectedAutoRenderTemplate,
    renderTemplatesForSelectedAutoForm,
    autoRenderFormFields,
    autoRenderFormValues,
    selectedResourceRefs,
    selectedAutoRenderForm,
    selectedAutoRenderProjectRef,
    projectOptionByRef,
    projectLookupByAny,
  ]);

  return {
    buildTaskPayloadFromCurrentForm,
  };
}

export default useTaskPayloadBuilder;
