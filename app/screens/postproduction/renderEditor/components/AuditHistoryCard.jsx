import { useState, useMemo } from "react";
import { AuditEntriesList } from "./audit/AuditEntriesList";
import { safeT } from "../../shared/helpers";
import {
  activityActionTypeFromAction,
  activityTypeChipLevel,
} from "../../users/shared/activityHelpers";

const LEVELS = ["success", "info", "warn", "error", "debug"];
const ALL_LEVELS = new Set(LEVELS);

function entryLevel(entry) {
  const chipLevel = activityTypeChipLevel(activityActionTypeFromAction(entry?.action, entry));
  if (chipLevel === "lvl-success") return "success";
  if (chipLevel === "lvl-warn") return "warn";
  if (chipLevel === "lvl-error") return "error";
  if (chipLevel === "lvl-debug") return "debug";
  return "info";
}

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
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      if (!isAllActive && !activeLevels.has(entryLevel(entry))) return false;
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
  }, [entries, query, activeLevels]);

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
        <div className="uu-toolbar">
          <div className="uu-row gap-8" style={{ flexWrap: "wrap" }}>
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
            <input
              className="uu-input w-240"
              placeholder={safeT(t, "postprod.audit.toolbar.search", "Rechercher...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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

          <div className="uu-row uu-gap-6 uu-align-center" style={{ marginLeft: "auto" }}>
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
              style={{ width: "90px" }}
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
