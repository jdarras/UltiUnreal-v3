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
  projectLabelsByRef = new Map(),
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

  const taskProjectLabel = (task) => {
    const ref = String(
      task?.autoRenderConfig?.projectName
      || (Array.isArray(task?.projectRefs) ? task.projectRefs[0] : "")
      || ""
    ).trim();
    if (!ref) return "-";
    return String(projectLabelsByRef.get(ref) || projectLabelsByRef.get(ref.toLowerCase()) || ref).trim() || ref;
  };

  return {
    taskVisualStatus,
    taskRenderFormLabel,
    taskLaunchModeLabel,
    taskRenderWorkerLabel,
    taskExpectedRenderName,
    taskProjectLabel,
    taskRenderModeName,
    resolveTaskAutoRenderState,
  };
}

export {
  buildTaskListLabelResolvers,
};

export default buildTaskListLabelResolvers;
