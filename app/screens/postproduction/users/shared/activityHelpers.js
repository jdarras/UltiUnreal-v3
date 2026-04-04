import { activityActionLabel, safeT } from "../../shared/helpers";

const ACTIVITY_TYPE_FILTERS = ["all", "auth", "task", "render", "sync", "other"];

function activityActionTypeLabel(t, type) {
  const key = String(type || "").trim().toLowerCase();
  if (!key || key === "all") {
    return safeT(t, "postprod.users.activity.filter.actionType.all", "Toutes");
  }
  if (key === "auth") {
    return safeT(t, "postprod.users.activity.filter.actionType.auth", "Connexions");
  }
  if (key === "task") {
    return safeT(t, "postprod.users.activity.filter.actionType.task", "Taches");
  }
  if (key === "render") {
    return safeT(t, "postprod.users.activity.filter.actionType.render", "Rendus");
  }
  if (key === "sync") {
    return safeT(t, "postprod.users.activity.filter.actionType.sync", "Synchronisations");
  }
  return safeT(t, "postprod.users.activity.filter.actionType.other", "Autres");
}

function activityTypeChipLevel(type) {
  const key = String(type || "").trim().toLowerCase();
  if (key === "auth") return "lvl-info";
  if (key === "task") return "lvl-success";
  if (key === "render") return "lvl-warn";
  if (key === "sync") return "lvl-debug";
  if (key === "other") return "lvl-error";
  return "lvl-info";
}

function normalizeActivityProjectRef(ref) {
  return String(ref || "").trim().toLowerCase();
}

function activityActionTypeFromAction(action) {
  const normalized = String(action || "").trim().toLowerCase();
  if (!normalized) return "other";
  if (normalized.startsWith("auth_")) return "auth";
  if (normalized.startsWith("task_")) return "task";
  if (normalized.startsWith("render_") || normalized.startsWith("renders_")) return "render";
  if (
    normalized === "project_sync" ||
    normalized.startsWith("sync_") ||
    normalized.endsWith("_sync") ||
    normalized.includes("_sync_")
  ) {
    return "sync";
  }
  return "other";
}

function getActivityTypeSummary(summary, activities = []) {
  const result = { auth: 0, task: 0, render: 0, sync: 0, other: 0 };
  const byType = summary?.byType && typeof summary.byType === "object"
    ? summary.byType
    : null;
  if (byType) {
    result.auth = Number.isFinite(Number(byType.auth)) ? Number(byType.auth) : 0;
    result.task = Number.isFinite(Number(byType.task)) ? Number(byType.task) : 0;
    result.render = Number.isFinite(Number(byType.render)) ? Number(byType.render) : 0;
    result.sync = Number.isFinite(Number(byType.sync)) ? Number(byType.sync) : 0;
    result.other = Number.isFinite(Number(byType.other)) ? Number(byType.other) : 0;
    return result;
  }

  const actions = summary?.actions && typeof summary.actions === "object"
    ? summary.actions
    : null;
  if (actions) {
    for (const [action, countRaw] of Object.entries(actions)) {
      const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;
      if (count <= 0) continue;
      const type = activityActionTypeFromAction(action);
      if (Object.prototype.hasOwnProperty.call(result, type)) {
        result[type] += count;
      } else {
        result.other += count;
      }
    }
    return result;
  }

  const list = Array.isArray(activities) ? activities : [];
  for (const item of list) {
    const type = activityActionTypeFromAction(item?.action);
    if (Object.prototype.hasOwnProperty.call(result, type)) {
      result[type] += 1;
    } else {
      result.other += 1;
    }
  }
  return result;
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
  getActivityTypeSummary,
  activityMatchesSearchQuery,
};

export default {
  ACTIVITY_TYPE_FILTERS,
  activityActionTypeLabel,
  activityTypeChipLevel,
  normalizeActivityProjectRef,
  activityActionTypeFromAction,
  getActivityTypeSummary,
  activityMatchesSearchQuery,
};
