import { useTaskAutoRenderController } from "../useTaskAutoRenderController";
import { useTaskPayloadBuilder } from "../useTaskPayloadBuilder";
import {
  buildTaskAutoRenderControllerInput,
  buildTaskPayloadBuilderInput,
} from "./buildTasksCardAutoRenderInput";
import { buildTasksCardAutoRenderOutput } from "./buildTasksCardAutoRenderOutput";

export function useTasksCardAutoRenderData({
  t,
  title = "",
  description = "",
  renderOutputDir = "",
  renderForms = [],
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
      renderOutputDir,
      selectedResourceRefs,
      autoRender,
    }),
  });

  return buildTasksCardAutoRenderOutput({
    autoRender,
    buildTaskPayloadFromCurrentForm,
  });
}

export default useTasksCardAutoRenderData;
