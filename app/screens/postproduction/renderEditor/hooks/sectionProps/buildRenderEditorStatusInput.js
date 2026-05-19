export function buildRenderEditorStatusInput({
  t,
  tasksError = "",
  tasksLoading = false,
  showCreateForm = false,
} = {}) {
  return {
    t,
    tasksError,
    tasksLoading,
    showCreateForm,
  };
}
