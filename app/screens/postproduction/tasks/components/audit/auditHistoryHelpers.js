export function clampPageSize(value, fallback = 100) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(500, Math.trunc(n)));
}

export function normalizeAuditRows(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .map((entry) => (entry && typeof entry === "object" ? entry : null))
    .filter(Boolean);
}

export function normalizeHealthEvents(healthEvents) {
  const list = Array.isArray(healthEvents) ? healthEvents : [];
  return list
    .map((entry, index) => ({
      id: String(entry?.id || "").trim() || `hub-event-${index}`,
      at: String(entry?.at || "").trim(),
      state: String(entry?.state || "").trim().toLowerCase(),
      kind: String(entry?.kind || entry?.alertKind || "").trim().toLowerCase(),
      label: String(entry?.label || "").trim(),
      detail: String(entry?.detail || "").trim(),
    }))
    .filter((entry) => entry.at || entry.label || entry.detail || entry.state || entry.kind)
    .slice(0, 30);
}

export function filterHealthEventsByKind(events, kind) {
  if (kind === "security") {
    return events.filter((entry) => entry.kind === "security" || entry.kind === "mixed");
  }
  if (kind === "worker") {
    return events.filter((entry) => entry.kind === "worker");
  }
  return events;
}

export function computeHasActiveAuditFilters({
  query = "",
  actionFilter = "",
  scopeFilter = "",
  fromAtLocal = "",
  toAtLocal = "",
  pageSizeDraft = 100,
} = {}) {
  return (
    String(query || "").trim().length > 0 ||
    String(actionFilter || "").trim().length > 0 ||
    String(scopeFilter || "").trim().length > 0 ||
    String(fromAtLocal || "").trim().length > 0 ||
    String(toAtLocal || "").trim().length > 0 ||
    Number(pageSizeDraft || 100) !== 100
  );
}

export default {
  clampPageSize,
  normalizeAuditRows,
  normalizeHealthEvents,
  filterHealthEventsByKind,
  computeHasActiveAuditFilters,
};
