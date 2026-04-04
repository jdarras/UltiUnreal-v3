function buildTasksStatusMessagesProps({
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

export {
  buildTasksStatusMessagesProps,
};

export default buildTasksStatusMessagesProps;
