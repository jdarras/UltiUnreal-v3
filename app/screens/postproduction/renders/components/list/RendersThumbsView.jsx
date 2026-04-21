import { useEffect, useState } from "react";
import { formatDate, safeT, simplifyUnrealAssetDisplayName } from "../../../shared/helpers";

function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeProjectLookupKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeProjectNumericKey(value = "") {
  const raw = String(value || "").trim();
  if (!raw || !/^\d+$/.test(raw)) return "";
  return String(Math.trunc(Number(raw)));
}

function readProjectLabel(projectLabelByRef = new Map(), rawValue = "") {
  if (!(projectLabelByRef instanceof Map)) return "";
  const key = normalizeProjectLookupKey(rawValue);
  if (!key) return "";
  const direct = String(projectLabelByRef.get(key) || "").trim();
  if (direct) return direct;
  const numericKey = normalizeProjectNumericKey(rawValue);
  if (!numericKey) return "";
  return String(projectLabelByRef.get(numericKey) || "").trim();
}

function resolveRenderProjectMeta(render = null, projectLabelByRef = new Map()) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const projectRef = firstNonEmptyString([
    item?.projectId,
    item?.projectRef,
    payload?.projectId,
    payload?.projectRef,
    item?.projectName,
    payload?.projectName,
  ]);
  const rawProjectName = firstNonEmptyString([
    item?.projectDisplayName,
    payload?.projectDisplayName,
    item?.projectTitle,
    payload?.projectTitle,
    item?.projectLabel,
    payload?.projectLabel,
    item?.projectName,
    payload?.projectName,
  ]);
  const projectName = firstNonEmptyString([
    readProjectLabel(projectLabelByRef, projectRef),
    readProjectLabel(projectLabelByRef, rawProjectName),
    rawProjectName,
  ]);
  return {
    projectRef,
    projectName,
    projectRefLower: normalizeProjectLookupKey(projectRef),
    projectNameLower: normalizeProjectLookupKey(projectName),
  };
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

function resolveRenderFormMeta(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const formIdRaw = Number(item?.formId || item?.renderFormId || payload?.formId || payload?.renderFormId || 0);
  const formId = Number.isFinite(formIdRaw) && formIdRaw > 0 ? Math.trunc(formIdRaw) : 0;
  const formName = firstNonEmptyString([
    item?.formName, item?.renderFormName, payload?.formName, payload?.renderFormName, payload?.formLabel,
  ]);
  return { formId, formName };
}

function resolveRenderSequenceLabel(render = null) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const raw = firstNonEmptyString([
    item?.sequenceName, payload?.sequenceName, payload?.levelSequence, payload?.levelSequenceName,
  ]);
  return simplifyUnrealAssetDisplayName(raw) || raw || "-";
}

