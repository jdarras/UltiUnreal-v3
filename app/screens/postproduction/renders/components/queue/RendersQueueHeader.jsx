import { safeT } from "../../../shared/helpers";
import { taskAutoRenderStateLabel } from "../../../tasks/helpers";

function RendersQueueHeader({
  t,
  renderQueueTasks = [],
  filteredRenderQueueTasks = [],
  selectedQueueEntrySet = new Set(),
  launchableQueueTaskIdSet = new Set(),
  queueStateSummary = { waiting: 0, running: 0, error: 0 },
  tasksLoading = false,
  rendersLoading = false,
  queueBatchBusyMode = "",
  selectedLaunchableQueueEntries = [],
  canLaunchRenders = false,
  onToggleSelectAllQueueEntries = null,
  onLaunchQueueBatch = null,
}) {
  return (
    <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
        {safeT(t, "postprod.renders.queue.title", "File d'attente de rendu")}
      </h4>
      <div className="uu-row" style={{ marginLeft: "auto", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span className="uu-muted">
          {safeT(t, "postprod.renders.queue.count", "{count} tache(s)", {
            count: Array.isArray(renderQueueTasks) ? renderQueueTasks.length : 0,
          })}
        </span>
        <span className="uu-muted">
          {safeT(t, "postprod.renders.queue.selectedCount", "{count} selectionne(s)", {
            count: selectedQueueEntrySet?.size || 0,
          })}
        </span>
        <span className="uu-muted">
          {safeT(t, "postprod.renders.queue.launchableCount", "{count} lancable(s)", {
            count: launchableQueueTaskIdSet?.size || 0,
          })}
        </span>
        <span className="uu-muted">
          {safeT(t, "postprod.renders.queue.visibleCount", "{count} affichee(s)", {
            count: Array.isArray(filteredRenderQueueTasks) ? filteredRenderQueueTasks.length : 0,
          })}
        </span>
        <div className="uu-chip-group">
          <span className="uu-chip lvl-info chip-on">
            {taskAutoRenderStateLabel(t, "waiting")} ({Number(queueStateSummary?.waiting || 0)})
          </span>
          <span className="uu-chip lvl-warn chip-on">
            {taskAutoRenderStateLabel(t, "running")} ({Number(queueStateSummary?.running || 0)})
          </span>
          <span className="uu-chip lvl-error chip-on">
            {taskAutoRenderStateLabel(t, "error")} ({Number(queueStateSummary?.error || 0)})
          </span>
        </div>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={tasksLoading || (launchableQueueTaskIdSet?.size || 0) <= 0}
          onClick={() => {
            onToggleSelectAllQueueEntries?.();
          }}
        >
          {safeT(t, "postprod.renders.queue.selectAll", "Tout selectionner")}
        </button>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={
            tasksLoading
            || rendersLoading
            || !!queueBatchBusyMode
            || (Array.isArray(selectedLaunchableQueueEntries) ? selectedLaunchableQueueEntries.length : 0) <= 0
            || !canLaunchRenders
          }
          onClick={() => {
            onLaunchQueueBatch?.(selectedLaunchableQueueEntries);
          }}
        >
          {queueBatchBusyMode
            ? safeT(t, "postprod.renders.queue.batch.running", "Traitement...")
            : safeT(t, "postprod.renders.queue.batch.launchSelection", "Lancer selection")}
        </button>
      </div>
    </div>
  );
}

export { RendersQueueHeader };

