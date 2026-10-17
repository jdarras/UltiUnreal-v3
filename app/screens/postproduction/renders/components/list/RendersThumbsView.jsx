import { useEffect, useState } from "react";
import { formatDate, safeT, simplifyUnrealAssetDisplayName } from "../../../shared/helpers";
import { renderReviewStatusClassName } from "../../helpers";
import {
  firstNonEmptyString,
  firstPositiveInt,
} from "../../../../../utils/coerce";
import {
  extractFormIdFromTemplateLike,
  resolveLinkedRenderFormEntry,
  normalizeProjectLookupKey,
  readProjectLabel,
} from "../../renderLookupHelpers";

const RENDERS_THUMB_CARD_CLICKABLE_STYLE = { cursor: "pointer" };
const RENDERS_THUMB_HEADER_ROW_STYLE = { justifyContent: "space-between", alignItems: "baseline", gap: "8px" };
const RENDERS_THUMB_FILE_STYLE = { fontWeight: 600, overflowWrap: "anywhere", minWidth: 0 };
const RENDERS_THUMB_ID_STYLE = { opacity: 0.4, fontSize: "0.85em", whiteSpace: "nowrap", flexShrink: 0 };
const RENDERS_THUMB_LINK_STYLE = { cursor: "pointer" };
const RENDERS_THUMB_META_TAG_WITH_MARGIN_STYLE = { marginLeft: "6px", opacity: 0.4 };
const RENDERS_THUMB_META_TAG_NO_MARGIN_STYLE = { marginLeft: "0", opacity: 0.4 };
const RENDERS_THUMB_DELETE_BUTTON_STYLE = {
  width: "32px",
  minWidth: "32px",
  height: "32px",
  padding: "0",
  flex: "0 0 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

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

function resolveRenderFormMeta(render = null, renderForms = []) {
  const item = render && typeof render === "object" ? render : {};
  const payload = item?.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  const formId = firstPositiveInt([
    item?.formId,
    item?.renderFormId,
    item?.formRef,
    item?.renderFormRef,
    payload?.formId,
    payload?.renderFormId,
    payload?.formRef,
    payload?.renderFormRef,
    extractFormIdFromTemplateLike(item?.templateName),
    extractFormIdFromTemplateLike(payload?.templateName),
  ]);
  const formEntry = resolveLinkedRenderFormEntry(formId, renderForms);
  const formName = firstNonEmptyString([
    item?.formName,
    item?.renderFormName,
    payload?.formName,
    payload?.renderFormName,
    payload?.formLabel,
    formEntry?.name,
    formEntry?.label,
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

function RendersThumbsView({
  t,
  sortedDisplayedRenders = [],
  renderForms = [],
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
          renderForms={renderForms}
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
  renderForms = [],
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
    && String(render?.sourceScope || "").trim().toLowerCase() !== "remote"
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
  const { formId, formName } = resolveRenderFormMeta(render, renderForms);
  const sequenceLabel = resolveRenderSequenceLabel(render);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const formNameLabel = String(formName || "").trim();
  const formIdText = formId > 0 ? `#${String(formId)}` : "";
  const renderIdText = renderId > 0 ? `#${String(renderId)}` : "";
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
    onNavigateToRenderForm?.({ id: formId, name: formNameLabel || "" });
  };

  return (
    <div
      className="uu-card uu-render-item-clickable"
      style={RENDERS_THUMB_CARD_CLICKABLE_STYLE}
      onClick={() => onOpenRenderDetail?.(render)}
    >
      <div className="uu-row" style={RENDERS_THUMB_HEADER_ROW_STYLE}>
        <div style={RENDERS_THUMB_FILE_STYLE}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
        {renderIdText ? (
          <span style={RENDERS_THUMB_ID_STYLE}>{renderIdText}</span>
        ) : null}
      </div>
      <div className="uu-render-thumb-frame mt-8">
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
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.table.project", "Projet")}: </span>
        <span
          onClick={canOpenProjectLink ? handleOpenProject : undefined}
          style={canOpenProjectLink ? RENDERS_THUMB_LINK_STYLE : undefined}
        >
          {projectLabel}
        </span>
        {showProjectRefTag ? (
          <span style={RENDERS_THUMB_META_TAG_WITH_MARGIN_STYLE}>#{projectRef}</span>
        ) : null}
      </div>
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.table.linkedTask", "Rendu")}: </span>
        {linkedTaskId > 0 ? (
          <>
            {linkedTaskTitle ? <span>{linkedTaskTitle}</span> : null}
            <span style={linkedTaskTitle ? RENDERS_THUMB_META_TAG_WITH_MARGIN_STYLE : RENDERS_THUMB_META_TAG_NO_MARGIN_STYLE}>
              #{String(linkedTaskId).padStart(4, "0")}
            </span>
          </>
        ) : (
          <span className="uu-render-thumb-meta-value">{linkedTaskTitle || linkedTaskFallback || "-"}</span>
        )}
      </div>
      <div className="uu-render-thumb-meta-row mt-8" onClick={(e) => e.stopPropagation()}>
        <span className="uu-muted">{safeT(t, "postprod.renders.detail.form", "Formulaire")}: </span>
        {formNameLabel ? (
          <span
            onClick={canOpenFormLink ? handleOpenForm : undefined}
            style={canOpenFormLink ? RENDERS_THUMB_LINK_STYLE : undefined}
          >
            {formNameLabel}
          </span>
        ) : null}
        {formIdText ? (
          <span style={formNameLabel ? RENDERS_THUMB_META_TAG_WITH_MARGIN_STYLE : RENDERS_THUMB_META_TAG_NO_MARGIN_STYLE}>{formIdText}</span>
        ) : null}
        {!formNameLabel && !formIdText ? (
          <span className="uu-render-thumb-meta-value">-</span>
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
          className={`uu-input uu-render-thumb-validation uu-status-select ${renderReviewStatusClassName(reviewStatus)}`}
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
          style={RENDERS_THUMB_DELETE_BUTTON_STYLE}
        >
          {"X"}
        </button>
      </div>
    </div>
  );
}

export { RendersThumbsView };
