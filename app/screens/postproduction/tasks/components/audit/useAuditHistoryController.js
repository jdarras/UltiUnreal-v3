import { useEffect, useMemo, useState } from "react";
import { toDateTimeLocalValue } from "../../../shared/helpers";
import { matchesAuditSearch } from "../../helpers/auditExport";
import {
  buildAuditEntriesListProps,
  buildAuditExportToolbarProps,
  buildAuditFiltersPanelProps,
  buildAuditHealthEventsCardProps,
  buildAuditPaginationBarProps,
  buildAuditRetentionCardProps,
} from "./buildAuditHistoryPanelProps";
import {
  clampPageSize,
  computeHasActiveAuditFilters,
  filterHealthEventsByKind,
  normalizeAuditRows,
  normalizeHealthEvents,
} from "./auditHistoryHelpers";
import { useAuditHistoryActions } from "./useAuditHistoryActions";
import { useAuditExportController } from "./useAuditExportController";

export function useAuditHistoryController({
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
} = {}) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState(String(filters?.action || ""));
  const [scopeFilter, setScopeFilter] = useState(String(filters?.scopeType || ""));
  const [fromAtLocal, setFromAtLocal] = useState(() => toDateTimeLocalValue(filters?.fromAt));
  const [toAtLocal, setToAtLocal] = useState(() => toDateTimeLocalValue(filters?.toAt));
  const [pageSizeDraft, setPageSizeDraft] = useState(() => clampPageSize(pageSize, 100));
  const [healthEventFilter, setHealthEventFilter] = useState("all");

  useEffect(() => {
    setActionFilter(String(filters?.action || ""));
    setScopeFilter(String(filters?.scopeType || ""));
    setFromAtLocal(toDateTimeLocalValue(filters?.fromAt));
    setToAtLocal(toDateTimeLocalValue(filters?.toAt));
  }, [filters?.action, filters?.scopeType, filters?.fromAt, filters?.toAt]);

  useEffect(() => {
    const n = Number(pageSize);
    if (!Number.isFinite(n) || n <= 0) return;
    setPageSizeDraft(clampPageSize(n, 100));
  }, [pageSize]);

  const rows = useMemo(() => normalizeAuditRows(entries), [entries]);

  const filteredRows = useMemo(() => {
    const search = String(query || "").trim().toLowerCase();
    return rows.filter((entry) => matchesAuditSearch(entry, search));
  }, [rows, query]);

  const hasActiveAuditFilters = useMemo(
    () => computeHasActiveAuditFilters({
      query,
      actionFilter,
      scopeFilter,
      fromAtLocal,
      toAtLocal,
      pageSizeDraft,
    }),
    [query, actionFilter, scopeFilter, fromAtLocal, toAtLocal, pageSizeDraft]
  );

  const normalizedHealthEvents = useMemo(
    () => normalizeHealthEvents(healthEvents),
    [healthEvents]
  );

  const filteredHealthEvents = useMemo(
    () => filterHealthEventsByKind(normalizedHealthEvents, healthEventFilter),
    [normalizedHealthEvents, healthEventFilter]
  );

  const normalizedRenderHealthMaintenance = useMemo(
    () => (renderHealthAuditMaintenance && typeof renderHealthAuditMaintenance === "object" ? renderHealthAuditMaintenance : null),
    [renderHealthAuditMaintenance]
  );

  const exportController = useAuditExportController({
    t,
    filters,
    actionFilter,
    scopeFilter,
    fromAtLocal,
    toAtLocal,
    query,
    filteredRows,
    onExportAuditAll,
    onExportAuditAllJson,
    onExportAuditAllNdjson,
  });

  const {
    refreshAudit,
    applyRangePresetHours,
    applyActionQuickFilter,
    triggerRenderHealthPurge,
    clearAllFilters,
  } = useAuditHistoryActions({
    pageSizeDraft,
    fromAtLocal,
    toAtLocal,
    actionFilter,
    scopeFilter,
    setQuery,
    setActionFilter,
    setScopeFilter,
    setFromAtLocal,
    setToAtLocal,
    setPageSizeDraft,
    onRefreshAudit,
    onRefreshRenderHealthAuditMaintenance,
    onPurgeRenderHealthAudit,
    setFullExportFormatDefault: exportController.setFullExportFormatDefault,
    clearFullExportErrors: exportController.clearFullExportErrors,
  });

  const exportToolbarProps = buildAuditExportToolbarProps({
    t,
    loading,
    filteredRows,
    exportController,
  });

  const filtersPanelProps = buildAuditFiltersPanelProps({
    t,
    loading,
    hasActiveAuditFilters,
    query,
    actionFilter,
    scopeFilter,
    fromAtLocal,
    toAtLocal,
    pageSizeDraft,
    setQuery,
    setActionFilter,
    setScopeFilter,
    setFromAtLocal,
    setToAtLocal,
    setPageSizeDraft,
    applyRangePresetHours,
    applyActionQuickFilter,
    refreshAudit,
    clearAllFilters,
    onRefreshAudit,
  });

  const retentionCardProps = buildAuditRetentionCardProps({
    t,
    normalizedRenderHealthMaintenance,
    renderHealthAuditMaintenanceLoading,
    renderHealthAuditMaintenanceError,
    renderHealthAuditPurgeBusy,
    renderHealthAuditPurgeError,
    renderHealthAuditLastPurge,
    triggerRenderHealthPurge,
  });

  const healthEventsCardProps = buildAuditHealthEventsCardProps({
    t,
    healthEventFilter,
    setHealthEventFilter,
    filteredHealthEvents,
  });

  const paginationBarProps = buildAuditPaginationBarProps({
    t,
    loading,
    filteredRows,
    total,
    rows,
    page,
    hasMore,
    refreshAudit,
  });

  const entriesListProps = buildAuditEntriesListProps({
    t,
    loading,
    error,
    filteredRows,
  });

  return {
    canManageRetention,
    exportToolbarProps,
    filtersPanelProps,
    retentionCardProps,
    healthEventsCardProps,
    paginationBarProps,
    entriesListProps,
    anyFullExportError: exportController.anyFullExportError,
  };
}

export default useAuditHistoryController;
