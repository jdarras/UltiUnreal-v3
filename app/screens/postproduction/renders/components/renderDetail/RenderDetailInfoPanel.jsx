import { formatDate, safeT } from "../../../shared/helpers";

function RenderTransitionsSection({
  t,
  transitionsLoading = false,
  transitionsError = "",
  detailTransitions = [],
} = {}) {
  return (
    <div className="uu-grid-field mt-12">
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
          className="uu-card"
          style={{
            marginTop: "8px",
            maxHeight: "260px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
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
    </div>
  );
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
  transitionsLoading = false,
  transitionsError = "",
  detailTransitions = [],
} = {}) {
  if (!render) return null;
  const renderId = Number(render?.id || 0);
  const reviewItems = Array.isArray(reviewFlow) ? reviewFlow : [];

  return (
    <div className="uu-card">
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
      <RenderTransitionsSection
        t={t}
        transitionsLoading={transitionsLoading}
        transitionsError={transitionsError}
        detailTransitions={detailTransitions}
      />
    </div>
  );
}

export { RenderDetailInfoPanel };
export default RenderDetailInfoPanel;
