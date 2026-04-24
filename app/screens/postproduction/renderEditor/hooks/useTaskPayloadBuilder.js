import { useCallback } from "react";
import { buildTaskPayloadFromForm } from "./payload/buildTaskPayloadFromForm";

export function useTaskPayloadBuilder({
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
}) {
  const buildTaskPayloadFromCurrentForm = useCallback(() => (
    buildTaskPayloadFromForm({
      t,
      title,
      description,
      assigneeUserId,
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
      availableRenderWorkers,
      taskSequenceName,
      autoRenderOffscreen,
      autoRenderExportDestinationIds,
    })
  ), [
    t,
    title,
    description,
    assigneeUserId,
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
    availableRenderWorkers,
    taskSequenceName,
    autoRenderOffscreen,
    autoRenderExportDestinationIds,
  ]);

  return {
    buildTaskPayloadFromCurrentForm,
  };
}

export default useTaskPayloadBuilder;
