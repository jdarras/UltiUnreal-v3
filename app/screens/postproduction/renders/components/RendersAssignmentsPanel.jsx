import { useState } from "react";
import { RenderFormsConfirmDialog } from "../../catalogs/components/RenderFormsConfirmDialog";
import { formatDate, safeT } from "../../shared/helpers";
import { taskVisualStatusClass, taskVisualStatusLabel } from "../../renderEditor/helpers";

function RendersAssignmentsPanel({
  t,
  title = "",
  entries = [],
  secondaryColumnLabel = "",
  actionsLabel = "",
  onOpenTask = null,
  onDeleteTask = null,
} = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const [deleteDialogTask, setDeleteDialogTask] = useState(null);
  const [deleteDialogBusy, setDeleteDialogBusy] = useState(false);
  if (list.length <= 0) return null;

  const requestDeleteTask = (task = null) => {
    if (typeof onDeleteTask !== "function") return;
    const taskIdRaw = Number(task?.id || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    if (taskId <= 0) return;
    setDeleteDialogTask({
      id: taskId,
      title: String(task?.title || "").trim(),
    });
  };

  const closeDeleteDialog = () => {
    if (deleteDialogBusy) return;
    setDeleteDialogTask(null);
  };

  const confirmDeleteTask = async () => {
    if (typeof onDeleteTask !== "function" || !deleteDialogTask || deleteDialogBusy) return;
    const taskId = Number(deleteDialogTask?.id || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      setDeleteDialogTask(null);
      return;
    }
    setDeleteDialogBusy(true);
    try {
      const deleted = await Promise.resolve(onDeleteTask(taskId, deleteDialogTask));
      if (deleted !== false) {
        setDeleteDialogTask(null);
      }
    } finally {
      setDeleteDialogBusy(false);
    }
  };

  const deleteDialogTaskTitle = String(deleteDialogTask?.title || "").trim()
    || (Number(deleteDialogTask?.id || 0) > 0 ? `#${Number(deleteDialogTask.id)}` : "");
  const deleteDialogMessage = safeT(
    t,
    "postprod.tasks.confirm.delete",
    "Supprimer la tache \"{title}\" ?",
    { title: deleteDialogTaskTitle || "-" }
  );

  return (
    <>
      <RenderFormsConfirmDialog
        t={t}
        open={Boolean(deleteDialogTask)}
        title=""
        message={deleteDialogMessage}
        busy={deleteDialogBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={deleteDialogBusy ? safeT(t, "common.loading", "Chargement…") : safeT(t, "common.delete", "Supprimer")}
        onCancel={closeDeleteDialog}
        onConfirm={() => { void confirmDeleteTask(); }}
      />
      <div className="uu-card mt-12">
        <div
          className="uu-row"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "8px",
          }}
        >
          <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
            {title}
          </h4>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>
                  {safeT(t, "postprod.renders.assignments.table.task", "Rendu")}
                </th>
                <th style={{ textAlign: "left" }}>
                  {secondaryColumnLabel}
                </th>
                <th style={{ textAlign: "left" }}>
                  {safeT(t, "postprod.renders.assignments.table.status", "Statut")}
                </th>
                <th style={{ textAlign: "left" }}>
                  {safeT(t, "postprod.renders.assignments.table.updatedAt", "MàJ")}
                </th>
                <th style={{ textAlign: "right" }}>
                  {actionsLabel || safeT(t, "postprod.renders.table.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, index) => {
                const task = entry?.task && typeof entry.task === "object" ? entry.task : {};
                const taskIdRaw = Number(task?.id || 0);
                const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
                const taskIdLabel = taskId > 0 ? `#${String(taskId).padStart(4, "0")}` : "";
                const statusKey = String(entry?.statusKey || "").trim();
                const statusLabel = taskVisualStatusLabel(t, statusKey);
                const statusClass = taskVisualStatusClass(statusKey);
                const updatedAt = formatDate(
                  entry?.updatedAt
                  || task?.updatedAt
                  || task?.createdAt
                  || ""
                );
                const secondaryLabel = String(entry?.secondaryLabel || "").trim() || "-";
                const canEdit = entry?.canEdit !== false;
                const canDelete = entry?.canDelete === true;
                const openTaskDisabled = typeof onOpenTask !== "function" || taskId <= 0;
                const deleteTaskDisabled = typeof onDeleteTask !== "function" || !canDelete || taskId <= 0 || deleteDialogBusy;

                return (
                  <tr key={`render-assignment-row-${taskId || secondaryLabel}-${index}`}>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "8px",
                          minWidth: 0,
                          flexWrap: "nowrap",
                        }}
                      >
                        <span style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                          {String(task?.title || "-")}
                        </span>
                        {taskIdLabel ? (
                          <span className="uu-muted" style={{ whiteSpace: "nowrap" }}>
                            {taskIdLabel}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>{secondaryLabel}</td>
                    <td style={{ overflowWrap: "anywhere" }}>
                      <span className={`uu-chip chip-on ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ overflowWrap: "anywhere" }}>{updatedAt}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="uu-row uu-gap-4" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <button
                          className="uu-btn-ghost"
                          type="button"
                          disabled={openTaskDisabled || !canEdit}
                          onClick={() => onOpenTask?.(task)}
                        >
                          {safeT(t, "projects.actions.edit", "Editer")}
                        </button>
                        {typeof onDeleteTask === "function" ? (
                          <button
                            className="uu-btn-ghost"
                            type="button"
                            disabled={deleteTaskDisabled}
                            onClick={() => requestDeleteTask(task)}
                          >
                            {safeT(t, "postprod.tasks.action.delete", "Supprimer")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export { RendersAssignmentsPanel };
export default RendersAssignmentsPanel;
