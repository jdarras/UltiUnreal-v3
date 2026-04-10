import { formatDate, safeT } from "../../../shared/helpers";

function RenderDetailLogsPanel({
  t,
  transitionsLoading = false,
  transitionsError = "",
  detailTransitions = [],
} = {}) {
  return (
    <section className="uu-render-detail-logs-block">
      <label className="uu-label">{safeT(t, "postprod.renders.logs.title", "Logs d'execution")}</label>
      {transitionsLoading ? (
        <div className="uu-muted">
          {safeT(t, "postprod.renders.logs.loading", "Chargement des logs...")}
        </div>
      ) : null}
      {!transitionsLoading && transitionsError ? (
        <div className="uu-msg warn">{transitionsError}</div>
      ) : null}
      {!transitionsLoading && !transitionsError && detailTransitions.length <= 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.renders.logs.empty", "Aucun log d'execution pour ce rendu.")}
        </div>
      ) : null}
      {!transitionsLoading && !transitionsError && detailTransitions.length > 0 ? (
        <div
          className="uu-render-detail-logs-list"
          style={{
            maxHeight: "420px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          {detailTransitions.map((entry, index) => {
            const fromStatus = String(entry?.fromStatus || "").trim();
            const toStatus = String(entry?.toStatus || "").trim();
            const byUser = String(entry?.byUsername || "").trim();
            const statusLabel = fromStatus || toStatus
              ? `${fromStatus || "-"} → ${toStatus || "-"}`
              : "-";
            const comment = String(entry?.comment || "").trim();
            const key = `render-detail-log-${Number(entry?.id || 0)}-${index}`;
            return (
              <div key={key} style={{ borderBottom: "1px solid var(--uu-line, #2d3546)", paddingBottom: "8px" }}>
                <div className="uu-row" style={{ justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <strong>{statusLabel}</strong>
                  <span className="uu-muted">{formatDate(entry?.createdAt)}</span>
                </div>
                <div className="uu-muted mt-4">
                  {safeT(t, "postprod.renders.logs.by", "Par: {value}", {
                    value: byUser || "-",
                  })}
                </div>
                {comment ? (
                  <pre
                    style={{
                      margin: "6px 0 0 0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "inherit",
                    }}
                  >
                    {comment}
                  </pre>
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

