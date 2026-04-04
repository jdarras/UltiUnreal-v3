export function buildTasksDeleteDialogInput({
  t,
  deleteDialogTask = null,
  deleteDialogBusy = false,
  deleteDialogOkBtnRef = null,
  closeDeleteTaskDialog = null,
} = {}) {
  return {
    t,
    deleteDialogTask,
    deleteDialogBusy,
    deleteDialogOkBtnRef,
    closeDeleteTaskDialog,
  };
}

export default buildTasksDeleteDialogInput;
