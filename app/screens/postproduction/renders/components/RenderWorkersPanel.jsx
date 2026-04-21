import { useState } from "react";
import { safeT } from "../../shared/helpers";

function WorkerStatusDot({ isOnline }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: isOnline ? "var(--uu-color-green, #4caf50)" : "var(--uu-color-border)",
        flexShrink: 0,
      }}
      title={isOnline ? "En ligne" : "Hors ligne"}
    />
  );
}

function RenderWorkerRow({ t, worker, busy = false, onPatchWorkerAptitude = null }) {
  const workerKey = String(worker?.workerKey || "").trim();
  const displayName = String(worker?.displayName || workerKey || "-").trim();
  const isOnline = worker?.isOnline === true;
  const canRender = worker?.canRender === true;
  const apte = worker?.apte === true;
  const hasCurrentJob = !!worker?.currentRenderJobId;
  const currentJobInfo = hasCurrentJob
    ? [worker.currentRenderTemplateName, worker.currentRenderProjectName].filter(Boolean).join(" / ")
    : "";
  const currentStatus = String(worker?.currentRenderStatus || "").trim();

  const canToggle = typeof onPatchWorkerAptitude === "function" && !busy;

  return (
    <tr>
      <td>
        <div className="uu-row" style={{ gap: "8px", alignItems: "center" }}>
          <WorkerStatusDot isOnline={isOnline} />
          <span style={{ fontWeight: 600 }}>{displayName}</span>
        </div>
      </td>
      <td>
        {hasCurrentJob ? (
          <div>
            <span className={`uu-chip lvl-${currentStatus === "Running" ? "warn" : "info"} chip-on`} style={{ fontSize: "0.8em" }}>
              {currentStatus || "Running"}
            </span>
            {currentJobInfo ? (
              <span className="uu-muted" style={{ marginLeft: "6px", fontSize: "0.85em" }}>{currentJobInfo}</span>
            ) : null}
          </div>
        ) : (
          <span className="uu-muted" style={{ fontSize: "0.85em" }}>
            {safeT(t, "postprod.renders.workers.idle", "Libre")}
          </span>
        )}
      </td>
      <td>
        {canRender ? (
          <span className={`uu-chip ${apte ? "lvl-ok chip-on" : "lvl-error chip-on"}`} style={{ fontSize: "0.8em" }}>
            {apte
              ? safeT(t, "postprod.renders.aptitude.toggle", "Apte au rendu")
              : safeT(t, "postprod.renders.workers.inapte", "Non apte")}
          </span>
        ) : (
          <span className="uu-muted" style={{ fontSize: "0.85em" }}>
            {safeT(t, "postprod.renders.workers.canRenderDisabled", "Rendu désactivé")}
          </span>
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        {canRender ? (
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={!canToggle}
            style={{ fontSize: "0.85em", padding: "2px 10px" }}
            onClick={() => onPatchWorkerAptitude?.(workerKey, !apte)}
          >
            {apte
              ? safeT(t, "postprod.renders.workers.revokeAptitude", "Révoquer")
              : safeT(t, "postprod.renders.workers.grantAptitude", "Activer")}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function RenderWorkersPanel({
  t,
  renderWorkers = [],
  renderWorkersLoading = false,
  onPatchWorkerAptitude = null,
}) {
  const [busyKey, setBusyKey] = useState(null);

  const workers = Array.isArray(renderWorkers) ? renderWorkers : [];

  const handleToggle = async (workerKey, apte) => {
    if (typeof onPatchWorkerAptitude !== "function") return;
    setBusyKey(workerKey);
    try {
      await onPatchWorkerAptitude(workerKey, apte);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="uu-card mt-12">
      <p className="uu-h3 uu-block-title">
        {safeT(t, "postprod.renders.workers.title", "Machines de rendu")}
      </p>

      {renderWorkersLoading && workers.length === 0 ? (
        <div className="uu-muted mt-12">
          {safeT(t, "postprod.renders.workers.loading", "Chargement des stations...")}
        </div>
      ) : workers.length === 0 ? (
        <div className="uu-muted mt-12">
          {safeT(t, "postprod.renders.workers.empty", "Aucune station enregistrée.")}
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "12px" }}>
          <table className="uu-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{safeT(t, "postprod.renders.workers.col.name", "Machine")}</th>
                <th>{safeT(t, "postprod.renders.workers.col.job", "Tâche en cours")}</th>
                <th>{safeT(t, "postprod.renders.workers.col.aptitude", "Aptitude")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => {
                const key = String(worker?.workerKey || worker?.id || "");
                return (
                  <RenderWorkerRow
                    key={`render-worker-${key}`}
                    t={t}
                    worker={worker}
                    busy={busyKey === key}
                    onPatchWorkerAptitude={handleToggle}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { RenderWorkersPanel };
export default RenderWorkersPanel;
