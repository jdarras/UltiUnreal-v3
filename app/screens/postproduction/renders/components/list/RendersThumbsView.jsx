import { formatDate, safeT } from "../../../shared/helpers";

function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function resolveRenderProjectRef(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  return firstNonEmptyString([
    item?.projectId,
    item?.projectRef,
    payload?.projectId,
    payload?.projectRef,
    item?.projectName,
    payload?.projectName,
  ]);
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

function RendersThumbsView({
  t,
  sortedDisplayedRenders = [],
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
  onNavigateToProject = null,
}) {
  return (
    <div className="uu-render-grid thumbs">
      {sortedDisplayedRenders.map((render) => (
        <RendersThumbCard
          key={`postprod-render-card-${Number(render?.id || 0)}`}
          t={t}
          render={render}
          buildRenderThumbCandidates={buildRenderThumbCandidates}
          renderOutputFilename={renderOutputFilename}
          renderLinkedTaskValue={renderLinkedTaskValue}
          renderReviewStatusKey={renderReviewStatusKey}
          renderReviewStatusLabel={renderReviewStatusLabel}
          reviewFlow={reviewFlow}
          busyRenderId={busyRenderId}
          rendersLoading={rendersLoading}
          onTransitionRender={onTransitionRender}
          canReviewRenders={canReviewRenders}
          onApplyReviewStatus={onApplyReviewStatus}
          onOpenRenderDetail={onOpenRenderDetail}
          onDeleteRender={onDeleteRender}
          onRequestOpenTasks={onRequestOpenTasks}
          onNavigateToProject={onNavigateToProject}
        />
      ))}
    </div>
  );
}

function RendersThumbCard({
  t,
  render,
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
  onNavigateToProject = null,
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
  const projectRef = resolveRenderProjectRef(render);
  const projectLabel = String(render?.projectName || "").trim() || projectRef || "-";
  const projectRefLower = projectRef.toLowerCase();
  const projectLabelLower = projectLabel.toLowerCase();
  const showProjectRefTag = Boolean(
    projectRef
    && projectLabel
    && projectRefLower !== projectLabelLower
  );
  const { taskId: linkedTaskId, taskTitle: linkedTaskTitle } = resolveRenderLinkedTaskMeta(render);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const canOpenProjectLink = typeof onNavigateToProject === "function" && !!projectRef;
  const canOpenTaskLink = typeof onRequestOpenTasks === "function" && linkedTaskId > 0;

  const handleDeleteRender = async () => {
    if (!canDeleteRender || rendersLoading || isBusy) return;
    onDeleteRender?.(render);
  };

  const handleOpenProject = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenProjectLink) return;
    onNavigateToProject?.(projectRef);
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
    <div
      className="uu-card uu-render-item-clickable"
      style={{ cursor: "pointer" }}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
          className="uu-render-thumb"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="uu-render-thumb placeholder">{safeT(t, "postprod.renders.preview.none", "Aucun apercu")}</div>
      )}
      <div className="uu-row mt-8" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
      </div>
      <div className="uu-muted mt-8" onClick={(e) => e.stopPropagation()}>
        <span>{safeT(t, "postprod.renders.table.project", "Projet")}: </span>
        {canOpenProjectLink ? (
          <>
            <button
              type="button"
              className="uu-link uu-muted"
              style={{ textAlign: "left" }}
              onClick={handleOpenProject}
            >
              {projectLabel}
            </button>
            {showProjectRefTag ? (
              <button
                type="button"
                className="uu-link uu-muted"
                style={{ marginLeft: "6px" }}
                onClick={handleOpenProject}
              >
                [{projectRef}]
              </button>
            ) : null}
          </>
        ) : (
          <span>{projectLabel}</span>
        )}
      </div>
      <div className="uu-muted mt-8" onClick={(e) => e.stopPropagation()}>
        <span>{safeT(t, "postprod.renders.table.linkedTask", "Tache")}: </span>
        {linkedTaskId > 0 ? (
          <>
            {linkedTaskTitle ? <span>{linkedTaskTitle} </span> : null}
            {canOpenTaskLink ? (
              <button
                type="button"
                className="uu-link"
                onClick={handleOpenTask}
              >
                ({linkedTaskId})
              </button>
            ) : (
              <span>({linkedTaskId})</span>
            )}
          </>
        ) : (
          <span>{linkedTaskTitle || linkedTaskFallback || "-"}</span>
        )}
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.renders.meta.updated", "Mise a jour: {value}", {
          value: formatDate(render?.updatedAt),
        })}
      </div>
      {outputPath ? (
        <div className="uu-muted mt-8" style={{ wordBreak: "break-all" }}>
          {outputPath}
        </div>
      ) : null}
      <div className="uu-row mt-12" onClick={(e) => e.stopPropagation()}>
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
            <option key={`render-review-card-${renderId}-${entry}`} value={entry}>
              {typeof renderReviewStatusLabel === "function" ? renderReviewStatusLabel(t, entry) : entry}
            </option>
          ))}
        </select>
        <button className="uu-btn-ghost" type="button" onClick={() => onOpenRenderDetail?.(render)}>
          {safeT(t, "postprod.renders.detail.view", "Voir")}
        </button>
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
    </div>
  );
}

export { RendersThumbsView };
