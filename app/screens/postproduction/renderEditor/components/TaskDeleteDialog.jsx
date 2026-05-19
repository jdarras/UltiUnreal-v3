import { safeT } from "../../shared/helpers";
import { ConfirmDeleteDialog } from "../../shared/ConfirmDeleteDialog";

function TaskDeleteDialog({
  t,
  task,
  busy = false,
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
}) {
  if (!task) return null;

  const taskTitle = String(task?.title || "").trim() || `#${Number(task?.id || 0)}`;

  return (
    <ConfirmDeleteDialog
      t={t}
      open={true}
      busy={busy}
      message={safeT(
        t,
        "postprod.tasks.confirm.delete",
        "Supprimer la tache \"{title}\" ?",
        { title: taskTitle }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmRef={confirmRef}
      confirmLabelKey="postprod.tasks.action.delete"
      confirmLabelFallback="Supprimer"
    />
  );
}

export {
  TaskDeleteDialog,
};
