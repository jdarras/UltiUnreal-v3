import { useEffect, useRef } from "react";
import { postprodListTasks, postprodListRenders } from "../utils/agent";
import { isPostprodQueueRuntimeActive } from "../utils/postprodAuthHelpers";
import { APP_MODE_POSTPROD } from "../utils/appConstants";
import { buildTaskAutoRenderStateByTaskId } from "../screens/postproduction/renderEditor/helpers";
import { buildRenderQueueTasks } from "../screens/postproduction/renders/hooks/queue/buildRenderQueueTasks";
import { getQueueEntryLaunchMeta } from "../screens/postproduction/renders/hooks/queue/queueDerivedDataHelpers";
import { launchScheduledTaskRenderAction } from "../screens/postproduction/renders/hooks/queue/queueLaunchControllerHelpers";
import { startPostprodAsyncLoop } from "./postprodAsyncLoop";

function usePostprodQueueDispatch({
  appMode, postprodAuthenticated, postprodCanLaunchRenders, localRenderEnabled,
  current, postprodTasks, postprodRenders, postprodAuth,
  handlePostprodCreateRender, ensureLocalRenderWorkerOnline,
  handlePostprodDispatchRenders, handlePatchLocalWorkerAptitude,
}) {
  const postprodAutoDispatchLastKickRef = useRef(0);
  const postprodBackgroundQueueLaunchRef = useRef({ taskId: 0, kickAt: 0 });
  const postprodBackgroundQueueSnapshotRef = useRef({ at: 0, tasks: [], renders: [] });

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (!postprodCanLaunchRenders || !localRenderEnabled) return;

    const intervalMs = 5000;

    const stopLoop = startPostprodAsyncLoop({
      intervalMs,
      initialDelayMs: 2500,
      inFlightDelayMs: intervalMs,
      tick: async () => {
      const queueRuntimeActive = isPostprodQueueRuntimeActive();
      const token = String(postprodAuth.token || '').trim();
      const AUTO_DISPATCH_COOLDOWN_MS = 5_000;
      const autoDispatchAllowed = (Date.now() - postprodAutoDispatchLastKickRef.current) >= AUTO_DISPATCH_COOLDOWN_MS;
      if (!queueRuntimeActive || !token || !autoDispatchAllowed) {
        return;
      }

      let dueScheduledQueueEntry = null;
      if (current !== 'Rendus') {
        let taskItems = Array.isArray(postprodTasks?.items) ? postprodTasks.items : [];
        let renderItems = Array.isArray(postprodRenders?.items) ? postprodRenders.items : [];

        const SNAPSHOT_REFRESH_MS = 12_000;
        const snapshotNowMs = Date.now();
        const snapshot = (
          postprodBackgroundQueueSnapshotRef.current
          && typeof postprodBackgroundQueueSnapshotRef.current === 'object'
        )
          ? postprodBackgroundQueueSnapshotRef.current
          : { at: 0, tasks: [], renders: [] };
        const hasFreshSnapshot = (snapshotNowMs - Number(snapshot.at || 0)) < SNAPSHOT_REFRESH_MS;

        if (hasFreshSnapshot) {
          if (Array.isArray(snapshot.tasks)) taskItems = snapshot.tasks;
          if (Array.isArray(snapshot.renders)) renderItems = snapshot.renders;
        } else {
          try {
            const [tasksRes, rendersRes] = await Promise.all([
              postprodListTasks(token),
              postprodListRenders(token, 8000, { scan: false }),
            ]);
            const freshTasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
            const freshRenders = Array.isArray(rendersRes?.renders) ? rendersRes.renders : [];
            postprodBackgroundQueueSnapshotRef.current = {
              at: snapshotNowMs,
              tasks: freshTasks,
              renders: freshRenders,
            };
            taskItems = freshTasks;
            renderItems = freshRenders;
          } catch {
            if (Array.isArray(snapshot.tasks) && snapshot.tasks.length > 0) taskItems = snapshot.tasks;
            if (Array.isArray(snapshot.renders) && snapshot.renders.length > 0) renderItems = snapshot.renders;
          }
        }

        if (taskItems.length > 0) {
          const autoRenderStateByTaskId = buildTaskAutoRenderStateByTaskId(renderItems);
          const queueEntries = buildRenderQueueTasks({
            tasks: taskItems,
            autoRenderStateByTaskId,
          });
          for (const entry of queueEntries) {
            const launchMeta = getQueueEntryLaunchMeta(entry);
            if (launchMeta?.isWaitingLaunchable) {
              dueScheduledQueueEntry = entry;
              break;
            }
          }
        }
      }

      try {
        if (dueScheduledQueueEntry) {
          const nowMs = Date.now();
          const taskIdRaw = Number(dueScheduledQueueEntry?.task?.id || 0);
          const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
          const lastKick = postprodBackgroundQueueLaunchRef.current;
          const sameTaskCooldownActive = (
            taskId > 0
            && Number(lastKick?.taskId || 0) === taskId
            && (nowMs - Number(lastKick?.kickAt || 0)) < 30_000
          );
          if (!sameTaskCooldownActive) {
            postprodBackgroundQueueLaunchRef.current = { taskId, kickAt: nowMs };
            postprodAutoDispatchLastKickRef.current = nowMs;
            await Promise.resolve(handlePatchLocalWorkerAptitude(true)).catch(() => {});
            await launchScheduledTaskRenderAction({
              task: dueScheduledQueueEntry?.task || null,
              queueEntry: dueScheduledQueueEntry,
              onCreateRender: handlePostprodCreateRender,
              onDispatchRenders: handlePostprodDispatchRenders,
            });
          }
          return;
        }

        await ensureLocalRenderWorkerOnline();
        await Promise.resolve(handlePatchLocalWorkerAptitude(true)).catch(() => {});
        postprodAutoDispatchLastKickRef.current = Date.now();
        await Promise.resolve(handlePostprodDispatchRenders({ maxJobs: 1, silent: true })).catch(() => ({}));
      } catch {
      }
      },
    });

    return stopLoop;
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanLaunchRenders,
    localRenderEnabled,
    current,
    postprodTasks.items,
    postprodRenders.items,
    postprodAuth.token,
    handlePostprodCreateRender,
    ensureLocalRenderWorkerOnline,
    handlePostprodDispatchRenders,
    handlePatchLocalWorkerAptitude,
  ]);

  useEffect(() => {
    postprodBackgroundQueueSnapshotRef.current = { at: 0, tasks: [], renders: [] };
  }, [postprodAuth.token]);
}

export { usePostprodQueueDispatch };
