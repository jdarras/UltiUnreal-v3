import { safeT } from "../../shared/helpers";
import { ConfirmDeleteDialog } from "../../shared/ConfirmDeleteDialog";

function UserDeleteDialog({
  t,
  open = false,
  busy = false,
  targetName = "",
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
}) {
  const resolvedName = String(targetName || "").trim()
    || safeT(t, "postprod.users.form.displayName", "Nom affiché");

  return (
    <ConfirmDeleteDialog
      t={t}
      open={open}
      busy={busy}
      message={safeT(
        t,
        "postprod.users.confirm.delete",
        "Supprimer l'utilisateur \"{name}\" ?",
        { name: resolvedName }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmRef={confirmRef}
      confirmLabelKey="postprod.users.action.deleteUser"
      confirmLabelFallback="Supprimer utilisateur"
    />
  );
}

export { UserDeleteDialog };
