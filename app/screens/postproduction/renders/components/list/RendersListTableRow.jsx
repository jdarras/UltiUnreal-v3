import { useEffect, useState } from "react";
import { safeT } from "../../../shared/helpers";

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

function toPositiveInt(value = 0) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Math.trunc(Number(value));
  const raw = String(value || "").trim();
  if (!raw) return 0;
  if (/^\#?\d+$/.test(raw)) return Math.trunc(Number(raw.replace(/^#/, "")));
  return 0;
}

function firstPositiveInt(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const parsed = toPositiveInt(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function extractFormIdFromTemplateLike(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const match = /^form[\s\-_#]*(\d+)$/i.exec(raw);
  if (!match) return 0;
  return toPositiveInt(match[1]);
}

function resolveLinkedRenderFormEntry(formId = 0, renderForms = []) {
  const normalizedFormId = Number.isFinite(Number(formId)) && Number(formId) > 0
    ? Math.trunc(Number(formId))
    : 0;
  if (normalizedFormId <= 0) return null;
  const list = Array.isArray(renderForms) ? renderForms : [];
  return list.find((entry) => Number(entry?.id || 0) === normalizedFormId) || null;
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

function resolveRenderFormMeta(render = null, renderForms = []) {
  const item = render && typeof render === "object" ? render : {};
  const payload = resolveRenderPayload(item);
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

function reviewStatusClassName(reviewStatus = "") {
  const key = String(reviewStatus || "").trim().toLowerCase();
  if (key === "validated") return "status-validated";
  if (key === "rejected" || key === "to_modify" || key === "canceled") return "status-rejected";
  return "status-to-validate";
}

function RendersListTableRow({
  t,
  render = null,
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
  onRequestOpenRenderEditor = null,
  onNavigateToRenderForm = null,
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
  const { formId, formName } = resolveRenderFormMeta(render, renderForms);
  const linkedTaskFallback = typeof renderLinkedTaskValue === "function"
    ? String(renderLinkedTaskValue(render) || "").trim()
    : "";
  const formNameLabel = String(formName || "").trim();
  const formIdLabel = formId > 0 ? `#${String(formId)}` : "";
  const linkedTaskLabel = linkedTaskTitle || linkedTaskFallback || "";
  const linkedTaskIdText = linkedTaskId > 0 ? `#${String(linkedTaskId).padStart(4, "0")}` : "";
  const canOpenTaskLink = typeof onRequestOpenRenderEditor === "function" && linkedTaskId > 0;
  const canOpenFormLink = typeof onNavigateToRenderForm === "function" && formId > 0;
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

  const handleOpenForm = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canOpenFormLink) return;
    onNavigateToRenderForm?.({ id: formId, name: formNameLabel || "" });
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
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
          {typeof renderOutputFilename === "function" ? renderOutputFilename(render) : "-"}
        </div>
        {formNameLabel || formIdLabel ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {formNameLabel ? (
              <span
                onClick={canOpenFormLink ? handleOpenForm : undefined}
                style={{
                  color: "#fff",
                  overflowWrap: "anywhere",
                  ...(canOpenFormLink ? { cursor: "pointer" } : {}),
                }}
              >
                {formNameLabel}
              </span>
            ) : null}
            {formIdLabel ? (
              <span style={{ whiteSpace: "nowrap", opacity: 0.4 }}>
                {formIdLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {linkedTaskId > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            {linkedTaskLabel ? (
              <span
                onClick={canOpenTaskLink ? handleOpenTask : undefined}
                style={{
                  color: "#fff",
                  overflowWrap: "anywhere",
                  ...(canOpenTaskLink ? { cursor: "pointer" } : {}),
                }}
              >
                {linkedTaskLabel}
              </span>
            ) : null}
            <span style={{ whiteSpace: "nowrap", opacity: 0.4 }}>{linkedTaskIdText}</span>
          </div>
        ) : (
          linkedTaskTitle || linkedTaskFallback || "-"
        )}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>{String(render?.requestedByUsername || "-")}</td>
      <td style={{ overflowWrap: "anywhere", fontWeight: 600 }}>{stationName || "-"}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <select
          className={`uu-input uu-status-select ${reviewStatusClassName(reviewStatus)}`}
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

