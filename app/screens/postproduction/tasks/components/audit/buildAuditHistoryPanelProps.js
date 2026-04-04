export function buildAuditExportToolbarProps({
  t,
  loading = false,
  filteredRows = [],
  exportController = {},
} = {}) {
  return {
    t,
    loading,
    filteredRows,
    fullExportFormat: exportController.fullExportFormat,
    anyFullExportBusy: exportController.anyFullExportBusy,
    onSetFullExportFormat: exportController.setFullExportFormat,
    onExportCurrentRowsCsv: exportController.exportCurrentRowsCsv,
    onExportAll: exportController.exportAllBySelectedFormat,
    exportLoadingLabel: typeof exportController.exportLoadingLabel === "function"
      ? exportController.exportLoadingLabel()
      : "",
  };
}

export function buildAuditFiltersPanelProps({
  t,
  loading = false,
  hasActiveAuditFilters = false,
  query = "",
  actionFilter = "",
  scopeFilter = "",
  fromAtLocal = "",
  toAtLocal = "",
  pageSizeDraft = 100,
  setQuery = null,
  setActionFilter = null,
  setScopeFilter = null,
  setFromAtLocal = null,
  setToAtLocal = null,
  setPageSizeDraft = null,
  applyRangePresetHours = null,
  applyActionQuickFilter = null,
  refreshAudit = null,
  clearAllFilters = null,
  onRefreshAudit = null,
} = {}) {
  return {
    t,
    loading,
    hasActiveAuditFilters,
    query,
    actionFilter,
    scopeFilter,
    fromAtLocal,
    toAtLocal,
    pageSizeDraft,
    onSetQuery: setQuery,
    onSetActionFilter: setActionFilter,
    onSetScopeFilter: setScopeFilter,
    onSetFromAtLocal: setFromAtLocal,
    onSetToAtLocal: setToAtLocal,
    onSetPageSizeDraft: setPageSizeDraft,
    onApplyRangePresetHours: applyRangePresetHours,
    onApplyActionQuickFilter: applyActionQuickFilter,
    onApplyFilters: () => refreshAudit?.(1),
    onResetFilters: () => {
      clearAllFilters?.();
      onRefreshAudit?.({
        page: 1,
        pageSize: 100,
        action: "",
        scopeType: "",
        fromAt: "",
        toAt: "",
      });
    },
    onClearSearchAndFilters: () => {
      clearAllFilters?.();
      refreshAudit?.(1, {
        action: "",
        scopeType: "",
        fromAtLocal: "",
        toAtLocal: "",
      });
    },
  };
}

export function buildAuditRetentionCardProps({
  t,
  normalizedRenderHealthMaintenance = null,
  renderHealthAuditMaintenanceLoading = false,
  renderHealthAuditMaintenanceError = "",
  renderHealthAuditPurgeBusy = false,
  renderHealthAuditPurgeError = "",
  renderHealthAuditLastPurge = null,
  triggerRenderHealthPurge = null,
} = {}) {
  return {
    t,
    normalizedRenderHealthMaintenance,
    renderHealthAuditMaintenanceLoading,
    renderHealthAuditMaintenanceError,
    renderHealthAuditPurgeBusy,
    renderHealthAuditPurgeError,
    renderHealthAuditLastPurge,
    onPurgeNow: triggerRenderHealthPurge,
  };
}

export function buildAuditHealthEventsCardProps({
  t,
  healthEventFilter = "all",
  setHealthEventFilter = null,
  filteredHealthEvents = [],
} = {}) {
  return {
    t,
    healthEventFilter,
    onSetHealthEventFilter: setHealthEventFilter,
    filteredHealthEvents,
  };
}

export function buildAuditPaginationBarProps({
  t,
  loading = false,
  filteredRows = [],
  total = 0,
  rows = [],
  page = 1,
  hasMore = false,
  refreshAudit = null,
} = {}) {
  return {
    t,
    loading,
    filteredRows,
    total,
    rows,
    page,
    hasMore,
    onGoPrev: () => refreshAudit?.(Math.max(1, Number(page || 1) - 1)),
    onGoNext: () => refreshAudit?.(Math.max(1, Number(page || 1) + 1)),
  };
}

export function buildAuditEntriesListProps({
  t,
  loading = false,
  error = "",
  filteredRows = [],
} = {}) {
  return {
    t,
    loading,
    error,
    filteredRows,
  };
}

export default {
  buildAuditExportToolbarProps,
  buildAuditFiltersPanelProps,
  buildAuditRetentionCardProps,
  buildAuditHealthEventsCardProps,
  buildAuditPaginationBarProps,
  buildAuditEntriesListProps,
};
