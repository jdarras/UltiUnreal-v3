import { safeT } from "../../../shared/helpers";
import { RendersQueueTableRow } from "./RendersQueueTableRow";

function RendersQueueTable({
  t,
  sortedRenderQueueTasks = [],
  selectedQueueEntrySet = new Set(),
  busyScheduledTaskId = 0,
  rendersLoading = false,
  canLaunchRenders = false,
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  queueTaskPriorityLabel = null,
  queueSortIndicator = null,
  onToggleQueueSort = null,
  onToggleQueueTaskSelection = null,
  onLaunchScheduledTaskRender = null,
  onOpenRenderDetail = null,
}) {
  return (
    <div style={{ overflowX: "auto" }} className="mt-12">
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "5%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "center" }}>{safeT(t, "postprod.renders.queue.table.select", "Sel.")}</th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("task")}>
                {safeT(t, "postprod.renders.queue.table.task", "Tache")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("task") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("project")}>
                {safeT(t, "postprod.renders.queue.table.project", "Projet")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("project") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("template")}>
                {safeT(t, "postprod.renders.queue.table.template", "Preset")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("template") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("worker")}>
                {safeT(t, "postprod.renders.queue.table.worker", "Station")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("worker") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("status")}>
                {safeT(t, "postprod.renders.queue.table.status", "Statut rendu")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("status") : ""}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => onToggleQueueSort?.("priority")}>
                {safeT(t, "postprod.renders.queue.table.priority", "Priorite")}
                {typeof queueSortIndicator === "function" ? queueSortIndicator("priority") : ""}
              </button>
            </th>
            <th style={{ textAlign: "center" }}>{safeT(t, "postprod.renders.queue.table.actions", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(sortedRenderQueueTasks) ? sortedRenderQueueTasks : []).map((queueEntry) => (
            <RendersQueueTableRow
              key={`postprod-render-scheduled-row-${Number(queueEntry?.task?.id || 0)}`}
              t={t}
              queueEntry={queueEntry}
              selectedQueueEntrySet={selectedQueueEntrySet}
              busyScheduledTaskId={busyScheduledTaskId}
              rendersLoading={rendersLoading}
              canLaunchRenders={canLaunchRenders}
              queueEntryWorkerLabel={queueEntryWorkerLabel}
              getQueueEntryLaunchMeta={getQueueEntryLaunchMeta}
              queueTaskPriorityLabel={queueTaskPriorityLabel}
              onToggleQueueTaskSelection={onToggleQueueTaskSelection}
              onLaunchScheduledTaskRender={onLaunchScheduledTaskRender}
              onOpenRenderDetail={onOpenRenderDetail}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { RendersQueueTable };
