function buildRenderEditorStatusMessagesProps({
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
  buildRenderEditorStatusMessagesProps,
};
