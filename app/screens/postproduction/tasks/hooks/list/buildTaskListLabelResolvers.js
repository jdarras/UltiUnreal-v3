import { resolveTaskAutoRenderState } from "../../helpers";
import {
  buildTaskExpectedRenderName,
  buildTaskLaunchModeLabel,
  buildTaskRenderFormLabel,
  buildTaskRenderWorkerLabel,
  buildTaskVisualStatus,
} from "./taskListControllerHelpers";
import {
  taskRenderModeName,
} from "./taskListUtils";

function buildTaskListLabelResolvers({
  t,
  taskRenderStateByTaskId = new Map(),
  taskRenderWorkerLabelByKey = new Map(),
  renderFormLabelById = new Map(),
} = {}) {
  const taskVisualStatus = (task) => (
    buildTaskVisualStatus(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState)
  );

  const taskRenderFormLabel = (task) => (
    buildTaskRenderFormLabel(task, renderFormLabelById)
  );

  const taskLaunchModeLabel = (task) => (
    buildTaskLaunchModeLabel(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState)
  );

  const taskRenderWorkerLabel = (task) => (
    buildTaskRenderWorkerLabel(task, t, taskRenderWorkerLabelByKey)
  );

  const taskExpectedRenderName = (task) => buildTaskExpectedRenderName(task);

  return {
    taskVisualStatus,
    taskRenderFormLabel,
    taskLaunchModeLabel,
    taskRenderWorkerLabel,
    taskExpectedRenderName,
    taskRenderModeName,
    resolveTaskAutoRenderState,
  };
}

export {
  buildTaskListLabelResolvers,
};

export default buildTaskListLabelResolvers;
