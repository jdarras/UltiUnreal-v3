import { useState } from "react";
import { formatDate, safeT } from "../../../shared/helpers";

function nowDatetimeLocalValue() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RenderDetailInfoPanel({
  t,
  render = null,
  renderOutputName = "-",
  linkedTaskValue = null,
  reviewStatusValue = "to_validate",
  reviewFlow = [],
  reviewStatusLabel = null,
  canReviewRenders = false,
  rendersLoading = false,
  busyRenderId = 0,
  onApplyReviewStatus = null,
  onScheduleRender = null,
} = {}) {
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");

  if (!render) return null;
  const renderId = Number(render?.id || 0);
  const reviewItems = Array.isArray(reviewFlow) ? reviewFlow : [];
  const isQueued = String(render?.status || "") === "Queued";
  const scheduledAt = render?.scheduledAt || null;
  const minDatetimeLocal = nowDatetimeLocalValue();

  const handleStartEditSchedule = () => {
    setScheduleValue(toDatetimeLocalValue(scheduledAt));
    setEditingSchedule(true);
  };

  const handleSaveSchedule = async () => {
    if (typeof onScheduleRender !== "function") { setEditingSchedule(false); return; }
    let resolvedScheduledAt = null;
    if (scheduleValue) {
      const d = new Date(scheduleValue);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        resolvedScheduledAt = d.toISOString();
      }
    }
    await onScheduleRender(renderId, resolvedScheduledAt);
    setEditingSchedule(false);
  };

  const handleCancelSchedule = () => {
    setEditingSchedule(false);
  };

  const handleScheduleKeyDown = (e) => {
    if (e.key === "Enter") handleSaveSchedule();
    if (e.key === "Escape") handleCancelSchedule();
  };

  return (
    <section className="uu-render-detail-info-block">
      <div className="uu-grid-field">
        <label className="uu-label">{safeT(t, "postprod.renders.table.project", "Projet")}</label>
        <div>{String(render?.projectName || "-")}</div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.table.file", "Fichier")}</label>
        <div>{renderOutputName}</div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.table.linkedTask", "Tache")}</label>
        <div>{typeof linkedTaskValue === "function" ? (linkedTaskValue(render) || "-") : "-"}</div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.table.requester", "Demandeur")}</label>
        <div>{String(render?.requestedByUsername || "-")}</div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.table.updated", "Mise a jour")}</label>
        <div>{formatDate(render?.updatedAt)}</div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.detail.error", "Derniere erreur")}</label>
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {String(render?.errorMessage || "").trim() || "-"}
        </div>
      </div>
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.detail.attempts", "Tentatives")}</label>
        <div>
          {safeT(t, "postprod.renders.detail.attemptsValue", "{count}/{max}", {
            count: Number.isFinite(Number(render?.attemptCount))
              ? Math.max(0, Math.trunc(Number(render.attemptCount)))
              : 0,
            max: Number.isFinite(Number(render?.maxAttempts))
              ? Math.max(1, Math.trunc(Number(render.maxAttempts)))
              : 1,
          })}
        </div>
      </div>
      {isQueued ? (
        <div className="uu-grid-field mt-8">
          <label className="uu-label">{safeT(t, "postprod.renders.scheduledAt.label", "Date et heure de début")}</label>
          <div>
            {editingSchedule ? (
              <div className="uu-row" style={{ gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="datetime-local"
                  className="uu-input"
                  style={{ height: "30px", fontSize: "0.9em" }}
                  min={minDatetimeLocal}
                  value={scheduleValue}
                  autoFocus
                  disabled={rendersLoading}
                  onChange={(e) => setScheduleValue(e.target.value)}
                  onKeyDown={handleScheduleKeyDown}
                  onBlur={handleSaveSchedule}
                />
                <button
                  className="uu-btn"
                  type="button"
                  style={{ height: "30px", padding: "0 10px", fontSize: "0.85em" }}
                  onMouseDown={(e) => { e.preventDefault(); handleSaveSchedule(); }}
                >
                  {safeT(t, "postprod.renders.queue.jobs.save", "Valider")}
                </button>
                <button
                  className="uu-btn-ghost"
                  type="button"
                  style={{ height: "30px", padding: "0 10px", fontSize: "0.85em" }}
                  onMouseDown={(e) => { e.preventDefault(); handleCancelSchedule(); }}
                >
                  {safeT(t, "postprod.renders.queue.jobs.cancel", "Annuler")}
                </button>
              </div>
            ) : (
              <button
                className="uu-btn-ghost"
                type="button"
                style={{ padding: "2px 6px", fontSize: "0.9em", textAlign: "left" }}
                disabled={!isQueued || typeof onScheduleRender !== "function"}
                onClick={handleStartEditSchedule}
              >
                {scheduledAt
                  ? formatDate(scheduledAt)
                  : <span className="uu-muted">{safeT(t, "postprod.renders.queue.immediate", "Immédiat")}</span>
                }
              </button>
            )}
          </div>
        </div>
      ) : null}
      <div className="uu-grid-field mt-8">
        <label className="uu-label">{safeT(t, "postprod.renders.table.reviewStatus", "Validation")}</label>
        <select
          className="uu-input"
          value={reviewStatusValue}
          disabled={
            rendersLoading
            || busyRenderId === renderId
            || typeof onApplyReviewStatus !== "function"
            || !canReviewRenders
          }
          onChange={async (e) => {
            const next = String(e.target.value || "").trim();
            if (!next) return;
            await onApplyReviewStatus?.(render, next);
          }}
        >
          {reviewItems.map((entry) => (
            <option key={`render-review-detail-${entry}`} value={entry}>
              {typeof reviewStatusLabel === "function" ? reviewStatusLabel(t, entry) : entry}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export { RenderDetailInfoPanel };
export default RenderDetailInfoPanel;
