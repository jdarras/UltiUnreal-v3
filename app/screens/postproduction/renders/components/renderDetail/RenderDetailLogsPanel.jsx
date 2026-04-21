import { useMemo, useState } from "react";
import { formatDate, safeT } from "../../../shared/helpers";

function transitionLogLevel(entry = null) {
  const toStatus = String(entry?.toStatus || "").trim().toLowerCase();
  if (toStatus === "done") return "success";
  if (toStatus === "failed") return "error";
  if (toStatus === "canceled") return "warn";
  if (toStatus === "running") return "info";
  if (toStatus === "queued") return "debug";
  return "info";
}

function buildTransitionMessage(t, entry = null) {
  const fromStatus = String(entry?.fromStatus || "").trim();
  const toStatus = String(entry?.toStatus || "").trim();
  const comment = String(entry?.comment || "").trim();
  if (comment) {
    const compactComment = comment.replace(/\s+/g, " ").trim();
    const markerIndex = compactComment.indexOf(":");
    if (markerIndex > 0 && markerIndex <= 64) {
      const marker = compactComment.slice(0, markerIndex).trim();
      if (marker) return marker;
    }
    if (compactComment.length <= 120) return compactComment;
    return `${compactComment.slice(0, 120).trimEnd()}...`;
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
  const transitions = Array.isArray(detailTransitions) ? detailTransitions : [];

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
      <h4 className="uu-h3 uu-block-title" style={{ margin: "0 0 8px 0" }}>
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
                <div className="uu-row" style={{ justifyContent: "flex-start", marginTop: "8px" }}>
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

export default RenderDetailLogsPanel;
