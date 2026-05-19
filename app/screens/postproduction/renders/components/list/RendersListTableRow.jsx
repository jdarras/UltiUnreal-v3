import { useEffect, useState } from "react";
import { safeT } from "../../../shared/helpers";

const RENDERS_LIST_ROW_CLICKABLE_STYLE = { cursor: "pointer" };
const RENDERS_LIST_FILE_ROW_STYLE = { display: "flex", alignItems: "baseline", gap: "8px" };
const RENDERS_LIST_FILE_NAME_STYLE = { fontWeight: 600, overflowWrap: "anywhere", minWidth: 0 };
const RENDERS_LIST_ID_BADGE_STYLE = { whiteSpace: "nowrap", opacity: 0.4, fontSize: "0.85em", flexShrink: 0 };
const RENDERS_LIST_CELL_WRAP_STYLE = { overflowWrap: "anywhere" };
const RENDERS_LIST_TASK_ROW_STYLE = { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" };
const RENDERS_LIST_TASK_LINK_BASE_STYLE = { color: "#fff", overflowWrap: "anywhere" };
const RENDERS_LIST_TASK_LINK_CLICKABLE_STYLE = { color: "#fff", overflowWrap: "anywhere", cursor: "pointer" };
const RENDERS_LIST_TASK_ID_STYLE = { whiteSpace: "nowrap", opacity: 0.4 };
const RENDERS_LIST_STATION_STYLE = { overflowWrap: "anywhere", fontWeight: 600 };
const RENDERS_LIST_REVIEW_SELECT_STYLE = { width: "75%" };
const RENDERS_LIST_ACTIONS_CELL_STYLE = { textAlign: "right" };
const RENDERS_LIST_ACTIONS_ROW_STYLE = {
  gap: "6px",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "nowrap",
  width: "100%",
};
const RENDERS_LIST_ACTION_BUTTON_FULL_STYLE = { width: "100%" };
const RENDERS_LIST_DELETE_BUTTON_STYLE = {
  width: "32px",
  minWidth: "32px",
  height: "32px",
  padding: "0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function resolveRenderPayload(render = null) {
  const payload = render?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

function resolveRenderLinkedTaskMeta(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = resolveRenderPayload(item);
  const taskIdRaw = Number(item?.linkedTaskId || payload?.taskId || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  const taskTitle = firstNonEmptyString([
    item?.linkedTaskTitle,
    payload?.taskTitle,
  ]);
  return { taskId, taskTitle };
}

function reviewStatusClassName(reviewStatus = "") {
  const key = String(reviewStatus || "").trim().toLowerCase();
  if (key === "validated") return "status-validated";
  if (key === "rejected" || key === "to_modify" || key === "canceled") return "status-rejected";
  return "status-to-validate";
}

function RendersListTableRow({
  t,
  render = null,
  buildRenderThumbCandidates = null,
  renderOutputFilename = null,
  renderLinkedTaskValue = null,
  renderReviewStatusKey = null,
  renderReviewStatusLabel = null,
  reviewFlow = [],
  busyRenderId = 0,
  rendersLoading = false,
  onTransitionRender = null,
  canReviewRenders = false,
  onApplyReviewStatus = null,
  onOpenRenderDetail = null,
  onDeleteRender = null,
  onRequestOpenRenderEditor = null,
}) {
  const renderId = Number(render?.id || 0);
  const reviewStatus = typeof renderReviewStatusKey === "function" ? renderReviewStatusKey(render) : "to_validate";
  const thumbCandidates = typeof buildRenderThumbCandidates === "function" ? buildRenderThumbCandidates(render) : [];
  const [thumbIndex, setThumbIndex] = useState(0);
  const [thumbError, setThumbError] = useState(false);
  const thumbSrc = !thumbError ? (thumbCandidates[thumbIndex] || "") : "";
  const isBusy = busyRenderId === renderId;
  const canDeleteRender = (
    typeof onDeleteRender === "function"
    && Number.isFinite(renderId)
    && renderId > 0
    && String(render?.sourceScope || "").trim().toLowerCase() !== "remote"
  );
  const stationName = String(render?.stationName || "").trim();
  const { taskId: linkedTaskId, taskTitle: linkedTaskTitle } = resolveRenderLinkedTaskMeta(render);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const renderIdLabel = renderId > 0 ? `#${String(renderId)}` : "";
  const linkedTaskLabel = linkedTaskTitle || linkedTaskFallback || "";
  const linkedTaskIdText = linkedTaskId > 0 ? `#${String(linkedTaskId).padStart(4, "0")}` : "";
  const canOpenTaskLink = typeof onRequestOpenRenderEditor === "function" && linkedTaskId > 0;
  const actionSlotStyle = {
    width: "74px",
    minWidth: "74px",
    display: "inline-flex",
    justifyContent: "center",
  };

  useEffect(() => {
    setThumbIndex(0);
    setThumbError(false);
  }, [renderId, thumbCandidates.join("|")]);

  const handleDeleteRender = async () => {
    if (!canDeleteRender || rendersLoading || isBusy) return;
    onDeleteRender?.(render);
  };

  const handleOpenTask = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenTaskLink) return;
    onRequestOpenRenderEditor?.({
      type: "render",
      action: "edit",
      ref: String(linkedTaskId),
      task: null,
    });
  };

  return (
    <tr
      className="uu-render-item-clickable"
      style={RENDERS_LIST_ROW_CLICKABLE_STYLE}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      <td>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
            className="uu-render-list-thumb"
            onError={() => {
              setThumbIndex((previous) => {
                const next = previous + 1;
                if (next < thumbCandidates.length) return next;
                setThumbError(true);
                return previous;
              });
            }}
          />
        ) : (
          <div className="uu-render-list-thumb placeholder">-</div>
        )}
      </td>
      <td>
        <div style={RENDERS_LIST_FILE_ROW_STYLE}>
          <div style={RENDERS_LIST_FILE_NAME_STYLE}>
            {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
          </div>
          {renderIdLabel ? (
            <span style={RENDERS_LIST_ID_BADGE_STYLE}>
              {renderIdLabel}
            </span>
          ) : null}
        </div>
      </td>
      <td style={RENDERS_LIST_CELL_WRAP_STYLE}>
        {linkedTaskId > 0 ? (
          <div style={RENDERS_LIST_TASK_ROW_STYLE}>
            {linkedTaskLabel ? (
              <span
                onClick={canOpenTaskLink ? handleOpenTask : undefined}
                style={canOpenTaskLink ? RENDERS_LIST_TASK_LINK_CLICKABLE_STYLE : RENDERS_LIST_TASK_LINK_BASE_STYLE}
              >
                {linkedTaskLabel}
              </span>
            ) : null}
            <span style={RENDERS_LIST_TASK_ID_STYLE}>{linkedTaskIdText}</span>
          </div>
        ) : (
          linkedTaskTitle || linkedTaskFallback || "-"
        )}
      </td>
      <td style={RENDERS_LIST_CELL_WRAP_STYLE}>{String(render?.requestedByUsername || "-")}</td>
      <td style={RENDERS_LIST_STATION_STYLE}>{stationName || "-"}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          className={`uu-input uu-status-select ${reviewStatusClassName(reviewStatus)}`}
          style={RENDERS_LIST_REVIEW_SELECT_STYLE}
          value={reviewStatus}
          disabled={rendersLoading || isBusy || !onTransitionRender || !canReviewRenders}
          onChange={async (e) => {
            const next = String(e.target.value || "").trim();
            if (!next) return;
            await Promise.resolve(onApplyReviewStatus?.(render, next));
          }}
        >
          {(Array.isArray(reviewFlow) ? reviewFlow : []).map((entry) => (
            <option key={`render-review-status-${renderId}-${entry}`} value={entry}>
              {typeof renderReviewStatusLabel === "function" ? renderReviewStatusLabel(t, entry) : entry}
            </option>
          ))}
        </select>
      </td>
      <td onClick={(e) => e.stopPropagation()} style={RENDERS_LIST_ACTIONS_CELL_STYLE}>
        <div className="uu-row" style={RENDERS_LIST_ACTIONS_ROW_STYLE}>
          <span style={actionSlotStyle}>
            <button
              className="uu-btn-ghost"
              type="button"
              style={RENDERS_LIST_ACTION_BUTTON_FULL_STYLE}
              onClick={() => onOpenRenderDetail?.(render)}
            >
              {safeT(t, "postprod.renders.detail.view", "Voir")}
            </button>
          </span>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={rendersLoading || isBusy || !canDeleteRender}
            onClick={handleDeleteRender}
            title={safeT(t, "postprod.renders.delete.button", "Supprimer")}
            aria-label={safeT(t, "postprod.renders.delete.button", "Supprimer")}
            style={RENDERS_LIST_DELETE_BUTTON_STYLE}
          >
            {"X"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export { RendersListTableRow };
