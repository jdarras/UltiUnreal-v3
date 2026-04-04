import { safeT } from "../../../shared/helpers";
import { HUB_HEALTH_AUDIT_ACTION } from "./auditUiHelpers";

function AuditFiltersPanel({
  t,
  loading = false,
  hasActiveAuditFilters = false,
  query = "",
  actionFilter = "",
  scopeFilter = "",
  fromAtLocal = "",
  toAtLocal = "",
  pageSizeDraft = 100,
  onSetQuery = null,
  onSetActionFilter = null,
  onSetScopeFilter = null,
  onSetFromAtLocal = null,
  onSetToAtLocal = null,
  onSetPageSizeDraft = null,
  onApplyRangePresetHours = null,
  onApplyActionQuickFilter = null,
  onApplyFilters = null,
  onResetFilters = null,
  onClearSearchAndFilters = null,
}) {
  return (
    <>
      <p className="uu-muted" style={{ marginTop: "8px", marginBottom: "12px" }}>
        {safeT(
          t,
          "postprod.audit.subtitle",
          "Trace des actions critiques post-production (auth, taches, rendus, donnees, sync)."
        )}
      </p>

      <div className="uu-grid-3 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.search", "Recherche")}</label>
          <div className="uu-row uu-gap-4 uu-align-center">
            <input
              className="uu-input"
              type="text"
              value={query}
              onChange={(e) => onSetQuery?.(e.target.value)}
              placeholder={safeT(t, "postprod.audit.filter.searchPlaceholder", "Acteur, action, scope, payload...")}
              style={{ flex: "1 1 auto" }}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              disabled={loading || !hasActiveAuditFilters}
              onClick={() => onClearSearchAndFilters?.()}
              title={safeT(t, "postprod.audit.search.clear", "Effacer filtres")}
              style={{
                width: "36px",
                minWidth: "36px",
                height: "36px",
                padding: "0 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.action", "Action")}</label>
          <input
            className="uu-input"
            value={actionFilter}
            onChange={(e) => onSetActionFilter?.(String(e.target.value || ""))}
            placeholder={safeT(t, "postprod.audit.filter.allActions", "Toutes")}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.scope", "Scope")}</label>
          <input
            className="uu-input"
            value={scopeFilter}
            onChange={(e) => onSetScopeFilter?.(String(e.target.value || ""))}
            placeholder={safeT(t, "postprod.audit.filter.allScopes", "Tous")}
          />
        </div>
      </div>

      <div className="uu-grid-3 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.fromAt", "Du")}</label>
          <input
            className="uu-input"
            type="datetime-local"
            value={fromAtLocal}
            onChange={(e) => onSetFromAtLocal?.(e.target.value)}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.toAt", "Au")}</label>
          <input
            className="uu-input"
            type="datetime-local"
            value={toAtLocal}
            onChange={(e) => onSetToAtLocal?.(e.target.value)}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.audit.filter.pageSize", "Lignes / page")}</label>
          <select
            className="uu-input"
            value={String(pageSizeDraft)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              onSetPageSizeDraft?.(Math.max(1, Math.min(500, Math.trunc(n))));
            }}
          >
            {[25, 50, 100, 200, 500].map((n) => (
              <option key={`audit-page-size-${n}`} value={String(n)}>
                {String(n)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="uu-muted mt-8">
        {safeT(t, "postprod.audit.filter.timezoneHint", "Heures locales converties automatiquement en UTC.")}
      </div>

      <div className="uu-row mt-8">
        <span className="uu-label">{safeT(t, "postprod.audit.presets.title", "Periode rapide")}</span>
        <button className="uu-btn-ghost" type="button" disabled={loading} onClick={() => onApplyRangePresetHours?.(24)}>
          {safeT(t, "postprod.audit.presets.last24h", "24h")}
        </button>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={loading}
          onClick={() => onApplyRangePresetHours?.(24 * 7)}
        >
          {safeT(t, "postprod.audit.presets.last7d", "7j")}
        </button>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={loading}
          onClick={() => onApplyRangePresetHours?.(24 * 30)}
        >
          {safeT(t, "postprod.audit.presets.last30d", "30j")}
        </button>
      </div>

      <div className="uu-row mt-8">
        <span className="uu-label">{safeT(t, "postprod.audit.quickFilters.title", "Filtres rapides")}</span>
        <button
          className={String(actionFilter || "").trim() ? "uu-btn-ghost" : "uu-btn"}
          type="button"
          disabled={loading}
          onClick={() => onApplyActionQuickFilter?.("")}
        >
          {safeT(t, "postprod.audit.quickFilters.all", "Tous")}
        </button>
        <button
          className={String(actionFilter || "").trim() === HUB_HEALTH_AUDIT_ACTION ? "uu-btn" : "uu-btn-ghost"}
          type="button"
          disabled={loading}
          onClick={() => onApplyActionQuickFilter?.(HUB_HEALTH_AUDIT_ACTION)}
        >
          {safeT(t, "postprod.audit.quickFilters.hubHealth", "Hub health")}
        </button>
      </div>

      <div className="uu-row mt-12">
        <button className="uu-btn-ghost" type="button" disabled={loading} onClick={() => onApplyFilters?.()}>
          {safeT(t, "postprod.audit.filter.apply", "Appliquer")}
        </button>
        <button className="uu-btn-ghost" type="button" disabled={loading} onClick={() => onResetFilters?.()}>
          {safeT(t, "postprod.audit.filter.reset", "Reinitialiser")}
        </button>
      </div>
    </>
  );
}

export { AuditFiltersPanel };
