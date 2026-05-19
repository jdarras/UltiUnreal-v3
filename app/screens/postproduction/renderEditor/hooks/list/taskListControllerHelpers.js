import { safeT } from "../../../shared/helpers";
import {
  buildTaskExpectedRenderNamesPreview,
  taskVisualStatusClass,
  taskVisualStatusLabel,
  taskStatusLabel,
} from "../../helpers";
import {
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

export function buildTaskVisualStatus(task, t, taskRenderStateByTaskId, resolveTaskVisualStatus) {
  const visualStatus = resolveTaskVisualStatus(task, taskRenderStateByTaskId);
  if (visualStatus) {
    return {
      label: taskVisualStatusLabel(t, visualStatus),
      className: `uu-chip chip-on ${taskVisualStatusClass(visualStatus)}`,
    };
  }
  return {
    label: taskStatusLabel(t, task?.status),
    className: "uu-chip chip-on status-planned",
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
