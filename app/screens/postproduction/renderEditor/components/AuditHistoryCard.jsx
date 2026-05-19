import { useState, useMemo } from "react";
import DateTimeConfirmPicker from "../../../../components/DateTimeConfirmPicker";
import { AuditEntriesList } from "./audit/AuditEntriesList";
import { safeT } from "../../shared/helpers";
import {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeFromAction,
  activityActionTypeLabel,
} from "../../users/shared/activityHelpers";
import { entryLevel } from "./audit/auditUiHelpers";

const LEVELS = ["success", "info", "warn", "error", "debug"];
const ALL_LEVELS = new Set(LEVELS);
const AUDIT_FILTERS_ROW_STYLE = { gap: "8px", flexWrap: "wrap" };
const AUDIT_FILTER_COL_200_STYLE = { minWidth: "200px" };
const AUDIT_FILTER_COL_180_STYLE = { minWidth: "180px" };
const AUDIT_FILTER_COL_QUERY_STYLE = { minWidth: "240px", flex: 1 };
const AUDIT_FILTER_COL_CLEAR_STYLE = { minWidth: "140px", marginLeft: "auto" };
const AUDIT_FILTER_CLEAR_LABEL_STYLE = { visibility: "hidden" };
const AUDIT_LEVELS_ROW_STYLE = { flexWrap: "wrap" };
const AUDIT_PAGINATION_RIGHT_STYLE = { marginLeft: "auto" };
const AUDIT_PAGINATION_SIZE_STYLE = { width: "90px" };

