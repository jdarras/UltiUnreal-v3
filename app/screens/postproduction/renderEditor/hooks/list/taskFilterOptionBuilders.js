import { taskRenderFormId, taskRenderModeName, taskTargetRenderWorkerKey } from "./taskListUtils";

function isTaskAutoRender(task) {
  return String(task?.requestType || "").trim().toLowerCase() === "auto_render";
}

export function buildTaskRenderWorkerFilterOptions({
  orderedTasks = [],
  normalizedRenderWorkers = [],
} = {}) {
  const map = new Map();
  for (const worker of normalizedRenderWorkers) {
    const key = String(worker?.workerKey || "").trim();
    if (!key) continue;
    const label = String(worker?.displayName || key).trim() || key;
    if (!map.has(key)) map.set(key, label);
  }
  for (const task of orderedTasks) {
    if (!isTaskAutoRender(task)) continue;
    const key = taskTargetRenderWorkerKey(task);
    if (!key) continue;
    if (!map.has(key)) map.set(key, key);
  }
  return [...map.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
}

export function buildRenderFormLabelById(renderForms = []) {
  const map = new Map();
  const list = Array.isArray(renderForms) ? renderForms : [];
  for (const form of list) {
    const formId = Number(form?.id || 0);
    if (!Number.isFinite(formId) || formId <= 0) continue;
    const normalizedId = Math.trunc(formId);
    const label = String(form?.name || form?.displayName || "").trim() || `#${normalizedId}`;
    if (!map.has(normalizedId)) {
      map.set(normalizedId, label);
    }
  }
  return map;
}

export function buildTaskFormFilterOptions({
  orderedTasks = [],
  renderFormLabelById = new Map(),
} = {}) {
  const map = new Map();
  for (const task of orderedTasks) {
    if (!isTaskAutoRender(task)) continue;
    const formId = taskRenderFormId(task);
    if (formId <= 0) continue;
    const label = String(renderFormLabelById.get(formId) || `#${formId}`).trim() || `#${formId}`;
    if (!map.has(formId)) map.set(formId, label);
  }
  return [...map.entries()]
    .map(([id, label]) => ({ id: Number(id), label }))
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
}

export function buildTaskRenderModeFilterOptions(orderedTasks = []) {
  const map = new Map();
  for (const task of orderedTasks) {
    if (!isTaskAutoRender(task)) continue;
    const modeName = taskRenderModeName(task);
    if (!modeName) continue;
    if (!map.has(modeName)) map.set(modeName, modeName);
  }
  return [...map.entries()]
    .map(([value, label]) => ({ value: String(value || "").trim(), label: String(label || "").trim() }))
    .filter((entry) => entry.value)
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
}

export function buildTaskRenderWorkerLabelByKey(taskRenderWorkerFilterOptions = []) {
  const map = new Map();
  for (const entry of taskRenderWorkerFilterOptions) {
    const key = String(entry?.key || "").trim();
    if (!key) continue;
    const label = String(entry?.label || key).trim() || key;
    if (!map.has(key)) map.set(key, label);
  }
  return map;
}

