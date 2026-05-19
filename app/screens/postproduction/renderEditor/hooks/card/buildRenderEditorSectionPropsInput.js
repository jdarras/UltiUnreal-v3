import { buildRenderEditorSectionPropsInputBase } from "./buildRenderEditorSectionPropsInputBase";
import { buildRenderEditorSectionPropsInputBrowse } from "./buildRenderEditorSectionPropsInputBrowse";
import { buildRenderEditorSectionPropsInputDialog } from "./buildRenderEditorSectionPropsInputDialog";
import { buildRenderEditorSectionPropsInputEditor } from "./buildRenderEditorSectionPropsInputEditor";

export function buildRenderEditorSectionPropsInput({
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
    ...buildRenderEditorSectionPropsInputBase({
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
    ...buildRenderEditorSectionPropsInputBrowse({
      data,
      lifecycle,
      ui,
    }),
    ...buildRenderEditorSectionPropsInputEditor({
      data,
      lifecycle,
      editor,
      ui,
      dialog,
    }),
    ...buildRenderEditorSectionPropsInputDialog({
      dialog,
    }),
  };
}
