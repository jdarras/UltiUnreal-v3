import { useState } from "react";
import { safeT } from "../../../shared/helpers";
import { RenderFormsConfirmDialog } from "../../../catalogs/components/RenderFormsConfirmDialog";
import { RendersQueueTableRow } from "./RendersQueueTableRow";

const RENDERS_QUEUE_SCROLL_STYLE = { overflowX: "auto" };
const RENDERS_QUEUE_TABLE_STYLE = { width: "100%", tableLayout: "fixed" };
const RENDERS_QUEUE_COL_1_STYLE = { width: "8%" };
const RENDERS_QUEUE_COL_2_STYLE = { width: "23%" };
const RENDERS_QUEUE_COL_3_STYLE = { width: "18%" };
const RENDERS_QUEUE_COL_4_STYLE = { width: "13%" };
const RENDERS_QUEUE_COL_5_STYLE = { width: "12%" };
const RENDERS_QUEUE_COL_6_STYLE = { width: "26%" };
const RENDERS_QUEUE_TH_LEFT_STYLE = { textAlign: "left" };
const RENDERS_QUEUE_TH_CENTER_STYLE = { textAlign: "center" };
const RENDERS_QUEUE_TH_RIGHT_STYLE = { textAlign: "right" };

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
  const workerHeaderStyle = { textAlign: "left", paddingLeft: `${stationOffsetPx}px` };
  const actionsHeaderWrapStyle = { width: `${actionsGroupWidth}px`, textAlign: "center", marginLeft: "auto" };
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
      <div style={RENDERS_QUEUE_SCROLL_STYLE} className="mt-12">
        <table className="uu-table" style={RENDERS_QUEUE_TABLE_STYLE}>
          <colgroup>
            <col style={RENDERS_QUEUE_COL_1_STYLE} />
            <col style={RENDERS_QUEUE_COL_2_STYLE} />
            <col style={RENDERS_QUEUE_COL_3_STYLE} />
            <col style={RENDERS_QUEUE_COL_4_STYLE} />
            <col style={RENDERS_QUEUE_COL_5_STYLE} />
            <col style={RENDERS_QUEUE_COL_6_STYLE} />
          </colgroup>
          <thead>
            <tr>
              <th style={RENDERS_QUEUE_TH_LEFT_STYLE}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("startAt")}>
                  {safeT(t, "postprod.renders.queue.table.order", "Ordre")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("startAt") : ""}
                </button>
              </th>
              <th style={RENDERS_QUEUE_TH_LEFT_STYLE}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("task")}>
                  {safeT(t, "postprod.renders.queue.table.task", "Tache")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("task") : ""}
                </button>
              </th>
              <th style={RENDERS_QUEUE_TH_CENTER_STYLE}>
                {safeT(t, "postprod.renders.queue.table.launch", "Lancement")}
              </th>
              <th style={workerHeaderStyle}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("worker")}>
                  {safeT(t, "postprod.renders.queue.table.worker", "Station")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("worker") : ""}
                </button>
              </th>
              <th style={RENDERS_QUEUE_TH_RIGHT_STYLE}>
                <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("status")}>
                  {safeT(t, "postprod.renders.queue.table.status", "Statut")}
                  {typeof queueSortIndicator === "function" ? queueSortIndicator("status") : ""}
                </button>
              </th>
              <th style={RENDERS_QUEUE_TH_RIGHT_STYLE}>
                <div style={actionsHeaderWrapStyle}>
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
