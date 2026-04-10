import { useState } from "react";
import { safeT } from "../../../shared/helpers";
import { taskAutoRenderStateLevel } from "../../../tasks/helpers";
import { queueRenderStateShortLabel } from "../../helpers";

function nowDatetimeLocalValue() {
  const now = new Date();
  // datetime-local format: YYYY-MM-DDTHH:MM
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

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
  const [launchMode, setLaunchMode] = useState("immediate");
  const [scheduledAt, setScheduledAt] = useState("");

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

  const minDatetimeLocal = nowDatetimeLocalValue();

  const handleLaunch = () => {
    let resolvedScheduledAt = null;
    if (launchMode === "scheduled" && scheduledAt) {
      const d = new Date(scheduledAt);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        resolvedScheduledAt = d.toISOString();
      }
    }
    onLaunchScheduledTaskRender?.(task, queueEntry, { scheduledAt: resolvedScheduledAt });
  };

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
      <td style={{ overflowWrap: "anywhere" }}>
        <div className="uu-col" style={{ gap: "6px" }}>
          {canLaunchFromQueue ? (
            <>
              <div className="uu-row" style={{ gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="uu-select"
                  style={{ height: "30px", fontSize: "0.85em" }}
                  value={launchMode}
                  disabled={rendersLoading || isBusy || !canLaunchRenders}
                  onChange={(e) => {
                    setLaunchMode(e.target.value);
                    if (e.target.value === "immediate") setScheduledAt("");
                  }}
                >
                  <option value="immediate">{safeT(t, "postprod.renders.launchMode.immediate", "Lancer immédiatement")}</option>
                  <option value="scheduled">{safeT(t, "postprod.renders.launchMode.scheduled", "Programmer, lancer plus tard")}</option>
                </select>
                <button
                  className="uu-btn"
                  type="button"
                  disabled={
                    rendersLoading
                    || isBusy
                    || !canLaunchRenders
                    || (launchMode === "scheduled" && !scheduledAt)
                  }
                  onClick={handleLaunch}
                >
                  {renderState === "error"
                    ? safeT(t, "postprod.renders.queue.relaunch", "Relancer")
                    : safeT(t, "postprod.renders.queue.launch", "Lancer")}
                </button>
              </div>
              {launchMode === "scheduled" ? (
                <input
                  type="datetime-local"
                  className="uu-input"
                  style={{ height: "30px", fontSize: "0.85em", width: "100%" }}
                  min={minDatetimeLocal}
                  value={scheduledAt}
                  disabled={rendersLoading || isBusy || !canLaunchRenders}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              ) : null}
            </>
          ) : null}
          {hasLinkedRender ? (
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => onOpenRenderDetail?.(queueEntry.linkedRender)}
            >
              {safeT(t, "postprod.renders.detail.view", "Voir")}
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
