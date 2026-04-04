const TAB_TO_NAV_KEY = {
  Dashboard: "users",
  Utilisateurs: "users",
  Projets: "projects",
  Ressources: "resources",
  Taches: "tasks",
  Rendus: "renders",
  Datas: "data",
  Validations: "validations",
  Historique: "history",
  Profils: "profiles",
};

const KNOWN_ROLE_TO_KEY = {
  Maintenance: "maintenance",
  "Responsable Fabrication": "responsableFabrication",
  Integrateur: "integrateur",
  Operateur: "operateur",
  Graphiste: "graphiste",
  Journaliste: "journaliste",
};

export function safeT(t, key, fallback, params) {
  if (typeof t !== "function") return fallback;
  const value = t(key, params);
  if (!value || value === key) return fallback;
  return value;
}

export function resolveTitle(tabKey, t) {
  const key = TAB_TO_NAV_KEY[tabKey] || "users";
  if (typeof t === "function") {
    const value = t(`nav.${key}`);
    if (value && value !== `nav.${key}`) return value;
  }
  return String(tabKey || "Utilisateurs");
}

function normalizeRoleKey(roleValue) {
  const roleRaw = String(roleValue || "").trim();
  if (!roleRaw) return "";
  const mapped = String(KNOWN_ROLE_TO_KEY[roleRaw] || roleRaw).trim();
  return mapped.toLowerCase().replace(/[_-]+/g, " ").trim();
}

export function canEditRenderReviewStatus(user) {
  const normalized = normalizeRoleKey(user?.role);
  if (!normalized) return false;
  return (
    normalized === "maintenance"
    || normalized === "journaliste"
    || normalized === "responsable fabrication"
    || normalized === "responsablefabrication"
  );
}

export function canManageRenderDispatchPolicy(user) {
  const normalized = normalizeRoleKey(user?.role);
  if (!normalized) return false;
  return (
    normalized === "maintenance"
    || normalized === "responsable fabrication"
    || normalized === "responsablefabrication"
    || normalized === "integrateur"
  );
}

export function clampInteger(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function normalizeDispatchProjectRuleMap(value) {
  const out = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [projectNameRaw, ruleValueRaw] of Object.entries(value)) {
      const projectName = String(projectNameRaw || "").trim();
      if (!projectName) continue;
      const ruleValue = Number(ruleValueRaw);
      if (!Number.isFinite(ruleValue)) continue;
      out[projectName] = Math.trunc(ruleValue);
    }
  }
  return out;
}

function stringifyDispatchProjectRuleMap(value) {
  const normalized = normalizeDispatchProjectRuleMap(value);
  return Object.entries(normalized)
    .sort((a, b) => String(a[0] || "").localeCompare(String(b[0] || ""), undefined, { sensitivity: "base" }))
    .map(([projectName, ruleValue]) => `${projectName}=${ruleValue}`)
    .join("\n");
}

export function parseDispatchProjectRulesText(rawText) {
  const map = {};
  const invalidLines = [];
  const lines = String(rawText || "").split(/\r?\n/g);
  for (const line of lines) {
    const trimmed = String(line || "").trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      invalidLines.push(trimmed);
      continue;
    }
    const projectName = String(trimmed.slice(0, separatorIndex) || "").trim();
    const rawValue = String(trimmed.slice(separatorIndex + 1) || "").trim();
    const value = Number(rawValue);
    if (!projectName || !Number.isFinite(value)) {
      invalidLines.push(trimmed);
      continue;
    }
    map[projectName] = Math.trunc(value);
  }
  return { map, invalidLines };
}

export function buildDispatchPolicyFormFromPayload(payload) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
  const projectPriorities = normalizeDispatchProjectRuleMap(source.projectPriorities);
  const projectQuotas = normalizeDispatchProjectRuleMap(source.projectQuotas);
  const maxJobs = clampInteger(source.maxJobs, 5, 1, 50);
  const defaultPriority = clampInteger(source.defaultPriority, 100, 1, 1000);
  const defaultQuotaRaw = source.defaultQuota;
  const defaultQuota = defaultQuotaRaw == null || String(defaultQuotaRaw).trim() === ""
    ? ""
    : String(clampInteger(defaultQuotaRaw, 0, 0, 500));

  return {
    maxJobs: String(maxJobs),
    defaultPriority: String(defaultPriority),
    defaultQuota,
    projectPrioritiesText: stringifyDispatchProjectRuleMap(projectPriorities),
    projectQuotasText: stringifyDispatchProjectRuleMap(projectQuotas),
  };
}

export function activityActionLabel(entry) {
  const raw = String(entry?.action || "").trim();
  if (!raw) return "-";
  const value = raw.replace(/_/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toDateTimeLocalValue(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDateTimeLocalToIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString();
}

export function formatDate(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

export function normalizeThumbCandidates(values = []) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    const src = String(value || "").trim();
    if (!src) continue;
    const key = src.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(src);
  }
  return out;
}

export function simplifyUnrealAssetDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const sanitized = raw.split("?")[0].split("#")[0];
  const tail = sanitized.split(/[\\/]/).filter(Boolean).pop() || sanitized;
  const dotParts = tail.split(".").filter(Boolean);
  if (dotParts.length >= 2) {
    const first = String(dotParts[0] || "").trim();
    const second = String(dotParts[1] || "").trim();
    if (first && second && first.toLowerCase() === second.toLowerCase()) {
      return first;
    }
  }
  return tail;
}

export function sortIndicator(sortKey, currentSortKey, currentSortDir, withLeadingSpace = false) {
  const key = String(sortKey || "").trim();
  const currentKey = String(currentSortKey || "").trim();
  if (!key || !currentKey || key !== currentKey) return "";
  const dir = String(currentSortDir || "").trim().toLowerCase() === "asc" ? "asc" : "desc";
  const arrow = dir === "asc" ? "▲" : "▼";
  return withLeadingSpace ? ` ${arrow}` : arrow;
}
