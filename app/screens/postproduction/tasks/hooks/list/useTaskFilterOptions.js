import { useEffect, useMemo } from "react";
import {
  buildRenderFormLabelById,
  buildTaskFormFilterOptions,
  buildTaskRenderModeFilterOptions,
  buildTaskRenderWorkerFilterOptions,
  buildTaskRenderWorkerLabelByKey,
} from "./taskFilterOptionBuilders";

export function useTaskFilterOptions({
  orderedTasks = [],
  normalizedRenderWorkers = [],
  renderForms = [],
  normalizedProjectOptions = [],
  listRenderWorkerFilter = "all",
  setListRenderWorkerFilter = null,
  listProjectFilter = "all",
  setListProjectFilter = null,
  listFormFilter = "all",
  setListFormFilter = null,
  listRenderModeFilter = "all",
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
    const current = String(listProjectFilter || "").trim();
    if (current === "all") return;
    const exists = normalizedProjectOptions.some((entry) => String(entry?.ref || "").trim() === current);
    if (!exists) {
      setListProjectFilter?.("all");
    }
  }, [listProjectFilter, normalizedProjectOptions, setListProjectFilter]);

  useEffect(() => {
    const current = String(listRenderWorkerFilter || "").trim();
    if (!current || current === "all" || current === "__auto") return;
    const exists = taskRenderWorkerFilterOptions.some((entry) => String(entry?.key || "").trim() === current);
    if (!exists) {
      setListRenderWorkerFilter?.("all");
    }
  }, [listRenderWorkerFilter, taskRenderWorkerFilterOptions, setListRenderWorkerFilter]);

  useEffect(() => {
    const current = Number(listFormFilter || 0);
    if (!Number.isFinite(current) || current <= 0) return;
    const exists = taskFormFilterOptions.some((entry) => Number(entry?.id || 0) === Math.trunc(current));
    if (!exists) {
      setListFormFilter?.("all");
    }
  }, [listFormFilter, taskFormFilterOptions, setListFormFilter]);

  useEffect(() => {
    const current = String(listRenderModeFilter || "").trim();
    if (!current || current === "all") return;
    const exists = taskRenderModeFilterOptions.some((entry) => String(entry?.value || "").trim() === current);
    if (!exists) {
      setListRenderModeFilter?.("all");
    }
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
