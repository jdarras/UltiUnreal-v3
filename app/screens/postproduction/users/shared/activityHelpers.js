import { activityActionLabel, safeT } from "../../shared/helpers";

const ACTIVITY_TYPE_FILTERS = ["all", "project", "form", "render", "validation"];

const PROJECT_ACTIONS = new Set([
  "project_usage_mode_updated",
  "project_mode_updated",
  "project_status_updated",
  "project_updated",
]);

const FORM_ACTIONS = new Set([
  "render_form_created",
]);

const TASK_ACTIONS = new Set([
  "task_created",
]);

const RENDER_ACTIONS = new Set([
  "render_worker_complete",
]);

const VALIDATION_ACTIONS = new Set([
  "render_transition",
]);

const USER_ACTIONS = new Set([
  "user_created",
  "user_updated",
  "user_deleted",
  "users_sync_user_created_applied",
  "users_sync_user_updated_applied",
  "users_sync_user_deleted_applied",
]);

const PROFILE_ACTIONS = new Set([
  "role_created",
  "role_updated",
  "role_deleted",
  "users_sync_role_created_applied",
  "users_sync_role_updated_applied",
  "users_sync_role_deleted_applied",
]);

function activityLabelContainsModeRender(detail = "") {
  const normalized = String(detail || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.includes("mode rendu")
    || normalized.includes("mode d'usage")
    || normalized.includes("usage mode")
    || normalized.includes("rendu automatique");
}

function activityActionTypeLabel(t, type) {
  const key = String(type || "").trim().toLowerCase();
  if (!key || key === "all") {
    return safeT(t, "postprod.users.activity.filter.actionType.all", "Toutes");
  }
  if (key === "project") {
    return safeT(t, "postprod.users.activity.filter.actionType.project", "Projet");
  }
  if (key === "form") {
    return safeT(t, "postprod.users.activity.filter.actionType.form", "Formulaire");
  }
  if (key === "task") {
    return safeT(t, "postprod.users.activity.filter.actionType.task", "Tache");
  }
  if (key === "render") {
    return safeT(t, "postprod.users.activity.filter.actionType.render", "Rendu");
  }
  if (key === "validation") {
    return safeT(t, "postprod.users.activity.filter.actionType.validation", "Validation");
  }
  if (key === "user") {
    return safeT(t, "postprod.users.activity.filter.actionType.user", "Utilisateur");
  }
  if (key === "profile") {
    return safeT(t, "postprod.users.activity.filter.actionType.profile", "Profil");
  }
  return safeT(t, "postprod.users.activity.filter.actionType.other", "Autres");
}

function activityTypeChipLevel(type) {
  const key = String(type || "").trim().toLowerCase();
  if (key === "project") return "lvl-info";
  if (key === "form") return "lvl-success";
  if (key === "task") return "lvl-debug";
  if (key === "render") return "lvl-error";
  if (key === "validation") return "lvl-warn";
  if (key === "user") return "lvl-info";
  if (key === "profile") return "lvl-success";
  if (key === "other") return "lvl-error";
  return "lvl-info";
}

function normalizeActivityProjectRef(ref) {
  return String(ref || "").trim().toLowerCase();
}

function activityActionTypeFromAction(action, activity = null) {
  const normalized = String(action || "").trim().toLowerCase();
  if (!normalized) return "other";

  if (TASK_ACTIONS.has(normalized)) return "task";
  if (FORM_ACTIONS.has(normalized)) return "form";
  if (RENDER_ACTIONS.has(normalized)) return "render";
  if (VALIDATION_ACTIONS.has(normalized)) return "validation";
  if (USER_ACTIONS.has(normalized)) return "user";
  if (PROFILE_ACTIONS.has(normalized)) return "profile";

  if (PROJECT_ACTIONS.has(normalized)) return "project";

  if (
    normalized.startsWith("project_")
    && (
      normalized.includes("_mode")
      || normalized.includes("usage")
      || normalized.includes("status")
    )
  ) {
    return "project";
  }

  if (
    normalized.startsWith("project_")
    && activityLabelContainsModeRender(activity?.detail)
  ) {
    return "project";
  }

  if (
    normalized.startsWith("render_")
    && (
      String(activity?.fromStatus || "").trim()
      || String(activity?.toStatus || "").trim()
    )
  ) {
    return "validation";
  }

  if (normalized.startsWith("render_")) {
    return "render";
  }

  if (
    normalized.startsWith("render_form_")
    && normalized.includes("created")
  ) {
    return "form";
  }

  return "other";
}

function getActivityTypeSummary(summary, activities = []) {
  const result = { project: 0, form: 0, task: 0, render: 0, validation: 0, user: 0, profile: 0, other: 0 };

  const list = Array.isArray(activities) ? activities : [];
  for (const item of list) {
    const type = activityActionTypeFromAction(item?.action, item);
    if (Object.prototype.hasOwnProperty.call(result, type)) {
      result[type] += 1;
    } else {
      result.other += 1;
    }
  }
  return result;
}

function mapActivityActionTypeToApi(actionType) {
  const normalized = String(actionType || "").trim().toLowerCase();
  if (!normalized || normalized === "all") return "all";
  if (normalized === "task") return "task";
  if (normalized === "render") return "render";
  if (normalized === "validation") return "validation";
  return "all";
}

function activityMatchesSelectedType(activity, actionType = "all") {
  const normalized = String(actionType || "").trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return activityActionTypeFromAction(activity?.action, activity) !== "other";
  }
  return activityActionTypeFromAction(activity?.action, activity) === normalized;
}

function activityMatchesSearchQuery(activity, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const projectRefs = Array.isArray(activity?.projectRefs) ? activity.projectRefs.join(" ") : "";
  const haystack = [
    String(activity?.action || ""),
    activityActionLabel(activity),
    String(activity?.fromStatus || ""),
    String(activity?.toStatus || ""),
    String(activity?.comment || ""),
    String(activity?.detail || ""),
    projectRefs,
    String(activity?.createdAt || ""),
    String(activity?.taskId || ""),
    String(activity?.renderId || ""),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeLabel,
  activityTypeChipLevel,
  normalizeActivityProjectRef,
  activityActionTypeFromAction,
  mapActivityActionTypeToApi,
  activityMatchesSelectedType,
  getActivityTypeSummary,
  activityMatchesSearchQuery,
};

export default {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeLabel,
  activityTypeChipLevel,
  normalizeActivityProjectRef,
  activityActionTypeFromAction,
  mapActivityActionTypeToApi,
  activityMatchesSelectedType,
  getActivityTypeSummary,
  activityMatchesSearchQuery,
};
