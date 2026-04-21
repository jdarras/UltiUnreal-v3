import { safeT } from "../../../shared/helpers";
import { taskVisualStatusClass } from "../../../tasks/helpers";
import { queueRenderStateShortLabel } from "../../helpers";

function simplifySequenceName(raw) {
  const source = String(raw || "").trim();
  if (!source) return "";
  const tail = source.split("/").filter(Boolean).pop() || source;
  const shortName = (tail.split(".")[0] || "").trim();
  return shortName || source;
}

function RendersQueueTableRow({
  t,
  queueEntry,
  busyScheduledTaskId = 0,
  deleteBusyTaskId = 0,
  rendersLoading = false,
  canLaunchRenders = false,
  queueRuntimeMode = "active",
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  onLaunchScheduledTaskRender = null,
  onEditQueueTask = null,
  onRequestDeleteQueueTask = null,
  onRequestOpenTasks = null,
  queueReorderBusy = false,
  canMoveQueueEntry = null,
  onMoveQueueEntry = null,
  actionsGroupWidth = 192,
  stationOffsetPx = 32,
}) {
  const task = queueEntry?.task && typeof queueEntry.task === "object"
    ? queueEntry.task
    : {};
  const taskId = Number(task?.id || 0);
  const normalizedTaskId = Number.isFinite(taskId) && taskId > 0 ? Math.trunc(taskId) : 0;
  const autoRenderConfig = task?.autoRenderConfig && typeof task.autoRenderConfig === "object" && !Array.isArray(task.autoRenderConfig)
    ? task.autoRenderConfig
    : null;
  const queueSequenceName = simplifySequenceName(
    autoRenderConfig?.sequenceName
      || autoRenderConfig?.payload?.sequenceName
      || task?.payload?.sequenceName
      || ""
  );
  const queueWorker = typeof queueEntryWorkerLabel === "function" ? queueEntryWorkerLabel(queueEntry) : "";
  const isBusy = busyScheduledTaskId === taskId;
  const deleteBusy = deleteBusyTaskId === taskId;
  const queueLaunchMeta = typeof getQueueEntryLaunchMeta === "function"
    ? getQueueEntryLaunchMeta(queueEntry)
    : { renderState: "waiting", canLaunchFromQueue: false };
  const renderState = queueLaunchMeta.renderState;
  const canLaunchFromQueue = queueLaunchMeta.canLaunchFromQueue;
  const queueMode = String(queueRuntimeMode || "").trim().toLowerCase() === "paused" ? "paused" : "active";
  const allowManualLaunch = queueMode === "paused";
  const canEditQueueTask = (
    typeof onEditQueueTask === "function"
    && Number.isFinite(taskId)
    && taskId > 0
  );
  const canDeleteQueueTask = (
    typeof onRequestDeleteQueueTask === "function"
    && Number.isFinite(taskId)
    && taskId > 0
  );
  const canMoveUp = typeof canMoveQueueEntry === "function" ? canMoveQueueEntry(queueEntry, -1) : false;
  const canMoveDown = typeof canMoveQueueEntry === "function" ? canMoveQueueEntry(queueEntry, 1) : false;
  const canOpenTaskLink = typeof onRequestOpenTasks === "function" && normalizedTaskId > 0;
  const taskIdLabel = normalizedTaskId > 0 ? `#${String(normalizedTaskId).padStart(4, "0")}` : "";
  const actionSlotStyle = {
    width: "74px",
    minWidth: "74px",
    display: "inline-flex",
    justifyContent: "center",
  };

  const handleLaunch = () => {
    onLaunchScheduledTaskRender?.(task, queueEntry);
  };

  const handleOpenTask = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenTaskLink) return;
    onRequestOpenTasks?.({
      type: "task",
      action: "edit",
      ref: String(normalizedTaskId),
      task: task && typeof task === "object" ? task : null,
    });
  };

  const handleRequestDelete = () => {
    if (!canDeleteQueueTask || deleteBusy || rendersLoading || isBusy) return;
    onRequestDeleteQueueTask?.(task, queueEntry);
  };

  const handleMoveUp = () => {
    if (!canMoveUp || queueReorderBusy || rendersLoading || isBusy || deleteBusy) return;
    void onMoveQueueEntry?.(queueEntry, -1);
  };

  const handleMoveDown = () => {
    if (!canMoveDown || queueReorderBusy || rendersLoading || isBusy || deleteBusy) return;
    void onMoveQueueEntry?.(queueEntry, 1);
  };

  return (
    <tr>
      <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
        <div className="uu-row" style={{ gap: "4px", justifyContent: "flex-start", flexWrap: "nowrap" }}>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={!canMoveUp || queueReorderBusy || rendersLoading || isBusy || deleteBusy}
            title={safeT(t, "postprod.renders.queue.moveUp", "Monter")}
            aria-label={safeT(t, "postprod.renders.queue.moveUp", "Monter")}
            onClick={handleMoveUp}
            style={{ padding: "2px 6px", minWidth: "28px" }}
          >
            ↑
          </button>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={!canMoveDown || queueReorderBusy || rendersLoading || isBusy || deleteBusy}
            title={safeT(t, "postprod.renders.queue.moveDown", "Descendre")}
            aria-label={safeT(t, "postprod.renders.queue.moveDown", "Descendre")}
            onClick={handleMoveDown}
            style={{ padding: "2px 6px", minWidth: "28px" }}
          >
            ↓
          </button>
        </div>
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
          <span
            onClick={canOpenTaskLink ? handleOpenTask : undefined}
            style={canOpenTaskLink
              ? { fontWeight: 600, overflowWrap: "anywhere", cursor: "pointer" }
              : { fontWeight: 600, overflowWrap: "anywhere" }}
          >
            {String(task?.title || "-")}
          </span>
          {taskIdLabel ? (
            <span className="uu-muted" style={{ whiteSpace: "nowrap" }}>
              {taskIdLabel}
            </span>
          ) : null}
        </div>
      </td>
      <td style={{ overflowWrap: "anywhere", textAlign: "center" }}>{queueSequenceName || "-"}</td>
      <td style={{ overflowWrap: "anywhere", paddingLeft: `${stationOffsetPx}px` }}>{queueWorker || "-"}</td>
      <td style={{ overflowWrap: "anywhere", textAlign: "right" }}>
        <span className={`uu-chip chip-on ${taskVisualStatusClass(renderState)}`}>
          {queueRenderStateShortLabel(t, renderState)}
        </span>
      </td>
      <td style={{ overflowWrap: "anywhere", textAlign: "right" }}>
        {!canLaunchFromQueue && !canEditQueueTask && !canDeleteQueueTask ? (
          <span className="uu-muted">-</span>
        ) : (
          <div
            className="uu-row"
            style={{
              gap: "6px",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "nowrap",
              width: `${actionsGroupWidth}px`,
              maxWidth: "100%",
              marginLeft: "auto",
            }}
          >
            <span style={actionSlotStyle}>
              {allowManualLaunch && canLaunchFromQueue ? (
                <button
                  className="uu-btn"
                  type="button"
                  style={{ width: "100%" }}
                  disabled={rendersLoading || isBusy || deleteBusy || !canLaunchRenders}
                  onClick={handleLaunch}
                >
                  {safeT(t, "postprod.renders.queue.launch", "Lancer")}
                </button>
              ) : null}
            </span>
            <span style={actionSlotStyle}>
              {canEditQueueTask ? (
                <button
                  className="uu-btn-ghost"
                  type="button"
                  style={{ width: "100%" }}
                  disabled={rendersLoading || isBusy || deleteBusy}
                  onClick={() => onEditQueueTask?.(task, queueEntry)}
                >
                  {safeT(t, "projects.actions.edit", "Editer")}
                </button>
              ) : null}
            </span>
            <button
              className="uu-btn-ghost"
              type="button"
              disabled={rendersLoading || isBusy || deleteBusy || !canDeleteQueueTask}
              onClick={handleRequestDelete}
              title={safeT(t, "postprod.renders.queue.deleteTask.button", "Supprimer tache")}
              aria-label={safeT(t, "postprod.renders.queue.deleteTask.button", "Supprimer tache")}
              style={{
                width: "32px",
                minWidth: "32px",
                height: "32px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {deleteBusy ? "..." : "X"}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export { RendersQueueTableRow };
export default RendersQueueTableRow;
