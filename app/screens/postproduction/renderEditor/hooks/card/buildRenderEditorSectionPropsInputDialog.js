export function buildRenderEditorSectionPropsInputDialog({
  dialog = {},
} = {}) {
  return {
    deleteDialogTask: dialog.deleteDialogTask,
    deleteDialogBusy: dialog.deleteDialogBusy,
    deleteDialogOkBtnRef: dialog.deleteDialogOkBtnRef,
    closeDeleteTaskDialog: dialog.closeDeleteTaskDialog,
  };
}
