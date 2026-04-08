export function buildTasksSectionPropsInputBase({
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
} = {}) {
  return {
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
  };
}

export default buildTasksSectionPropsInputBase;
