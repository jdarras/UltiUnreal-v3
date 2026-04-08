import { buildTasksSectionPropsInputBase } from "./buildTasksSectionPropsInputBase";
import { buildTasksSectionPropsInputBrowse } from "./buildTasksSectionPropsInputBrowse";
import { buildTasksSectionPropsInputDialog } from "./buildTasksSectionPropsInputDialog";
import { buildTasksSectionPropsInputEditor } from "./buildTasksSectionPropsInputEditor";

export function buildTasksSectionPropsInput({
  t,
  tasksLoading = false,
  tasksError = "",
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  canCreateTasks = false,
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  data = {},
  lifecycle = {},
  editor = {},
  ui = {},
  dialog = {},
} = {}) {
  return {
    ...buildTasksSectionPropsInputBase({
      t,
      tasksLoading,
      tasksError,
      renderFormsLoading,
      renderFormsError,
      canManageRenderTemplates,
      canCreateTasks,
      renderWorkersLoading,
      renderWorkersError,
      renderOutputDir,
    }),
    ...buildTasksSectionPropsInputBrowse({
      data,
      lifecycle,
      ui,
    }),
    ...buildTasksSectionPropsInputEditor({
      data,
      lifecycle,
      editor,
      ui,
    }),
    ...buildTasksSectionPropsInputDialog({
      dialog,
    }),
  };
}

export default buildTasksSectionPropsInput;
