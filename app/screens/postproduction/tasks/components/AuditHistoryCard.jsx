import { AuditEntriesList } from "./audit/AuditEntriesList";
import { AuditExportToolbar } from "./audit/AuditExportToolbar";
import { AuditFiltersPanel } from "./audit/AuditFiltersPanel";
import { AuditHealthEventsCard } from "./audit/AuditHealthEventsCard";
import { AuditPaginationBar } from "./audit/AuditPaginationBar";
import { AuditRetentionCard } from "./audit/AuditRetentionCard";
import { useAuditHistoryController } from "./audit/useAuditHistoryController";

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
  healthEvents = [],
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
}) {
  const {
    exportToolbarProps,
    filtersPanelProps,
    retentionCardProps,
    healthEventsCardProps,
    paginationBarProps,
    entriesListProps,
    anyFullExportError,
  } = useAuditHistoryController({
    t,
    entries,
    loading,
    error,
    total,
    page,
    pageSize,
    hasMore,
    filters,
    healthEvents,
    renderHealthAuditMaintenance,
    renderHealthAuditMaintenanceLoading,
    renderHealthAuditMaintenanceError,
    renderHealthAuditPurgeBusy,
    renderHealthAuditPurgeError,
    renderHealthAuditLastPurge,
    canManageRetention,
    onRefreshAudit,
    onRefreshRenderHealthAuditMaintenance,
    onPurgeRenderHealthAudit,
    onExportAuditAll,
    onExportAuditAllJson,
    onExportAuditAllNdjson,
  });

  return (
    <section className="uu-section">
      <div className="uu-card">
        <AuditExportToolbar {...exportToolbarProps} />
        {anyFullExportError ? <div className="uu-msg error mt-8">{anyFullExportError}</div> : null}
        <AuditFiltersPanel {...filtersPanelProps} />
      </div>

      {canManageRetention ? <AuditRetentionCard {...retentionCardProps} /> : null}
      <AuditHealthEventsCard {...healthEventsCardProps} />
      <AuditPaginationBar {...paginationBarProps} />
      <AuditEntriesList {...entriesListProps} />
    </section>
  );
}

export { AuditHistoryCard };

