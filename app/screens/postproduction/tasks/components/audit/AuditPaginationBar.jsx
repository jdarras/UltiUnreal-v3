import { safeT } from "../../../shared/helpers";

function AuditPaginationBar({
  t,
  loading = false,
  filteredRows = [],
  total = 0,
  rows = [],
  page = 1,
  hasMore = false,
  onGoPrev = null,
  onGoNext = null,
}) {
  return (
    <div className="uu-row mt-12" style={{ justifyContent: "space-between", alignItems: "center" }}>
      <span className="uu-muted">
        {safeT(t, "postprod.audit.count", "{visible}/{total} affiches", {
          visible: filteredRows.length,
          total: Number.isFinite(Number(total)) ? Math.max(0, Math.trunc(Number(total))) : rows.length,
        })}
      </span>
      <div className="uu-row">
        <button className="uu-btn-ghost" type="button" disabled={loading || Number(page || 1) <= 1} onClick={() => onGoPrev?.()}>
          {safeT(t, "postprod.audit.pagination.prev", "Page precedente")}
        </button>
        <span className="uu-muted" style={{ alignSelf: "center" }}>
          {safeT(t, "postprod.audit.pagination.page", "Page {value}", {
            value: Math.max(1, Math.trunc(Number(page) || 1)),
          })}
        </span>
        <button className="uu-btn-ghost" type="button" disabled={loading || hasMore !== true} onClick={() => onGoNext?.()}>
          {safeT(t, "postprod.audit.pagination.next", "Page suivante")}
        </button>
      </div>
    </div>
  );
}

export { AuditPaginationBar };
