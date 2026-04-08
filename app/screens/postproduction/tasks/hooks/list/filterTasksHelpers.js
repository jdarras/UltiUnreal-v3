import { resolveTaskAutoRenderState } from "../../helpers";
import { taskRenderFormId, taskRenderModeName, taskTargetRenderWorkerKey } from "./taskListUtils";

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
  listStatusFilter = "all",
  listRenderWorkerFilter = "all",
  listProjectFilter = "all",
  listFormFilter = "all",
  listRenderModeFilter = "all",
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

  const normalizedStatusFilter = String(listStatusFilter || "").trim();
  if (normalizedStatusFilter !== "all") {
    if (normalizedStatusFilter === "__render_waiting" || normalizedStatusFilter === "__render_running" || normalizedStatusFilter === "__render_error") {
      const targetState = normalizedStatusFilter.replace("__render_", "");
      list = list.filter((task) => resolveTaskAutoRenderState(task, taskRenderStateByTaskId) === targetState);
    } else {
      list = list.filter((task) => String(task?.status || "").trim() === normalizedStatusFilter);
    }
  }

  const normalizedWorkerFilter = String(listRenderWorkerFilter || "all").trim();
  if (normalizedWorkerFilter !== "all") {
    if (normalizedWorkerFilter === "__auto") {
      list = list.filter((task) => (
        String(task?.requestType || "").trim().toLowerCase() === "auto_render"
        && !taskTargetRenderWorkerKey(task)
      ));
    } else {
      list = list.filter((task) => (
        String(task?.requestType || "").trim().toLowerCase() === "auto_render"
        && taskTargetRenderWorkerKey(task) === normalizedWorkerFilter
      ));
    }
  }

  if (listProjectFilter !== "all") {
    list = list.filter((task) => {
      const refs = Array.isArray(task?.projectRefs) ? task.projectRefs : [];
      return refs.some((ref) => String(ref || "").trim() === listProjectFilter);
    });
  }

  const normalizedFormFilter = String(listFormFilter || "").trim();
  if (normalizedFormFilter && normalizedFormFilter !== "all") {
    const targetFormId = Number(normalizedFormFilter);
    if (Number.isFinite(targetFormId) && targetFormId > 0) {
      list = list.filter((task) => taskRenderFormId(task) === Math.trunc(targetFormId));
    }
  }

  const normalizedRenderModeFilter = String(listRenderModeFilter || "").trim();
  if (normalizedRenderModeFilter && normalizedRenderModeFilter !== "all") {
    list = list.filter((task) => taskRenderModeName(task) === normalizedRenderModeFilter);
  }

  return list;
}

function hasActiveTaskListFilters({
  searchQuery = "",
  favoriteOnly = false,
  listStatusFilter = "all",
  listRenderWorkerFilter = "all",
  listProjectFilter = "all",
  listFormFilter = "all",
  listRenderModeFilter = "all",
} = {}) {
  return (
    String(searchQuery || "").trim().length > 0
    || favoriteOnly
    || String(listStatusFilter || "all").trim() !== "all"
    || String(listRenderWorkerFilter || "all").trim() !== "all"
    || String(listProjectFilter || "all").trim() !== "all"
    || String(listFormFilter || "all").trim() !== "all"
    || String(listRenderModeFilter || "all").trim() !== "all"
  );
}

export {
  filterTasksList,
  hasActiveTaskListFilters,
  buildTaskSearchHaystack,
};

export default filterTasksList;
