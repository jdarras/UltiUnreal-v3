import { useEffect, useMemo } from "react";
import {
  buildRenderFormLabelById,
  buildTaskFormFilterOptions,
  buildTaskRenderModeFilterOptions,
  buildTaskRenderWorkerFilterOptions,
  buildTaskRenderWorkerLabelByKey,
} from "./taskFilterOptionBuilders";

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

function hasSameValues(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function useTaskFilterOptions({
  orderedTasks = [],
  normalizedRenderWorkers = [],
  renderForms = [],
  normalizedProjectOptions = [],
  listRenderWorkerFilter = [],
  setListRenderWorkerFilter = null,
  listProjectFilter = [],
  setListProjectFilter = null,
  listFormFilter = [],
  setListFormFilter = null,
  listRenderModeFilter = [],
  setListRenderModeFilter = null,
} = {}) {
  const taskRenderWorkerFilterOptions = useMemo(() => {
    return buildTaskRenderWorkerFilterOptions({
      orderedTasks,
      normalizedRenderWorkers,
    });
  }, [normalizedRenderWorkers, orderedTasks]);

  const renderFormLabelById = useMemo(() => {
    return buildRenderFormLabelById(renderForms);
  }, [renderForms]);

  const taskFormFilterOptions = useMemo(() => {
    return buildTaskFormFilterOptions({
      orderedTasks,
      renderFormLabelById,
    });
  }, [orderedTasks, renderFormLabelById]);

  const taskRenderModeFilterOptions = useMemo(() => {
    return buildTaskRenderModeFilterOptions(orderedTasks);
  }, [orderedTasks]);

  useEffect(() => {
    const current = normalizeFilterValues(listProjectFilter);
    if (current.length <= 0) return;
    const allowed = new Set(
      (Array.isArray(normalizedProjectOptions) ? normalizedProjectOptions : [])
        .map((entry) => String(entry?.ref || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const sanitized = current.filter((entry) => allowed.has(entry));
    if (!hasSameValues(current, sanitized)) setListProjectFilter?.(sanitized);
  }, [listProjectFilter, normalizedProjectOptions, setListProjectFilter]);

  useEffect(() => {
    const current = normalizeFilterValues(listRenderWorkerFilter);
    if (current.length <= 0) return;
    const allowed = new Set(
      (Array.isArray(taskRenderWorkerFilterOptions) ? taskRenderWorkerFilterOptions : [])
        .map((entry) => String(entry?.key || "").trim().toLowerCase())
        .filter(Boolean)
    );
    allowed.add("__auto");
    const sanitized = current.filter((entry) => allowed.has(entry));
    if (!hasSameValues(current, sanitized)) setListRenderWorkerFilter?.(sanitized);
  }, [listRenderWorkerFilter, taskRenderWorkerFilterOptions, setListRenderWorkerFilter]);

  useEffect(() => {
    const current = normalizeFilterValues(listFormFilter);
    if (current.length <= 0) return;
    const allowed = new Set(
      (Array.isArray(taskFormFilterOptions) ? taskFormFilterOptions : [])
        .map((entry) => String(entry?.id || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const sanitized = current.filter((entry) => allowed.has(entry));
    if (!hasSameValues(current, sanitized)) setListFormFilter?.(sanitized);
  }, [listFormFilter, taskFormFilterOptions, setListFormFilter]);

  useEffect(() => {
    const current = normalizeFilterValues(listRenderModeFilter);
    if (current.length <= 0) return;
    const allowed = new Set(
      (Array.isArray(taskRenderModeFilterOptions) ? taskRenderModeFilterOptions : [])
        .map((entry) => String(entry?.value || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const sanitized = current.filter((entry) => allowed.has(entry));
    if (!hasSameValues(current, sanitized)) setListRenderModeFilter?.(sanitized);
  }, [listRenderModeFilter, taskRenderModeFilterOptions, setListRenderModeFilter]);

  const taskRenderWorkerLabelByKey = useMemo(() => {
    return buildTaskRenderWorkerLabelByKey(taskRenderWorkerFilterOptions);
  }, [taskRenderWorkerFilterOptions]);

  return {
    taskRenderWorkerFilterOptions,
    renderFormLabelById,
    taskFormFilterOptions,
    taskRenderModeFilterOptions,
    taskRenderWorkerLabelByKey,
  };
}

export default useTaskFilterOptions;
