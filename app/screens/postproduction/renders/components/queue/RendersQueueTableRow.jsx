import { safeT } from "../../../shared/helpers";
import { taskAutoRenderStateLevel } from "../../../tasks/helpers";
import { queueRenderStateShortLabel } from "../../helpers";

function RendersQueueTableRow({
  t,
  queueEntry,
  selectedQueueEntrySet = new Set(),
  busyScheduledTaskId = 0,
  rendersLoading = false,
  canLaunchRenders = false,
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  queueTaskPriorityLabel = null,
  onToggleQueueTaskSelection = null,
  onLaunchScheduledTaskRender = null,
  onOpenRenderDetail = null,
}) {
  const task = queueEntry?.task && typeof queueEntry.task === "object"
    ? queueEntry.task
    : {};
  const taskId = Number(task?.id || 0);
  const autoRenderConfig = task?.autoRenderConfig && typeof task.autoRenderConfig === "object" && !Array.isArray(task.autoRenderConfig)
    ? task.autoRenderConfig
    : null;
  const queueProjectName = String(queueEntry?.projectName || autoRenderConfig?.projectName || "").trim();
  const queueTemplateName = String(queueEntry?.templateName || autoRenderConfig?.templateName || "").trim();
  const queueWorker = typeof queueEntryWorkerLabel === "function" ? queueEntryWorkerLabel(queueEntry) : "";
  const isBusy = busyScheduledTaskId === taskId;
  const queueLaunchMeta = typeof getQueueEntryLaunchMeta === "function"
    ? getQueueEntryLaunchMeta(queueEntry)
    : { renderState: "waiting", canLaunchFromQueue: false };
  const renderState = queueLaunchMeta.renderState;
  const canLaunchFromQueue = queueLaunchMeta.canLaunchFromQueue;
  const isSelectable = canLaunchFromQueue;
  const isSelected = selectedQueueEntrySet?.has?.(Math.trunc(taskId)) === true;
  const linkedRenderIdRaw = Number(queueEntry?.linkedRender?.id || 0);
  const hasLinkedRender = Number.isFinite(linkedRenderIdRaw) && linkedRenderIdRaw > 0;

  return (
    <tr>
      <td style={{ textAlign: "center" }}>
        <input
          type="checkbox"
          checked={isSelected}
          disabled={!Number.isFinite(taskId) || taskId <= 0 || !isSelectable}
          onChange={() => onToggleQueueTaskSelection?.(taskId)}
          aria-label={safeT(t, "postprod.renders.queue.table.select", "Sel.")}
          title={isSelectable
            ? safeT(t, "postprod.renders.queue.selection.available", "Selectionnable")
            : safeT(t, "postprod.renders.queue.selection.locked", "Verrouille (deja en cours ou deja lance)")}
        />
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          <span style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{String(task?.title || "-")}</span>
          <span className="uu-muted" style={{ whiteSpace: "nowrap" }}>#{taskId}</span>
        </div>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>{queueProjectName || "-"}</td>
      <td style={{ overflowWrap: "anywhere" }}>{queueTemplateName || "-"}</td>
      <td style={{ overflowWrap: "anywhere" }}>{queueWorker || "-"}</td>
      <td style={{ overflowWrap: "anywhere" }}>
        <span className={`uu-chip lvl-${taskAutoRenderStateLevel(renderState)} chip-on`}>
          {queueRenderStateShortLabel(t, renderState)}
        </span>
      </td>
      <td>{typeof queueTaskPriorityLabel === "function" ? queueTaskPriorityLabel(task?.priority) : "-"}</td>
      <td style={{ textAlign: "center" }}>
        <div className="uu-row" style={{ gap: "8px", flexWrap: "nowrap", justifyContent: "center" }}>
          {canLaunchFromQueue ? (
            <button
              className="uu-btn"
              type="button"
              disabled={rendersLoading || isBusy || !canLaunchRenders}
              onClick={() => {
                onLaunchScheduledTaskRender?.(task, queueEntry);
              }}
            >
              {renderState === "error"
                ? safeT(t, "postprod.renders.queue.relaunch", "Relancer")
                : safeT(t, "postprod.renders.queue.launch", "Lancer")}
            </button>
          ) : null}
          {hasLinkedRender ? (
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => onOpenRenderDetail?.(queueEntry.linkedRender)}
            >
              {safeT(t, "postprod.renders.detail.open", "Ouvrir")}
            </button>
          ) : null}
          {!canLaunchFromQueue && !hasLinkedRender ? (
            <span className="uu-muted">-</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export { RendersQueueTableRow };
export default RendersQueueTableRow;
