import { safeT } from "../../../shared/helpers";
import { taskAutoRenderStateLabel, taskVisualStatusClass } from "../../../tasks/helpers";

function RendersQueueHeader({
  t,
  queueStateSummary = { waiting: 0, running: 0, error: 0 },
  canLaunchRenders = false,
  queueRuntimeMode = "active",
  onSetQueueRuntimeMode = null,
}) {
  const queueMode = String(queueRuntimeMode || "").trim().toLowerCase() === "paused" ? "paused" : "active";
  const canToggleQueueMode = canLaunchRenders && typeof onSetQueueRuntimeMode === "function";

  return (
    <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <div className="uu-row" style={{ gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
          {safeT(t, "postprod.renders.queue.title", "File d'attente de rendu")}
        </h4>
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
        ) : null}
      </div>
      <div className="uu-chip-group" style={{ marginLeft: "auto" }}>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("waiting")}`}>
          {taskAutoRenderStateLabel(t, "waiting")} ({Number(queueStateSummary?.waiting || 0)})
        </span>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("running")}`}>
          {taskAutoRenderStateLabel(t, "running")} ({Number(queueStateSummary?.running || 0)})
        </span>
        <span className={`uu-chip chip-on ${taskVisualStatusClass("error")}`}>
          {taskAutoRenderStateLabel(t, "error")} ({Number(queueStateSummary?.error || 0)})
        </span>
      </div>
    </div>
  );
}

export { RendersQueueHeader };

