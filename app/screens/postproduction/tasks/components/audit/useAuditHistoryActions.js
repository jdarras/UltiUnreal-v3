import { useCallback } from "react";
import { fromDateTimeLocalToIso, toDateTimeLocalValue } from "../../../shared/helpers";
import { HUB_HEALTH_AUDIT_ACTION } from "./auditUiHelpers";
import { clampPageSize } from "./auditHistoryHelpers";

export function useAuditHistoryActions({
  pageSizeDraft = 100,
  fromAtLocal = "",
  toAtLocal = "",
  actionFilter = "",
  scopeFilter = "",
  setQuery = null,
  setActionFilter = null,
  setScopeFilter = null,
  setFromAtLocal = null,
  setToAtLocal = null,
  setPageSizeDraft = null,
  onRefreshAudit = null,
  onRefreshRenderHealthAuditMaintenance = null,
  onPurgeRenderHealthAudit = null,
  setFullExportFormatDefault = null,
  clearFullExportErrors = null,
} = {}) {
  const refreshAudit = useCallback((nextPage, overrides = {}) => {
    const targetPage = Math.max(1, Math.trunc(Number(nextPage) || 1));
    const size = clampPageSize(pageSizeDraft, 100);
    const fromValueLocal = String(overrides.fromAtLocal ?? fromAtLocal ?? "").trim();
    const toValueLocal = String(overrides.toAtLocal ?? toAtLocal ?? "").trim();
    onRefreshAudit?.({
      page: targetPage,
      pageSize: size,
      action: String(overrides.action ?? actionFilter ?? "").trim(),
      scopeType: String(overrides.scopeType ?? scopeFilter ?? "").trim(),
      fromAt: fromValueLocal ? fromDateTimeLocalToIso(fromValueLocal) : "",
      toAt: toValueLocal ? fromDateTimeLocalToIso(toValueLocal) : "",
    });
  }, [actionFilter, fromAtLocal, onRefreshAudit, pageSizeDraft, scopeFilter, toAtLocal]);

  const applyRangePresetHours = useCallback((hours) => {
    const now = new Date();
    const from = new Date(now.getTime() - Math.max(1, Number(hours) || 1) * 60 * 60 * 1000);
    const nextFromLocal = toDateTimeLocalValue(from.toISOString());
    const nextToLocal = toDateTimeLocalValue(now.toISOString());
    setFromAtLocal?.(nextFromLocal);
    setToAtLocal?.(nextToLocal);
    refreshAudit(1, {
      fromAtLocal: nextFromLocal,
      toAtLocal: nextToLocal,
    });
  }, [refreshAudit, setFromAtLocal, setToAtLocal]);

  const applyActionQuickFilter = useCallback((nextAction) => {
    const value = String(nextAction || "").trim();
    setActionFilter?.(value);
    refreshAudit(1, { action: value });
  }, [refreshAudit, setActionFilter]);

  const triggerRenderHealthPurge = useCallback(async () => {
    if (typeof onPurgeRenderHealthAudit !== "function") return;
    try {
      await onPurgeRenderHealthAudit();
      onRefreshRenderHealthAuditMaintenance?.();
      refreshAudit(1, { action: HUB_HEALTH_AUDIT_ACTION });
    } catch {
      // surfaced via renderHealthAuditPurgeError
    }
  }, [onPurgeRenderHealthAudit, onRefreshRenderHealthAuditMaintenance, refreshAudit]);

  const clearAllFilters = useCallback(() => {
    setQuery?.("");
    setActionFilter?.("");
    setScopeFilter?.("");
    setFromAtLocal?.("");
    setToAtLocal?.("");
    setPageSizeDraft?.(100);
    setFullExportFormatDefault?.();
    clearFullExportErrors?.();
  }, [
    clearFullExportErrors,
    setActionFilter,
    setFromAtLocal,
    setPageSizeDraft,
    setQuery,
    setScopeFilter,
    setToAtLocal,
    setFullExportFormatDefault,
  ]);

  return {
    refreshAudit,
    applyRangePresetHours,
    applyActionQuickFilter,
    triggerRenderHealthPurge,
    clearAllFilters,
  };
}

export default useAuditHistoryActions;
