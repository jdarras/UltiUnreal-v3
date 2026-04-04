import { buildRendersSectionPropsInputBase } from "./buildRendersSectionPropsInputBase";
import { buildRendersSectionPropsInputData } from "./buildRendersSectionPropsInputData";

export function buildRendersSectionPropsInput({
  t,
  rendersLoading = false,
  tasksLoading = false,
  onScanDetectedRenders = null,
  onTransitionRender = null,
  data = {},
  helpers = {},
} = {}) {
  return {
    ...buildRendersSectionPropsInputBase({
      t,
      rendersLoading,
      tasksLoading,
      onScanDetectedRenders,
      onTransitionRender,
      helpers,
    }),
    ...buildRendersSectionPropsInputData(data),
  };
}

export default buildRendersSectionPropsInput;
