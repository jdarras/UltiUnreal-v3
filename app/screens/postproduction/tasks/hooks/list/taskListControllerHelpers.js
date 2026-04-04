import { safeT } from "../../../shared/helpers";
import {
  buildTaskExpectedRenderNamesPreview,
  taskAutoRenderStateLabel,
  taskAutoRenderStateLevel,
  taskStatusLabel,
} from "../../helpers";
import {
  taskFavoriteKey,
  taskLaunchModeValue,
  taskRenderFormId,
  taskTargetRenderWorkerKey,
} from "./taskListUtils";

export function buildOptionLabelMap(options = []) {
  const map = new Map();
  for (const option of options) {
    map.set(option.ref, option.label || option.ref);
  }
  return map;
}

export function isTaskFavoriteByState(task, taskFavorites) {
  const key = taskFavoriteKey(task);
  return !!taskFavorites?.[key];
}

export function buildTaskVisualStatus(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState) {
  const autoState = resolveTaskAutoRenderState(task, taskRenderStateByTaskId);
  if (autoState) {
    return {
      label: taskAutoRenderStateLabel(t, autoState),
      className: `uu-msg ${taskAutoRenderStateLevel(autoState)}`,
    };
  }
  return {
    label: taskStatusLabel(t, task?.status),
    className: "uu-msg info",
  };
}

export function buildTaskRenderFormLabel(task, renderFormLabelById) {
  const formId = taskRenderFormId(task);
  if (formId <= 0) return "-";
  const label = String(renderFormLabelById.get(formId) || "").trim();
  if (!label) return `#${formId}`;
  if (/^\s*#\d+\s*$/.test(label) || /#\s*\d+/.test(label)) return label;
  return `${label} (#${formId})`;
}

export function buildTaskLaunchModeLabel(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState) {
  const mode = taskLaunchModeValue(task, taskRenderStateByTaskId, resolveTaskAutoRenderState);
  if (mode === "now") return safeT(t, "postprod.tasks.form.autoRenderLaunchMode.now.short", "Immediat");
  return safeT(t, "postprod.tasks.form.autoRenderLaunchMode.scheduled.short", "Programme");
}

export function buildTaskRenderWorkerLabel(task, t, taskRenderWorkerLabelByKey) {
  const requestType = String(task?.requestType || "").trim().toLowerCase();
  if (requestType !== "auto_render") return "-";
  const workerKey = taskTargetRenderWorkerKey(task);
  if (!workerKey) return safeT(t, "postprod.tasks.form.autoRenderWorker.auto", "Auto (dispatcher)");
  return taskRenderWorkerLabelByKey.get(workerKey) || workerKey;
}

export function buildTaskExpectedRenderName(task) {
  const names = Array.isArray(task?.expectedRenderNames) ? task.expectedRenderNames : [];
  const firstName = String(names[0] || "").trim();
  if (firstName) return firstName;
  const directName = String(task?.expectedRenderName || task?.matchedExpectedRenderName || "").trim();
  if (directName) return directName;
  const fallbackTitle = String(task?.title || "").trim();
  if (!fallbackTitle) return "-";
  return String(buildTaskExpectedRenderNamesPreview(fallbackTitle, 1)[0] || "-").trim() || "-";
}
