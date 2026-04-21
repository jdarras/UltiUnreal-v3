import { resolveTaskVisualStatus } from "../../helpers";
import { taskRenderFormId, taskRenderModeName, taskTargetRenderWorkerKey } from "./taskListUtils";

function normalizeFilterValues(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const out = [];
  const seen = new Set();
  for (const value of source) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "all" || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function buildProjectSearchText(task = null, projectLabelsByRef = new Map()) {
  return (Array.isArray(task?.projectRefs) ? task.projectRefs : [])
    .map((ref) => {
      const normalizedRef = String(ref || "").trim();
      return projectLabelsByRef.get(normalizedRef) || normalizedRef;
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildResourceSearchText(task = null, resourceLabelsByRef = new Map()) {
  return (Array.isArray(task?.resourceRefs) ? task.resourceRefs : [])
    .map((ref) => {
      const normalizedRef = String(ref || "").trim();
      return resourceLabelsByRef.get(normalizedRef) || normalizedRef;
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildTaskSearchHaystack({
  task = null,
  projectLabelsByRef = new Map(),
  resourceLabelsByRef = new Map(),
  renderFormLabelById = new Map(),
} = {}) {
  const projectText = buildProjectSearchText(task, projectLabelsByRef);
  const resourceText = buildResourceSearchText(task, resourceLabelsByRef);
  const formId = taskRenderFormId(task);
  const formText = formId > 0
    ? String(renderFormLabelById.get(formId) || `#${formId}`).trim().toLowerCase()
    : "";
  const renderModeText = String(taskRenderModeName(task) || "").trim().toLowerCase();

  return [
    String(task?.title || ""),
    String(task?.description || ""),
    String(task?.status || ""),
    String(task?.requestType || ""),
    Array.isArray(task?.expectedRenderNames) ? task.expectedRenderNames.join(" ") : "",
    String(task?.assigneeDisplayName || task?.assigneeUsername || ""),
    String(task?.reporterDisplayName || task?.reporterUsername || ""),
    projectText,
    resourceText,
    formText,
    renderModeText,
  ]
    .join(" ")
    .toLowerCase();
}

function filterTasksList({
  orderedTasks = [],
  favoriteOnly = false,
  isTaskFavorite = () => false,
  searchQuery = "",
  listStatusFilter = [],
  listRenderWorkerFilter = [],
  listProjectFilter = [],
  listFormFilter = [],
  listRenderModeFilter = [],
  taskRenderStateByTaskId = new Map(),
  projectLabelsByRef = new Map(),
  resourceLabelsByRef = new Map(),
  renderFormLabelById = new Map(),
} = {}) {
  let list = orderedTasks;

  if (favoriteOnly) {
    list = list.filter((task) => isTaskFavorite(task));
  }

  const normalizedSearch = String(searchQuery || "").trim().toLowerCase();
  if (normalizedSearch) {
    list = list.filter((task) => {
      const haystack = buildTaskSearchHaystack({
        task,
        projectLabelsByRef,
        resourceLabelsByRef,
        renderFormLabelById,
      });
      return haystack.includes(normalizedSearch);
    });
  }

  const selectedStatus = new Set(normalizeFilterValues(listStatusFilter));
  if (selectedStatus.size > 0) {
    const legacyStatusMap = {
      __render_waiting: "waiting",
      __render_running: "running",
      __render_error: "error",
      planifiee: "planned",
      "planifiée": "planned",
      "a faire": "waiting",
      a_faire: "waiting",
      "en cours": "running",
      en_cours: "running",
      "a valider": "to_validate",
      a_valider: "to_validate",
      validee: "validated",
      "validée": "validated",
      rejetee: "rejected",
      "rejetée": "rejected",
    };
    const targetStatuses = new Set(
      [...selectedStatus].map((entry) => String(legacyStatusMap[entry] || entry).trim().toLowerCase())
    );
    list = list.filter((task) => targetStatuses.has(resolveTaskVisualStatus(task, taskRenderStateByTaskId)));
  }

  const selectedWorkers = new Set(normalizeFilterValues(listRenderWorkerFilter));
  if (selectedWorkers.size > 0) {
    list = list.filter((task) => {
      const isAutoTask = String(task?.requestType || "").trim().toLowerCase() === "auto_render";
      if (!isAutoTask) return false;
      const workerKey = String(taskTargetRenderWorkerKey(task) || "").trim().toLowerCase();
      if (!workerKey) return selectedWorkers.has("__auto");
      return selectedWorkers.has(workerKey);
    });
  }

  const selectedProjects = new Set(normalizeFilterValues(listProjectFilter));
  if (selectedProjects.size > 0) {
    list = list.filter((task) => {
      const refs = Array.isArray(task?.projectRefs) ? task.projectRefs : [];
      return refs.some((ref) => selectedProjects.has(String(ref || "").trim().toLowerCase()));
    });
  }

  const selectedForms = new Set(normalizeFilterValues(listFormFilter));
  if (selectedForms.size > 0) {
    list = list.filter((task) => selectedForms.has(String(taskRenderFormId(task)).toLowerCase()));
  }

  const selectedRenderModes = new Set(normalizeFilterValues(listRenderModeFilter));
  if (selectedRenderModes.size > 0) {
    list = list.filter((task) => selectedRenderModes.has(String(taskRenderModeName(task) || "").trim().toLowerCase()));
  }

  return list;
}

function hasActiveTaskListFilters({
  searchQuery = "",
  favoriteOnly = false,
  listStatusFilter = [],
  listRenderWorkerFilter = [],
  listProjectFilter = [],
  listFormFilter = [],
  listRenderModeFilter = [],
} = {}) {
  return (
    String(searchQuery || "").trim().length > 0
    || favoriteOnly
    || normalizeFilterValues(listStatusFilter).length > 0
    || normalizeFilterValues(listRenderWorkerFilter).length > 0
    || normalizeFilterValues(listProjectFilter).length > 0
    || normalizeFilterValues(listFormFilter).length > 0
    || normalizeFilterValues(listRenderModeFilter).length > 0
  );
}

export {
  filterTasksList,
  hasActiveTaskListFilters,
  buildTaskSearchHaystack,
};

export default filterTasksList;
