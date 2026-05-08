import { useTaskAutoRenderController } from "../useTaskAutoRenderController";
import { useTaskPayloadBuilder } from "../useTaskPayloadBuilder";
import {
  buildTaskAutoRenderControllerInput,
  buildTaskPayloadBuilderInput,
} from "./buildRenderEditorAutoRenderInput";
import { buildRenderEditorAutoRenderOutput } from "./buildRenderEditorAutoRenderOutput";

export function useRenderEditorCardAutoRenderData({
  t,
  title = "",
  description = "",
  assigneeUserId = null,
  assigneeIsCurrentUser = true,
  renderOutputDir = "",
  renderForms = [],
  renderFormsLoading = false,
  normalizedProjectOptions = [],
  normalizedRenderTemplateOptions = [],
  availableRenderWorkers = [],
  selectedResourceRefs = [],
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
} = {}) {
  const autoRender = useTaskAutoRenderController(
    buildTaskAutoRenderControllerInput({
      t,
      title,
      normalizedProjectOptions,
      normalizedRenderTemplateOptions,
      renderForms,
      renderFormsLoading,
      availableRenderWorkers,
      onLoadRenderFormFields,
      onLoadProjectUnrealCatalog,
    })
  );

  const { buildTaskPayloadFromCurrentForm } = useTaskPayloadBuilder({
    ...buildTaskPayloadBuilderInput({
      t,
      title,
      description,
      assigneeUserId,
      assigneeIsCurrentUser,
      renderOutputDir,
      selectedResourceRefs,
      autoRender,
    }),
  });

  return buildRenderEditorAutoRenderOutput({
    autoRender,
    buildTaskPayloadFromCurrentForm,
  });
}

export default useRenderEditorCardAutoRenderData;
