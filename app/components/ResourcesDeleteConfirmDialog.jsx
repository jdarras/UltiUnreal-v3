import { ConfirmDialog } from './ConfirmDialog';
import { resolveConfirmDialogLabels } from './confirmDialogLabels';

export default function ResourcesDeleteConfirmDialog({
  t,
  open = false,
  busy = false,
  detailTitle = '',
  detailUid = '',
  onCancel,
  onConfirm,
  confirmRef = null,
  overlayZIndex = 2200,
}) {
  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  });

  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      title={confirmTitle}
      message={t('resources.detail.confirmDelete', {
        name: detailTitle || detailUid || '-',
      })}
      cancelLabel={confirmCancelLabel}
      confirmLabel={busy ? t('common.loading') : t('common.delete')}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmRef={confirmRef}
      overlayZIndex={overlayZIndex}
    />
  );
}
