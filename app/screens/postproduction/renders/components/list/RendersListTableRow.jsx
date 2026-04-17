import { safeT } from "../../../shared/helpers";

function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function resolveRenderLinkedTaskMeta(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const taskIdRaw = Number(item?.linkedTaskId || payload?.taskId || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  const taskTitle = firstNonEmptyString([
    item?.linkedTaskTitle,
    payload?.taskTitle,
  ]);
  return { taskId, taskTitle };
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
  onRequestOpenTasks = null,
}) {
  const renderId = Number(render?.id || 0);
  const reviewStatus = typeof renderReviewStatusKey === "function" ? renderReviewStatusKey(render) : "to_validate";
  const thumbCandidates = typeof buildRenderThumbCandidates === "function" ? buildRenderThumbCandidates(render) : [];
  const thumbSrc = thumbCandidates[0] || "";
  const isBusy = busyRenderId === renderId;
  const outputPath = String(render?.outputPath || "").trim();
  const canDeleteRender = (
    typeof onDeleteRender === "function"
    && Number.isFinite(renderId)
    && renderId > 0
  );
  const stationName = String(render?.stationName || "").trim();
  const { taskId: linkedTaskId, taskTitle: linkedTaskTitle } = resolveRenderLinkedTaskMeta(render);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const canOpenTaskLink = typeof onRequestOpenTasks === "function" && linkedTaskId > 0;
  const actionSlotStyle = {
    width: "74px",
    minWidth: "74px",
    display: "inline-flex",
    justifyContent: "center",
  };

  const handleDeleteRender = async () => {
    if (!canDeleteRender || rendersLoading || isBusy) return;
    onDeleteRender?.(render);
  };

  const handleOpenTask = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenTaskLink) return;
    onRequestOpenTasks?.({
      type: "task",
      action: "edit",
      ref: String(linkedTaskId),
      task: null,
    });
  };

  return (
    <tr
      className="uu-render-item-clickable"
      style={{ cursor: "pointer" }}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      <td>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
            className="uu-render-list-thumb"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="uu-render-list-thumb placeholder">-</div>
        )}
      </td>
      <td>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
        {outputPath ? (
          <div className="uu-muted mt-8" style={{ overflowWrap: "anywhere" }}>{outputPath}</div>
        ) : null}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {linkedTaskId > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {linkedTaskTitle ? <span style={{ overflowWrap: "anywhere" }}>{linkedTaskTitle}</span> : null}
            {canOpenTaskLink ? (
              <button
                type="button"
                className="uu-link"
                style={{ whiteSpace: "nowrap" }}
                onClick={handleOpenTask}
              >
                ({linkedTaskId})
              </button>
            ) : (
              <span style={{ whiteSpace: "nowrap" }}>({linkedTaskId})</span>
            )}
          </div>
        ) : (
          linkedTaskTitle || linkedTaskFallback || "-"
        )}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>{String(render?.requestedByUsername || "-")}</td>
      <td style={{ overflowWrap: "anywhere", fontWeight: 600 }}>{stationName || "-"}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          className="uu-input"
          style={{ width: "75%" }}
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
      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
        <div className="uu-row" style={{ gap: "6px", alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap", width: "100%" }}>
          <span style={actionSlotStyle}>
            <button
              className="uu-btn-ghost"
              type="button"
              style={{ width: "100%" }}
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
            {"X"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export { RendersListTableRow };
export default RendersListTableRow;
