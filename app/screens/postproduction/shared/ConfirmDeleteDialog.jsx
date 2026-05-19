import { safeT } from "./helpers";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { resolveConfirmDialogLabels } from "../../../components/confirmDialogLabels";

function ConfirmDeleteDialog({
  t,
  open = false,
  busy = false,
  message = "",
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
  confirmLabelKey = "postprod.roles.action.delete",
  confirmLabelFallback = "Supprimer",
}) {
  if (!open) return null;

  const { title, cancelLabel } = resolveConfirmDialogLabels(t, {
    titleFallback: "Confirmation",
    cancelFallback: "Annuler",
  });

  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      title={title}
      message={message}
      cancelLabel={cancelLabel}
      confirmLabel={safeT(t, confirmLabelKey, confirmLabelFallback)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmRef={confirmRef}
      overlayZIndex={2000}
    />
  );
}

export { ConfirmDeleteDialog };
