import { safeT } from "../../../shared/helpers";
import { taskAutoRenderStateLabel, taskVisualStatusClass } from "../../../renderEditor/helpers";

const RENDERS_QUEUE_HEADER_STYLE = {
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};
const RENDERS_QUEUE_CHIPS_AUTO_STYLE = { marginLeft: "auto" };
const RENDERS_QUEUE_CHIPS_BASE_STYLE = { marginLeft: 0 };
function RendersQueueHeader({
  t,
  queueStateSummary = { waiting: 0, running: 0, error: 0, toModify: 0 },
  canLaunchRenders = false,
  queueRuntimeMode = "active",
  onSetQueueRuntimeMode = null,
}) {
  const queueMode = String(queueRuntimeMode || "").trim().toLowerCase() === "paused" ? "paused" : "active";
  const canToggleQueueMode = canLaunchRenders && typeof onSetQueueRuntimeMode === "function";

  return (
    <div className="uu-row" style={RENDERS_QUEUE_HEADER_STYLE}>
      {canToggleQueueMode ? (
        <div className="uu-row uu-gap-4">
          <button
            className={`uu-btn ${queueMode === "active" ? "prod-toggle-active" : ""}`}
            type="button"
            onClick={() => onSetQueueRuntimeMode?.("active")}
          >
            {safeT(t, "postprod.renders.queue.mode.active", "Active")}
          </button>
          <button
            className={`uu-btn ${queueMode === "paused" ? "prod-toggle-paused-active" : ""}`}
            type="button"
            onClick={() => onSetQueueRuntimeMode?.("paused")}
          >
            {safeT(t, "postprod.renders.queue.mode.paused", "En pause")}
          </button>
        </div>
      ) : <div />}
      <div className="uu-chip-group" style={canToggleQueueMode ? RENDERS_QUEUE_CHIPS_AUTO_STYLE : RENDERS_QUEUE_CHIPS_BASE_STYLE}>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("waiting")}`}>
          {taskAutoRenderStateLabel(t, "waiting")} ({Number(queueStateSummary?.waiting || 0)})
        </span>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("running")}`}>
          {taskAutoRenderStateLabel(t, "running")} ({Number(queueStateSummary?.running || 0)})
        </span>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("error")}`}>
          {taskAutoRenderStateLabel(t, "error")} ({Number(queueStateSummary?.error || 0)})
        </span>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("rejected")}`}>
          {safeT(t, "postprod.renders.queue.state.short.toModify", "A modifier")} ({Number(queueStateSummary?.toModify || 0)})
        </span>
      </div>
    </div>
  );
}

export { RendersQueueHeader };


