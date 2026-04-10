import { useState } from "react";
import { safeT, formatDate } from "../../shared/helpers";

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

function renderStatusLevel(status) {
  switch (String(status || "").toLowerCase()) {
    case "queued": return "info";
    case "running": return "warn";
    case "done": return "ok";
    case "error": return "error";
    case "canceled": return "muted";
    default: return "info";
  }
}

function RenderJobsQueueRow({
  t,
  job,
  index,
  total,
  busy = false,
  onMoveUp = null,
  onMoveDown = null,
  onSchedule = null,
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const jobId = Number(job?.id || 0);
  const status = String(job?.status || "Queued");
  const isQueued = status === "Queued";
  const scheduledAt = job?.scheduledAt || null;
  const minDatetimeLocal = nowDatetimeLocalValue();

  const handleStartEdit = () => {
    setEditValue(toDatetimeLocalValue(scheduledAt));
    setEditing(true);
  };

  const handleSave = () => {
    if (!editValue) {
      onSchedule?.(jobId, null);
    } else {
      const d = new Date(editValue);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        onSchedule?.(jobId, d.toISOString());
      }
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <tr>
      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
        <div className="uu-row" style={{ gap: "4px", justifyContent: "center", flexWrap: "nowrap" }}>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={busy || !isQueued || index === 0}
            title={safeT(t, "postprod.renders.queue.moveUp", "Monter")}
            onClick={() => onMoveUp?.(jobId, index)}
            style={{ padding: "2px 6px", minWidth: "28px" }}
          >
            ↑
          </button>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={busy || !isQueued || index === total - 1}
            title={safeT(t, "postprod.renders.queue.moveDown", "Descendre")}
            onClick={() => onMoveDown?.(jobId, index)}
            style={{ padding: "2px 6px", minWidth: "28px" }}
          >
            ↓
          </button>
        </div>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        <span style={{ fontWeight: 600 }}>{String(job?.templateName || "-")}</span>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>{String(job?.projectName || "-")}</td>
      <td>
        <span className={`uu-chip lvl-${renderStatusLevel(status)} chip-on`}>
          {status}
        </span>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {isQueued ? (
          editing ? (
            <div className="uu-row" style={{ gap: "4px", alignItems: "center", flexWrap: "nowrap" }}>
              <input
                type="datetime-local"
                className="uu-input"
                style={{ height: "28px", fontSize: "0.85em" }}
                min={minDatetimeLocal}
                value={editValue}
                autoFocus
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
              />
              <button
                className="uu-btn"
                type="button"
                style={{ padding: "2px 8px", height: "28px", fontSize: "0.85em" }}
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
              >
                {safeT(t, "postprod.renders.queue.jobs.save", "Valider")}
              </button>
              <button
                className="uu-btn-ghost"
                type="button"
                style={{ padding: "2px 8px", height: "28px", fontSize: "0.85em" }}
                onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
              >
                {safeT(t, "postprod.renders.queue.jobs.cancel", "Annuler")}
              </button>
            </div>
          ) : (
            <button
              className="uu-btn-ghost"
              type="button"
              style={{ padding: "2px 6px", fontSize: "0.85em", textAlign: "left" }}
              onClick={handleStartEdit}
              title={safeT(t, "postprod.renders.scheduledAt.label", "Date et heure de début")}
            >
              {scheduledAt
                ? formatDate(scheduledAt)
                : <span className="uu-muted">{safeT(t, "postprod.renders.queue.immediate", "Immédiat")}</span>
              }
            </button>
          )
        ) : (
          <span className="uu-muted">
            {scheduledAt ? formatDate(scheduledAt) : safeT(t, "postprod.renders.queue.immediate", "Immédiat")}
          </span>
        )}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {String(job?.assignedWorkerName || job?.assignedWorkerKey || "-")}
      </td>
    </tr>
  );
}

function RenderJobsQueuePanel({
  t,
  renders = [],
  rendersLoading = false,
  onScheduleRender = null,
  onReorderRenders = null,
}) {
  const [busy, setBusy] = useState(false);

  // Filter to Queued jobs, sort by queue_order then created_at
  const queuedJobs = (Array.isArray(renders) ? renders : [])
    .filter((r) => String(r?.status || "") === "Queued")
    .slice()
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a?.queueOrder)) ? Number(a.queueOrder) : 0;
      const orderB = Number.isFinite(Number(b?.queueOrder)) ? Number(b.queueOrder) : 0;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });

  const handleSchedule = async (jobId, scheduledAt) => {
    if (typeof onScheduleRender !== "function") return;
    setBusy(true);
    try {
      await onScheduleRender(jobId, scheduledAt);
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (jobId, fromIndex, direction) => {
    if (typeof onReorderRenders !== "function") return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= queuedJobs.length) return;
    const reordered = [...queuedJobs];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const order = reordered.map((job, idx) => ({
      id: Number(job.id),
      queueOrder: idx,
    }));
    setBusy(true);
    try {
      await onReorderRenders(order);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uu-card mt-12">
      <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
        <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
          {safeT(t, "postprod.renders.queue.title", "File d'attente")}
        </h4>
        <span className="uu-muted">
          {queuedJobs.length > 0 ? `(${queuedJobs.length})` : ""}
        </span>
      </div>

      {rendersLoading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.queue.loading", "Chargement...")}</div>
      ) : queuedJobs.length === 0 ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.queue.jobs.empty", "Aucun job en file d'attente.")}</div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "12px" }}>
          <table className="uu-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "80px" }}></th>
                <th>{safeT(t, "postprod.renders.table.template", "Template")}</th>
                <th>{safeT(t, "postprod.renders.table.project", "Projet")}</th>
                <th>{safeT(t, "postprod.renders.table.status", "Statut")}</th>
                <th>{safeT(t, "postprod.renders.scheduledAt.label", "Date et heure de début")}</th>
                <th>{safeT(t, "postprod.renders.table.worker", "Station de rendu")}</th>
              </tr>
            </thead>
            <tbody>
              {queuedJobs.map((job, index) => (
                <RenderJobsQueueRow
                  key={`render-job-queue-${job.id}`}
                  t={t}
                  job={job}
                  index={index}
                  total={queuedJobs.length}
                  busy={busy || rendersLoading}
                  onMoveUp={(id, idx) => handleMove(id, idx, -1)}
                  onMoveDown={(id, idx) => handleMove(id, idx, +1)}
                  onSchedule={handleSchedule}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { RenderJobsQueuePanel };
export default RenderJobsQueuePanel;
