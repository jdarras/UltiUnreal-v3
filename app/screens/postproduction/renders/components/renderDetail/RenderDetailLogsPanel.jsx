import { useMemo, useState } from "react";
import { formatDate, safeT } from "../../../shared/helpers";

const RENDER_DETAIL_LOGS_TITLE_STYLE = { margin: "0 0 8px 0" };
const RENDER_DETAIL_LOGS_DETAILS_TOGGLE_ROW_STYLE = { justifyContent: "flex-start", marginTop: "8px" };

function transitionLogLevel(entry = null) {
  const toStatus = String(entry?.toStatus || "").trim().toLowerCase();
  if (toStatus === "done") return "success";
  if (toStatus === "failed") return "error";
  if (toStatus === "canceled") return "warn";
  if (toStatus === "running") return "info";
  if (toStatus === "queued") return "debug";
  return "info";
}

function humanizeRenderLogComment(comment = "") {
  const raw = String(comment || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, " ").trim();
  const separatorIndex = compact.indexOf(":");
  const marker = (separatorIndex > 0 ? compact.slice(0, separatorIndex) : compact).trim();
  const detail = separatorIndex > 0 ? compact.slice(separatorIndex + 1).trim() : "";
  const markerKey = marker.toLowerCase();
  const markerMap = {
    dispatch_auto_fifo: "Lancement automatique (FIFO)",
    dispatch_auto_policy: "Lancement automatique (politique par projet)",
    worker_completed: "Rendu Unreal termine",
    worker_failed_retry: "Rendu Unreal en erreur - nouvelle tentative",
    worker_failed_final: "Rendu Unreal en erreur - echec final",
    render_validated: "Rendu valide",
    render_marked_pending: "Rendu repasse a valider",
    render_rejected: "Rendu rejete",
    station_unreachable: "Station de rendu indisponible",
  };
  const base = String(markerMap[markerKey] || compact).trim();
  if (detail && markerMap[markerKey]) {
    return `${base}: ${detail}`;
  }
  if (base.length <= 260) return base;
  return `${base.slice(0, 260).trimEnd()}...`;
}

function buildTransitionMessage(t, entry = null) {
  const fromStatus = String(entry?.fromStatus || "").trim();
  const toStatus = String(entry?.toStatus || "").trim();
  const commentLabel = humanizeRenderLogComment(entry?.comment);
  if (commentLabel) {
    return commentLabel;
  }
  if (fromStatus || toStatus) {
    const baseLabel = safeT(t, "postprod.renders.logs.transition", "Transition");
    return `${baseLabel} ${fromStatus || "-"} -> ${toStatus || "-"}`;
  }
  return "-";
}

function RenderDetailLogsPanel({
  t,
  transitionsLoading = false,
  transitionsError = "",
  detailTransitions = [],
} = {}) {
  const [expandedByKey, setExpandedByKey] = useState({});
  const transitions = useMemo(
    () => (Array.isArray(detailTransitions) ? detailTransitions : []),
    [detailTransitions]
  );

  const normalizedLogs = useMemo(() => transitions.map((entry, index) => {
    const key = `render-detail-log-${Number(entry?.id || 0)}-${index}`;
    const fromStatus = String(entry?.fromStatus || "").trim();
    const toStatus = String(entry?.toStatus || "").trim();
    const byUser = String(entry?.byUsername || "").trim();
    return {
      key,
      level: transitionLogLevel(entry),
      ts: formatDate(entry?.createdAt),
      src: "POSTPROD",
      host: byUser || "-",
      action: toStatus || "-",
      message: buildTransitionMessage(t, entry),
      data: {
        fromStatus: fromStatus || "-",
        toStatus: toStatus || "-",
        by: byUser || "-",
        createdAt: String(entry?.createdAt || ""),
        comment: String(entry?.comment || ""),
      },
    };
  }), [t, transitions]);

  const toggleExpanded = (key = "") => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) return;
    setExpandedByKey((prev) => ({
      ...(prev || {}),
      [normalizedKey]: !prev?.[normalizedKey],
    }));
  };

  return (
    <section className="uu-render-detail-logs-block">
      <h4 className="uu-h3 uu-block-title" style={RENDER_DETAIL_LOGS_TITLE_STYLE}>
        {safeT(t, "postprod.renders.logs.title", "Logs d'execution")}
      </h4>
      {transitionsLoading ? (
        <div className="uu-muted">
          {safeT(t, "postprod.renders.logs.loading", "Chargement des logs...")}
        </div>
      ) : null}
      {!transitionsLoading && transitionsError ? (
        <div className="uu-msg warn">{transitionsError}</div>
      ) : null}
      {!transitionsLoading && !transitionsError && transitions.length <= 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.renders.logs.empty", "Aucun log d'execution pour ce rendu.")}
        </div>
      ) : null}
      {!transitionsLoading && !transitionsError && transitions.length > 0 ? (
        <div className="uu-render-detail-logs-list log-list">
          {normalizedLogs.map((entry) => {
            const isExpanded = !!expandedByKey?.[entry.key];
            return (
              <div key={entry.key} className={`log-row lvl-${entry.level}`}>
                <div className="log-meta">
                  <span className="log-ts">{entry.ts}</span>
                  <span className="log-src src-agent">{entry.src}</span>
                  <span className="log-host">{entry.host}</span>
                  <span className="log-action">{entry.action}</span>
                </div>
                <div className="log-msg">{entry.message}</div>
                <div className="uu-row" style={RENDER_DETAIL_LOGS_DETAILS_TOGGLE_ROW_STYLE}>
                  <button type="button" className="uu-btn" onClick={() => toggleExpanded(entry.key)}>
                    {isExpanded
                      ? safeT(t, "logs.details.hide", "Masquer détails")
                      : safeT(t, "logs.details.show", "Voir détails")}
                  </button>
                </div>
                {isExpanded ? (
                  <pre className="log-data">{JSON.stringify(entry.data, null, 2)}</pre>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export {
  RenderDetailLogsPanel,
};
