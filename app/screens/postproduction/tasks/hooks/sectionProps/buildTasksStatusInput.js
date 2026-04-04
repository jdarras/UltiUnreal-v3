export function buildTasksStatusInput({
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

export default buildTasksStatusInput;