function reviewStatusClassName(reviewStatus = "") {
  const key = String(reviewStatus || "").trim().toLowerCase();
  if (key === "validated") return "status-validated";
  if (key === "rejected" || key === "to_modify" || key === "canceled") return "status-rejected";
  return "status-to-validate";
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
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  projectLabelByRef = new Map(),
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
          onNavigateToProject={onNavigateToProject}
          onNavigateToRenderForm={onNavigateToRenderForm}
          projectLabelByRef={projectLabelByRef}
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
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  projectLabelByRef = new Map(),
}) {
  const renderId = Number(render?.id || 0);
  const reviewStatus = typeof renderReviewStatusKey === "function" ? renderReviewStatusKey(render) : "to_validate";
  const thumbCandidates = typeof buildRenderThumbCandidates === "function" ? buildRenderThumbCandidates(render) : [];
  const [thumbIndex, setThumbIndex] = useState(0);
  const thumbSrc = thumbCandidates[thumbIndex] || "";
  const [thumbError, setThumbError] = useState(false);
  const isBusy = busyRenderId === renderId;
  const canDeleteRender = (
    typeof onDeleteRender === "function"
    && Number.isFinite(renderId)
    && renderId > 0
  );
  const projectMeta = resolveRenderProjectMeta(render, projectLabelByRef);
  const projectRef = projectMeta.projectRef;
  const projectLabel = projectMeta.projectName || projectRef || "-";
  const showProjectRefTag = Boolean(
    projectRef
    && projectLabel
    && projectMeta.projectRefLower !== projectMeta.projectNameLower
  );
  const hasThumb = Boolean(thumbSrc) && !thumbError;
  const { taskId: linkedTaskId, taskTitle: linkedTaskTitle } = resolveRenderLinkedTaskMeta(render);
  const { formId, formName } = resolveRenderFormMeta(render);
  const sequenceLabel = resolveRenderSequenceLabel(render);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const formPrimaryLabel = String(formName || (formId > 0 ? formId : "-")).trim() || "-";
  const formIdText = formId > 0 ? String(formId) : "";
  const showFormIdTag = Boolean(
    formIdText
    && formName
    && String(formName).trim().toLowerCase() !== formIdText.toLowerCase()
  );
  const canOpenProjectLink = typeof onNavigateToProject === "function" && !!projectRef;
  const canOpenFormLink = typeof onNavigateToRenderForm === "function" && formId > 0;

  useEffect(() => {
    setThumbIndex(0);
    setThumbError(false);
  }, [renderId, thumbCandidates.join("|")]);

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

  const handleOpenForm = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenFormLink) return;
    onNavigateToRenderForm?.({ id: formId, name: formName || "" });
  };

  return (
    <div
      className="uu-card uu-render-item-clickable"
      style={{ cursor: "pointer" }}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      <div className="uu-render-thumb-frame">
        {hasThumb ? (
          <img
            src={thumbSrc}
            alt={typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
            className="uu-render-thumb"
            onError={() => {
              const nextIndex = thumbIndex + 1;
              if (nextIndex < thumbCandidates.length) {
                setThumbError(false);
                setThumbIndex(nextIndex);
                return;
              }
              setThumbError(true);
            }}
          />
        ) : (
          <div className="uu-render-thumb placeholder">{safeT(t, "postprod.renders.preview.none", "Aucun apercu")}</div>
        )}
      </div>
      <div className="uu-row mt-8" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
      </div>
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.table.project", "Projet")}: </span>
        <span
          onClick={canOpenProjectLink ? handleOpenProject : undefined}
          style={canOpenProjectLink ? { cursor: "pointer" } : undefined}
        >
          {projectLabel}
        </span>
        {showProjectRefTag ? (
          <span style={{ marginLeft: "6px", opacity: 0.4 }}>#{projectRef}</span>
        ) : null}
      </div>
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.table.linkedTask", "Tache")}: </span>
        {linkedTaskId > 0 ? (
          <>
            {linkedTaskTitle ? <span>{linkedTaskTitle}</span> : null}
            <span style={{ marginLeft: linkedTaskTitle ? "6px" : "0", opacity: 0.4 }}>
              #{String(linkedTaskId).padStart(4, "0")}
            </span>
          </>
        ) : (
          <span className="uu-render-thumb-meta-value">{linkedTaskTitle || linkedTaskFallback || "-"}</span>
        )}
      </div>
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.detail.form", "Formulaire")}: </span>
        <span
          onClick={canOpenFormLink ? handleOpenForm : undefined}
          style={canOpenFormLink ? { cursor: "pointer" } : undefined}
        >
          {formPrimaryLabel}
        </span>
        {showFormIdTag ? (
          <span style={{ marginLeft: "6px", opacity: 0.4 }}>[{formIdText}]</span>
        ) : null}
      </div>
      <div className="uu-render-thumb-meta-row mt-8">
        <span className="uu-muted">{safeT(t, "postprod.data.forms.levelSequence", "LS")}: </span>
        <span className="uu-render-thumb-meta-value">{sequenceLabel || "-"}</span>
      </div>
      <div className="uu-render-thumb-meta-row mt-8">
        <span className="uu-muted">{safeT(t, "postprod.renders.meta.updatedShort", "MàJ")}: </span>
        <span className="uu-render-thumb-meta-value">{formatDate(render?.updatedAt)}</span>
      </div>
      <div className="uu-render-thumb-actions mt-12" onClick={(e) => e.stopPropagation()}>
        <select
          className={`uu-input uu-render-thumb-validation uu-status-select ${reviewStatusClassName(reviewStatus)}`}
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
        <button
          className="uu-btn-ghost uu-render-thumb-view-btn"
          type="button"
          onClick={() => onOpenRenderDetail?.(render)}
        >
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
            flex: "0 0 32px",
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
