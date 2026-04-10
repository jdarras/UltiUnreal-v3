import { AuditEntriesList } from "./audit/AuditEntriesList";
import { safeT } from "../../shared/helpers";

function AuditHistoryCard({
  t,
  entries = [],
  loading = false,
  error = "",
  total = 0,
  page = 1,
  pageSize = 100,
  hasMore = false,
  filters = null,
  renderHealthAuditMaintenance = null,
  renderHealthAuditMaintenanceLoading = false,
  renderHealthAuditMaintenanceError = "",
  renderHealthAuditPurgeBusy = false,
  renderHealthAuditPurgeError = "",
  renderHealthAuditLastPurge = null,
  canManageRetention = false,
  onRefreshAudit = null,
  onRefreshRenderHealthAuditMaintenance = null,
  onPurgeRenderHealthAudit = null,
  onExportAuditAll = null,
  onExportAuditAllJson = null,
  onExportAuditAllNdjson = null,
  onOpenActivityTarget = null,
}) {
  return (
    <section className="uu-section">
      <div className="uu-card">
        <div className="uu-muted">
          {safeT(
            t,
            "postprod.audit.journal.subtitle",
            "Journal metier: projets (mode rendu), formulaires, taches et validations."
          )}
        </div>
        <AuditEntriesList
          t={t}
          loading={loading}
          error={error}
          entries={entries}
          onOpenActivityTarget={onOpenActivityTarget}
        />
      </div>
    </section>
  );
}

export { AuditHistoryCard };
