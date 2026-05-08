const TAB_TO_NAV_KEY = {
  Dashboard: "users",
  Utilisateurs: "users",
  Projets: "projects",
  Ressources: "resources",
  RendusCreate: "renders",
  Rendus: "renders",
  Datas: "data",
  Validations: "validations",
  Historique: "history",
  Profils: "profiles",
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

export function canEditRenderReviewStatus(user) {
  if (!user) return false;
  return user?.permissions?.canValidate === true;
}

export function canManageRenderDispatchPolicy(user) {
  if (!user || typeof user !== "object") return false;
  return user?.permissions?.canManageProjectPermissions === true;
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

const ACTIVITY_ACTION_LABELS = {
  auth_login: "Connexion réussie",
  auth_logout: "Déconnexion",
  auth_login_failed: "Échec de connexion",
  auth_login_locked: "Compte verrouillé après échecs",
  user_created: "Utilisateur créé",
  user_updated: "Utilisateur modifié",
  user_deleted: "Utilisateur supprimé",
  role_created: "Profil créé",
  role_updated: "Profil modifié",
  role_deleted: "Profil supprimé",
  task_created: "Tâche créée",
  task_updated: "Tâche modifiée",
  task_deleted: "Tâche supprimée",
  task_transition: "Statut de tâche modifié",
  render_created: "Rendu créé",
  render_updated: "Rendu modifié",
  render_deleted: "Rendu supprimé",
  render_transition: "Statut de rendu modifié",
  render_worker_complete: "Rendu terminé",
  render_worker_aptitude_updated: "Disponibilité machine modifiée",
  render_dispatch_policy_updated: "Politique de dispatch des rendus modifiée",
  renders_dispatched: "Rendus dispatchés",
  project_updated: "Projet modifié",
  project_mode_updated: "Mode projet modifié",
  project_status_updated: "Statut projet modifié",
  project_usage_mode_updated: "Mode d'usage du projet modifié",
  resources_reindexed: "Ressources réindexées",
  render_form_created: "Formulaire de rendu créé",
  render_form_updated: "Formulaire de rendu modifié",
  render_form_deleted: "Formulaire de rendu supprimé",
  render_template_created: "Template de rendu créé",
  render_template_updated: "Template de rendu modifié",
  render_template_deleted: "Template de rendu supprimé",
  users_sync_user_created_applied: "Synchronisation: utilisateur créé",
  users_sync_user_updated_applied: "Synchronisation: utilisateur modifié",
  users_sync_user_deleted_applied: "Synchronisation: utilisateur supprimé",
  users_sync_role_created_applied: "Synchronisation: profil créé",
  users_sync_role_updated_applied: "Synchronisation: profil modifié",
  users_sync_role_deleted_applied: "Synchronisation: profil supprimé",
  audit_export_csv: "Export audit CSV",
  audit_export_json: "Export audit JSON",
  audit_export_ndjson: "Export audit NDJSON",
};

function sentenceCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function actionLabelFromPattern(action) {
  const normalized = String(action || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("users_sync_")) return "Synchronisation utilisateurs/profils";
  if (normalized.startsWith("auth_")) return "Action d'authentification";
  if (normalized.startsWith("user_")) return "Action utilisateur";
  if (normalized.startsWith("role_")) return "Action profil";
  if (normalized.startsWith("task_")) return "Action tâche";
  if (normalized.startsWith("render_") || normalized.startsWith("renders_")) return "Action rendu";
  if (normalized.startsWith("project_")) return "Action projet";
  return "";
}

export function activityActionLabel(entry) {
  const raw = String(entry?.action || "").trim();
  if (!raw) return "-";
  const normalized = raw.toLowerCase();
  const directLabel = ACTIVITY_ACTION_LABELS[normalized];
  if (directLabel) return directLabel;
  const patternLabel = actionLabelFromPattern(normalized);
  if (patternLabel) return patternLabel;
  const value = raw.replace(/_/g, " ");
  return sentenceCase(value);
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
