import { useState } from "react";
import { safeT } from "../../../shared/helpers";
import { RenderFormsConfirmDialog } from "../../../catalogs/components/RenderFormsConfirmDialog";
import { RendersQueueTableRow } from "./RendersQueueTableRow";

function RendersQueueTable({
  t,
  sortedRenderQueueTasks = [],
  busyScheduledTaskId = 0,
  rendersLoading = false,
  canLaunchRenders = false,
  queueRuntimeMode = "active",
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  queueSortIndicator = null,
  onToggleQueueSort = null,
  onLaunchScheduledTaskRender = null,
  onEditQueueTask = null,
  onDeleteQueueTask = null,
  onRequestOpenRenderEditor = null,
  queueReorderBusy = false,
  canMoveQueueEntry = null,
  onMoveQueueEntry = null,
}) {
  const actionsGroupWidth = 192;
  const stationOffsetPx = 32;
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleRequestDelete = (task, queueEntry) => {
    setPendingDelete({ task, queueEntry });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteBusy(true);
    try {
      await Promise.resolve(onDeleteQueueTask?.(pendingDelete.task, pendingDelete.queueEntry));
    } finally {
      setDeleteBusy(false);
      setPendingDelete(null);
    }
  };

  const pendingTaskTitle = String(pendingDelete?.task?.title || "").trim();
  const pendingTaskId = Number(pendingDelete?.task?.id || 0);

  return (
    <>
      <RenderFormsConfirmDialog
        t={t}
        open={pendingDelete !== null}
        title=""
        message={
          pendingTaskTitle
            ? safeT(t, "postprod.renders.queue.deleteTask.confirmWithTitle", "Supprimer la tâche {title} de la file de rendu ?", { title: pendingTaskTitle })
            : safeT(t, "postprod.renders.queue.deleteTask.confirm", "Supprimer cette tâche de la file de rendu ?")
        }
        busy={deleteBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={deleteBusy ? safeT(t, "common.loading", "Chargement…") : safeT(t, "common.delete", "Supprimer")}
        onCancel={() => { if (!deleteBusy) setPendingDelete(null); }}
        onConfirm={handleConfirmDelete}
      />
      <div style={{ overflowX: "auto" }} className="mt-12">
        <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "26%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("startAt")}>
                  {safeT(t, "postprod.renders.queue.table.order", "Ordre")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("startAt") : ""}
                </button>
              </th>
              <th style={{ textAlign: "left" }}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("task")}>
                  {safeT(t, "postprod.renders.queue.table.task", "Tache")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("task") : ""}
                </button>
              </th>
              <th style={{ textAlign: "center" }}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("sequence")}>
                  {safeT(t, "postprod.data.forms.levelSequence", "LS")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("sequence") : ""}
                </button>
              </th>
              <th style={{ textAlign: "left", paddingLeft: `${stationOffsetPx}px` }}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("worker")}>
                  {safeT(t, "postprod.renders.queue.table.worker", "Station")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("worker") : ""}
                </button>
              </th>
              <th style={{ textAlign: "right" }}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("status")}>
                  {safeT(t, "postprod.renders.queue.table.status", "Statut")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("status") : ""}
                </button>
              </th>
              <th style={{ textAlign: "right" }}>
                <div style={{ width: `${actionsGroupWidth}px`, textAlign: "center", marginLeft: "auto" }}>
                  {safeT(t, "postprod.renders.queue.table.actions", "Actions")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(sortedRenderQueueTasks) ? sortedRenderQueueTasks : []).map((queueEntry) => (
              <RendersQueueTableRow
                key={`postprod-render-scheduled-row-${Number(queueEntry?.task?.id || 0)}`}
                t={t}
                queueEntry={queueEntry}
                busyScheduledTaskId={busyScheduledTaskId}
                deleteBusyTaskId={deleteBusy ? pendingTaskId : 0}
                rendersLoading={rendersLoading}
                canLaunchRenders={canLaunchRenders}
                queueRuntimeMode={queueRuntimeMode}
                queueEntryWorkerLabel={queueEntryWorkerLabel}
                getQueueEntryLaunchMeta={getQueueEntryLaunchMeta}
                onLaunchScheduledTaskRender={onLaunchScheduledTaskRender}
                onEditQueueTask={onEditQueueTask}
                onRequestDeleteQueueTask={onDeleteQueueTask ? handleRequestDelete : null}
                onRequestOpenRenderEditor={onRequestOpenRenderEditor}
                queueReorderBusy={queueReorderBusy}
                canMoveQueueEntry={canMoveQueueEntry}
                onMoveQueueEntry={onMoveQueueEntry}
                actionsGroupWidth={actionsGroupWidth}
                stationOffsetPx={stationOffsetPx}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export { RendersQueueTable };
