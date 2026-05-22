import { ConfirmDialog } from '../../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../../components/confirmDialogLabels';

export function useSyncConfirmDialogNode({
  t,
  confirmDialog,
  confirmOkBtnRef,
  closeConfirmDialog,
}) {
  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
    confirmLabel: confirmOkLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  });

  return (
    <ConfirmDialog
      open={confirmDialog.open}
      busy={false}
      title={confirmTitle}
      message={confirmDialog.message}
      cancelLabel={confirmCancelLabel}
      confirmLabel={confirmOkLabel}
      onCancel={() => closeConfirmDialog(false)}
      onConfirm={() => closeConfirmDialog(true)}
      confirmRef={confirmOkBtnRef}
      overlayZIndex={12000}
    />
  );
}
