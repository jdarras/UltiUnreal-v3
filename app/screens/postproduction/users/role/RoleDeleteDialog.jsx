import { safeT } from "../../shared/helpers";
import { ConfirmDeleteDialog } from "../../shared/ConfirmDeleteDialog";
import { roleLabel } from "../roleHelpers";

function RoleDeleteDialog({
  t,
  open = false,
  busy = false,
  roleKey = "",
  userCount = 0,
  onCancel = null,
  onConfirm = null,
}) {
  const message = userCount > 0
    ? safeT(
      t,
      "postprod.roles.confirm.deleteWithUsers",
      "Supprimer le profil \"{name}\" ? Les {count} utilisateur(s) associé(s) seront réassignés automatiquement.",
      { name: roleLabel(t, roleKey), count: userCount }
    )
    : safeT(
      t,
      "postprod.roles.confirm.delete",
      "Supprimer le profil \"{name}\" ?",
      { name: roleLabel(t, roleKey) }
    );
  return (
    <ConfirmDeleteDialog
      t={t}
      open={open}
      busy={busy}
      message={message}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmLabelKey="postprod.roles.action.delete"
      confirmLabelFallback="Supprimer"
    />
  );
}

export { RoleDeleteDialog };
