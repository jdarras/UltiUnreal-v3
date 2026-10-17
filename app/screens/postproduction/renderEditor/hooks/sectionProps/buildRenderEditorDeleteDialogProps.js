function buildRenderEditorDeleteDialogProps({
  t,
  deleteDialogTask = null,
  deleteDialogBusy = false,
  deleteDialogOkBtnRef = null,
  closeDeleteTaskDialog = null,
} = {}) {
  return {
    t,
    task: deleteDialogTask,
    busy: deleteDialogBusy,
    confirmRef: deleteDialogOkBtnRef,
    onCancel: () => {
      void closeDeleteTaskDialog?.(false);
    },
    onConfirm: () => {
      void closeDeleteTaskDialog?.(true);
    },
  };
}

export {
  buildRenderEditorDeleteDialogProps,
};