function AuditHistoryCard({
  t,
  entries = [],
  loading = false,
  error = "",
  total = 0,
  page = 1,
  pageSize = 100,
  hasMore = false,
  filters: _filters = null,
  renderHealthAuditMaintenance: _renderHealthAuditMaintenance = null,
  renderHealthAuditMaintenanceLoading: _renderHealthAuditMaintenanceLoading = false,
  renderHealthAuditMaintenanceError: _renderHealthAuditMaintenanceError = "",
  renderHealthAuditPurgeBusy: _renderHealthAuditPurgeBusy = false,
  renderHealthAuditPurgeError: _renderHealthAuditPurgeError = "",
  renderHealthAuditLastPurge: _renderHealthAuditLastPurge = null,
  auditLogStore = null,
  canManageRetention: _canManageRetention = false,
  onRefreshAudit = null,
  onPurgeAudit = null,
  onRefreshRenderHealthAuditMaintenance: _onRefreshRenderHealthAuditMaintenance = null,
  onPurgeRenderHealthAudit: _onPurgeRenderHealthAudit = null,
  onExportAuditAll = null,
  onExportAuditAllJson = null,
  onExportAuditAllNdjson: _onExportAuditAllNdjson = null,
  onOpenActivityTarget = null,
}) {
  const [query, setQuery] = useState("");
  const [activeLevels, setActiveLevels] = useState(ALL_LEVELS);
  const [fromAtLocal, setFromAtLocal] = useState("");
  const [toAtLocal, setToAtLocal] = useState("");
  const [actionType, setActionType] = useState("all");
  const [exportBusy, setExportBusy] = useState(false);
  const [purgeBusy, setPurgeBusy] = useState(false);

  function toggleLevel(level) {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
        if (next.size === 0) return prev;
      } else {
        next.add(level);
      }
      return next;
    });
  }

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isAllActive = activeLevels.size === ALL_LEVELS.size;
    const fromMs = fromAtLocal ? new Date(fromAtLocal).getTime() : null;
    const toMs   = toAtLocal   ? new Date(toAtLocal).getTime()   : null;
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      if (!isAllActive && !activeLevels.has(entryLevel(entry))) return false;
      if (actionType !== "all" && activityActionTypeFromAction(entry?.action, entry) !== actionType) return false;
      if (fromMs !== null || toMs !== null) {
        const entryMs = entry?.createdAt ? new Date(entry.createdAt).getTime() : 0;
        if (fromMs !== null && entryMs < fromMs) return false;
        if (toMs   !== null && entryMs > toMs)   return false;
      }
      if (!q) return true;
      const hay = [
        entry?.action,
        entry?.detail,
        entry?.createdAt,
        entry?.scopeId,
        String(entry?.taskId || ""),
        String(entry?.renderId || ""),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, activeLevels, fromAtLocal, toAtLocal, actionType]);

  const currentPage = Math.max(1, Math.trunc(Number(page || 1)));
  const totalCount = Math.max(0, Math.trunc(Number(total || 0)));
  const currentPageSize = Math.max(1, Math.trunc(Number(pageSize || 100)));
  const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));
  const canPrevPage = currentPage > 1;
  const canNextPage = hasMore === true;

  function handlePrevPage() {
    onRefreshAudit?.({ page: currentPage - 1, pageSize: currentPageSize });
  }

  function handleNextPage() {
    onRefreshAudit?.({ page: currentPage + 1, pageSize: currentPageSize });
  }

  function handlePageSizeChange(e) {
    const next = Math.max(10, Number(e.target.value) || 100);
    onRefreshAudit?.({ page: 1, pageSize: next });
  }

  async function handlePurge() {
    if (purgeBusy || typeof onPurgeAudit !== "function") return;
    setPurgeBusy(true);
    try {
      await onPurgeAudit();
    } finally {
      setPurgeBusy(false);
    }
  }

  async function handleExport(format) {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      if (format === "json") {
        await onExportAuditAllJson?.();
      } else {
        await onExportAuditAll?.();
      }
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <section className="uu-section">
      <div className="uu-card">
        <div className="uu-row mt-8" style={AUDIT_FILTERS_ROW_STYLE}>
          <div className="uu-col" style={AUDIT_FILTER_COL_200_STYLE}>
            <label className="uu-label">{safeT(t, "postprod.users.activity.filter.fromAt", "Du")}</label>
            <DateTimeConfirmPicker
              value={fromAtLocal}
              onChange={(v) => setFromAtLocal(v)}
              placeholder={safeT(t, "common.datePicker.placeholder", "jj/mm/aaaa hh:mm")}
              applyLabel={safeT(t, "common.datePicker.apply", "Valider")}
              cancelLabel={safeT(t, "common.datePicker.cancel", "Annuler")}
              clearLabel={safeT(t, "common.datePicker.clear", "Effacer")}
            />
          </div>
          <div className="uu-col" style={AUDIT_FILTER_COL_200_STYLE}>
            <label className="uu-label">{safeT(t, "postprod.users.activity.filter.toAt", "Au")}</label>
            <DateTimeConfirmPicker
              value={toAtLocal}
              onChange={(v) => setToAtLocal(v)}
              placeholder={safeT(t, "common.datePicker.placeholder", "jj/mm/aaaa hh:mm")}
              applyLabel={safeT(t, "common.datePicker.apply", "Valider")}
              cancelLabel={safeT(t, "common.datePicker.cancel", "Annuler")}
              clearLabel={safeT(t, "common.datePicker.clear", "Effacer")}
            />
          </div>
          <div className="uu-col" style={AUDIT_FILTER_COL_180_STYLE}>
            <label className="uu-label">{safeT(t, "postprod.users.activity.filter.actionType", "Type d'action")}</label>
            <select
              className="uu-input"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              {ACTIVITY_TYPE_FILTERS.map((type) => (
                <option key={type} value={type}>{activityActionTypeLabel(t, type)}</option>
              ))}
            </select>
          </div>
          <div className="uu-col" style={AUDIT_FILTER_COL_QUERY_STYLE}>
            <label className="uu-label">{safeT(t, "postprod.users.activity.filter.search", "Recherche locale")}</label>
            <input
              className="uu-input"
              type="text"
              placeholder={safeT(t, "postprod.audit.toolbar.search", "Rechercher...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="uu-col" style={AUDIT_FILTER_COL_CLEAR_STYLE}>
            <label className="uu-label" style={AUDIT_FILTER_CLEAR_LABEL_STYLE}>_</label>
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => { setFromAtLocal(""); setToAtLocal(""); setActionType("all"); setQuery(""); }}
            >
              {safeT(t, "postprod.users.activity.filter.clear", "Effacer filtres")}
            </button>
          </div>
        </div>

        <div className="uu-toolbar">
          <div className="uu-row gap-8" style={AUDIT_LEVELS_ROW_STYLE}>
            <div className="uu-chip-group">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`uu-chip ${activeLevels.has(level) ? "chip-on" : "chip-off"} lvl-${level}`}
                  onClick={() => toggleLevel(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="uu-toolbar-sub">
          <div className="uu-row uu-gap-8">
            {typeof onPurgeAudit === "function" ? (
              <button
                type="button"
                className="uu-btn danger"
                disabled={purgeBusy}
                onClick={() => void handlePurge()}
              >
                {purgeBusy ? "..." : safeT(t, "postprod.audit.toolbar.purge", "Purger les logs")}
              </button>
            ) : null}
            {typeof onExportAuditAllJson === "function" ? (
              <button
                type="button"
                className="uu-btn"
                disabled={exportBusy}
                onClick={() => void handleExport("json")}
              >
                {exportBusy ? "..." : safeT(t, "logs.toolbar.exportJson", "Export JSON")}
              </button>
            ) : null}
            {typeof onExportAuditAll === "function" ? (
              <button
                type="button"
                className="uu-btn"
                disabled={exportBusy}
                onClick={() => void handleExport("txt")}
              >
                {exportBusy ? "..." : safeT(t, "logs.toolbar.exportTxt", "Export TXT")}
              </button>
            ) : null}
          </div>

          <div className="uu-row uu-gap-6 uu-align-center" style={AUDIT_PAGINATION_RIGHT_STYLE}>
            {canPrevPage ? (
              <button type="button" className="uu-btn" onClick={handlePrevPage}>
                ‹
              </button>
            ) : null}
            <span className="uu-muted">{`Page ${currentPage}/${totalPages}`}</span>
            {canNextPage ? (
              <button type="button" className="uu-btn" onClick={handleNextPage}>
                ›
              </button>
            ) : null}
            <select
              className="uu-select"
              value={currentPageSize}
              onChange={handlePageSizeChange}
              style={AUDIT_PAGINATION_SIZE_STYLE}
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {totalCount > 0 ? (
              <span className="uu-muted">{`${totalCount} logs`}</span>
            ) : null}
          </div>
        </div>

        {auditLogStore?.saturated ? (
          <div className="uu-msg error mt-8">
            {safeT(t, "postprod.audit.store.saturated", "Cap de logs Rendu atteint — les nouveaux logs sont bloqués. Purgez les logs pour débloquer.")}
          </div>
        ) : auditLogStore?.warnReached ? (
          <div className="uu-msg warn mt-8">
            {safeT(t, "postprod.audit.store.warn", "Attention : seuil d'alerte logs Rendu atteint.")}
          </div>
        ) : null}

        <AuditEntriesList
          t={t}
          loading={loading}
          error={error}
          entries={filteredEntries}
          onOpenActivityTarget={onOpenActivityTarget}
        />
      </div>
    </section>
  );
}

export { AuditHistoryCard };
