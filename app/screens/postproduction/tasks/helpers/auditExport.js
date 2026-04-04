export const AUDIT_EXPORT_FORMAT_STORAGE_KEY = "uu_postprod_audit_export_format";
export const DEFAULT_AUDIT_EXPORT_FORMAT = "csv";

function escapeCsvCell(value) {
  const raw = String(value ?? "");
  if (!/[",\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

export function buildAuditCsv(entries = []) {
  const rows = Array.isArray(entries) ? entries : [];
  const header = [
    "id",
    "createdAt",
    "actorUserId",
    "actorUsername",
    "action",
    "scopeType",
    "scopeId",
    "fromStatus",
    "toStatus",
    "projectRefs",
    "comment",
    "payloadJson",
  ];
  const lines = rows.map((entry) => {
    const payload = entry?.payload && typeof entry.payload === "object" ? entry.payload : {};
    let payloadJson = "{}";
    try {
      payloadJson = JSON.stringify(payload);
    } catch {
      payloadJson = "{}";
    }
    const projectRefs = Array.isArray(entry?.projectRefs) ? entry.projectRefs.join("|") : "";
    return [
      Number(entry?.id || 0),
      String(entry?.createdAt || ""),
      Number(entry?.actorUserId || 0),
      String(entry?.actorUsername || ""),
      String(entry?.action || ""),
      String(entry?.scopeType || ""),
      String(entry?.scopeId || ""),
      String(entry?.fromStatus || ""),
      String(entry?.toStatus || ""),
      projectRefs,
      String(entry?.comment || ""),
      payloadJson,
    ]
      .map(escapeCsvCell)
      .join(",");
  });
  return [header.join(","), ...lines].join("\r\n");
}

export function ensureUtf8Bom(value) {
  const raw = String(value || "");
  return raw.startsWith("\uFEFF") ? raw : `\uFEFF${raw}`;
}

export function buildAuditJsonDocument(entries = [], filters = {}) {
  const list = Array.isArray(entries) ? entries : [];
  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    filters: filters && typeof filters === "object" ? filters : {},
    total: list.length,
    entries: list,
  };
}

export function buildAuditNdjson(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length <= 0) return "";
  return `${list.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
}

export function normalizeAuditExportFormat(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "json" || raw === "ndjson" || raw === "csv") return raw;
  return DEFAULT_AUDIT_EXPORT_FORMAT;
}

export function matchesAuditSearch(entry, searchValue = "") {
  const search = String(searchValue || "").trim().toLowerCase();
  if (!search) return true;

  const action = String(entry?.action || "").trim();
  const scopeType = String(entry?.scopeType || "").trim();
  const scopeId = String(entry?.scopeId || "").trim();
  const actorUsername = String(entry?.actorUsername || "").trim();
  const actorUserId = Number(entry?.actorUserId || 0);
  const fromStatus = String(entry?.fromStatus || "").trim();
  const toStatus = String(entry?.toStatus || "").trim();
  const comment = String(entry?.comment || "").trim();
  const refs = Array.isArray(entry?.projectRefs) ? entry.projectRefs.join(" ") : "";
  const payloadText = (() => {
    try {
      const payload = entry?.payload && typeof entry.payload === "object" ? entry.payload : {};
      return JSON.stringify(payload);
    } catch {
      return "";
    }
  })();

  const haystack = [
    action,
    scopeType,
    scopeId,
    actorUsername,
    actorUserId > 0 ? String(actorUserId) : "",
    fromStatus,
    toStatus,
    comment,
    refs,
    payloadText,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}
