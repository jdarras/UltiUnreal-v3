import { formatDate, safeT } from "../../../shared/helpers";
import { taskVisualStatusClass } from "../../../renderEditor/helpers";
import { queueRenderStateShortLabel } from "../../helpers";

const RENDERS_QUEUE_ORDER_CELL_STYLE = { textAlign: "left", whiteSpace: "nowrap" };
const RENDERS_QUEUE_ORDER_ROW_STYLE = { gap: "4px", justifyContent: "flex-start", flexWrap: "nowrap" };
const RENDERS_QUEUE_ORDER_BUTTON_STYLE = { padding: "2px 6px", minWidth: "28px" };
const RENDERS_QUEUE_CELL_WRAP_STYLE = { overflowWrap: "anywhere" };
const RENDERS_QUEUE_TASK_ROW_STYLE = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  flexWrap: "nowrap",
  minWidth: 0,
};
const RENDERS_QUEUE_TASK_TITLE_STYLE = { fontWeight: 600, overflowWrap: "anywhere" };
const RENDERS_QUEUE_TASK_TITLE_CLICKABLE_STYLE = { fontWeight: 600, overflowWrap: "anywhere", cursor: "pointer" };
const RENDERS_QUEUE_TASK_ID_STYLE = { whiteSpace: "nowrap" };
const RENDERS_QUEUE_LAUNCH_CELL_STYLE = { overflowWrap: "anywhere", textAlign: "center" };
const RENDERS_QUEUE_STATUS_CELL_STYLE = { overflowWrap: "anywhere", textAlign: "right" };
const RENDERS_QUEUE_ACTIONS_CELL_STYLE = { overflowWrap: "anywhere", textAlign: "right" };
const RENDERS_QUEUE_ACTIONS_ROW_BASE_STYLE = {
  gap: "6px",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "nowrap",
  maxWidth: "100%",
  marginLeft: "auto",
};
const RENDERS_QUEUE_ACTION_BUTTON_FULL_STYLE = { width: "100%" };
const RENDERS_QUEUE_DELETE_BUTTON_STYLE = {
  width: "32px",
  minWidth: "32px",
  height: "32px",
  padding: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function RendersQueueTableRow({
  t,
  queueEntry,
  busyScheduledTaskId = 0,
  deleteBusyTaskId = 0,
  rendersLoading = false,
  canLaunchRenders = false,
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  onLaunchScheduledTaskRender = null,
  onEditQueueTask = null,
  onRequestDeleteQueueTask = null,
  onRequestOpenRenderEditor = null,
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
  const queueWorker = typeof queueEntryWorkerLabel === "function" ? queueEntryWorkerLabel(queueEntry) : "";
  const isBusy = busyScheduledTaskId === taskId;
  const deleteBusy = deleteBusyTaskId === taskId;
  const queueLaunchMeta = typeof getQueueEntryLaunchMeta === "function"
    ? getQueueEntryLaunchMeta(queueEntry)
    : {
      renderState: "waiting",
      canLaunchFromQueue: false,
      scheduledAt: "",
      isStationWaitMode: false,
    };
  const renderState = queueLaunchMeta.renderState;
  const queueLaunchLabel = (() => {
    if (renderState === "not_started") {
      return safeT(t, "postprod.renders.queue.launch.toCreate", "A créer");
    }
    const scheduledAt = String(queueLaunchMeta?.scheduledAt || "").trim();
    if (scheduledAt) {
      const formatted = String(formatDate(scheduledAt) || "").trim();
      return formatted || scheduledAt;
    }
    if (queueLaunchMeta?.isStationWaitMode) {
      return safeT(t, "postprod.renders.queue.launch.waitingStation", "En attente Station");
    }
    return "-";
  })();
  const canLaunchFromQueue = queueLaunchMeta.canLaunchFromQueue;
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
  const canOpenTaskLink = typeof onRequestOpenRenderEditor === "function" && normalizedTaskId > 0;
  const taskIdLabel = normalizedTaskId > 0 ? `#${String(normalizedTaskId).padStart(4, "0")}` : "";
  const actionSlotStyle = {
    width: "74px",
    minWidth: "74px",
    display: "inline-flex",
    justifyContent: "center",
  };
  const queueWorkerCellStyle = { overflowWrap: "anywhere", paddingLeft: `${stationOffsetPx}px` };
  const queueActionsRowStyle = { ...RENDERS_QUEUE_ACTIONS_ROW_BASE_STYLE, width: `${actionsGroupWidth}px` };

  const handleLaunch = () => {
    onLaunchScheduledTaskRender?.(task, queueEntry, {
      forceLaunch: true,
      ignoreSchedule: true,
    });
  };

  const handleOpenTask = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenTaskLink) return;
    onRequestOpenRenderEditor?.({
      type: "render",
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
      <td style={RENDERS_QUEUE_ORDER_CELL_STYLE}>
        <div className="uu-row" style={RENDERS_QUEUE_ORDER_ROW_STYLE}>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={!canMoveUp || queueReorderBusy || rendersLoading || isBusy || deleteBusy}
            title={safeT(t, "postprod.renders.queue.moveUp", "Monter")}
            aria-label={safeT(t, "postprod.renders.queue.moveUp", "Monter")}
            onClick={handleMoveUp}
            style={RENDERS_QUEUE_ORDER_BUTTON_STYLE}
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
            style={RENDERS_QUEUE_ORDER_BUTTON_STYLE}
          >
            ↓
          </button>
        </div>
      </td>
      <td style={RENDERS_QUEUE_CELL_WRAP_STYLE}>
        <div style={RENDERS_QUEUE_TASK_ROW_STYLE}>
          <span
            onClick={canOpenTaskLink ? handleOpenTask : undefined}
            style={canOpenTaskLink
              ? RENDERS_QUEUE_TASK_TITLE_CLICKABLE_STYLE
              : RENDERS_QUEUE_TASK_TITLE_STYLE}
          >
            {String(task?.title || "-")}
          </span>
          {taskIdLabel ? (
            <span className="uu-muted" style={RENDERS_QUEUE_TASK_ID_STYLE}>
              {taskIdLabel}
            </span>
          ) : null}
        </div>
      </td>
      <td style={RENDERS_QUEUE_LAUNCH_CELL_STYLE}>{queueLaunchLabel}</td>
      <td style={queueWorkerCellStyle}>{queueWorker || "-"}</td>
      <td style={RENDERS_QUEUE_STATUS_CELL_STYLE}>
        <span className={`uu-chip chip-on ${taskVisualStatusClass(renderState)}`}>
          {queueRenderStateShortLabel(t, renderState)}
        </span>
      </td>
      <td style={RENDERS_QUEUE_ACTIONS_CELL_STYLE}>
        {!canLaunchFromQueue && !canEditQueueTask && !canDeleteQueueTask ? (
          <span className="uu-muted">-</span>
        ) : (
          <div className="uu-row" style={queueActionsRowStyle}>
            <span style={actionSlotStyle}>
              {canLaunchFromQueue ? (
                <button
                  className="uu-btn"
                  type="button"
                  style={RENDERS_QUEUE_ACTION_BUTTON_FULL_STYLE}
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
                  style={RENDERS_QUEUE_ACTION_BUTTON_FULL_STYLE}
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
              style={RENDERS_QUEUE_DELETE_BUTTON_STYLE}
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
