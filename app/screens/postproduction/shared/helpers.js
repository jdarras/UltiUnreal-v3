export { safeT } from "../../../utils/i18nSafe.js";

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
  render_detected_auto_scan_failed: "Problème scan rendus",
  render_detected_auto_scan_recovered: "Scan rendus rétabli",
  users_sync_loop_failed: "Problème synchronisation",
  users_sync_loop_recovered: "Synchronisation rétablie",
  render_health_event: "État machine de rendu",
  render_dispatch_policy_updated: "Règles d'assignation des rendus modifiées",
  renders_dispatched: "Rendus envoyés aux machines",
  renders_requeued_worker_offline: "Rendus remis en attente (machine hors ligne)",
  render_detected_imported: "Rendu(s) détecté(s) et importé(s)",
  render_export_destinations_updated: "Destinations d'export modifiées",
  render_form_fields_replaced: "Champs du formulaire remplacés",
  render_form_wrc_fields_removed: "Champs WRC retirés du formulaire",
  render_form_created: "Formulaire de rendu créé",
  render_form_updated: "Formulaire de rendu modifié",
  render_form_deleted: "Formulaire de rendu supprimé",
  render_template_created: "Modèle de rendu créé",
  render_template_updated: "Modèle de rendu modifié",
  render_template_deleted: "Modèle de rendu supprimé",
  project_updated: "Projet modifié",
  project_mode_updated: "Mode projet modifié",
  project_status_updated: "Statut projet modifié",
  project_usage_mode_updated: "Mode d'usage du projet modifié",
  project_sync: "Projet synchronisé",
  resources_reindexed: "Ressources réindexées",
  resources_reindexed_auto: "Ressources réindexées automatiquement",
  me_updated: "Mon profil modifié",
  user_project_permissions_updated: "Permissions projet modifiées",
  users_sync_user_created_applied: "Synchronisation : utilisateur créé",
  users_sync_user_updated_applied: "Synchronisation : utilisateur modifié",
  users_sync_user_deleted_applied: "Synchronisation : utilisateur supprimé",
  users_sync_role_created_applied: "Synchronisation : profil créé",
  users_sync_role_updated_applied: "Synchronisation : profil modifié",
  users_sync_role_deleted_applied: "Synchronisation : profil supprimé",
  data_table_created: "Table de données créée",
  data_table_updated: "Table de données modifiée",
  data_row_created: "Ligne de données ajoutée",
  data_row_updated: "Ligne de données modifiée",
  audit_export_csv: "Export historique CSV",
  audit_export_json: "Export historique JSON",
  audit_export_ndjson: "Export historique NDJSON",
  audit_purge_manual: "Historique purgé manuellement",
  render_health_audit_purge_manual: "Logs santé machines purgés",
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
