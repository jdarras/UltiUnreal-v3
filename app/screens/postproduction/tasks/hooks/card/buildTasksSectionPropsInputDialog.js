export function buildTasksSectionPropsInputDialog({
  dialog = {},
} = {}) {
  return {
    deleteDialogTask: dialog.deleteDialogTask,
    deleteDialogBusy: dialog.deleteDialogBusy,
    deleteDialogOkBtnRef: dialog.deleteDialogOkBtnRef,
    closeDeleteTaskDialog: dialog.closeDeleteTaskDialog,
  };
}

export default buildTasksSectionPropsInputDialog;
