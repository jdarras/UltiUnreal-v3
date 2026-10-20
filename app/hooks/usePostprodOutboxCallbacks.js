import { useCallback, useEffect, useRef } from "react";
import { postprodCreateRender, postprodGetRenderJob, postprodCompleteRenderWorkerJob } from "../utils/agent";
import {
  normalizePostprodOfflineOutbox,
  normalizePostprodWorkerCompletionOutbox,
  isPostprodRecoverableOfflineError,
} from "../utils/postprodOutboxHelpers";
import { canReplayWorkerCompletion, buildWorkerCompletionReplayPayload } from "../utils/renderProcessHelpers";
import {
  applyOutboxReplayOutcome,
  runOfflineOutboxReplay,
  runWorkerCompletionOutboxReplay,
} from "../utils/postprodOutboxReplay";
import { APP_MODE_POSTPROD } from "../utils/appConstants";

const POSTPROD_OFFLINE_REPLAY_MIN_INTERVAL_MS = 15000;
const POSTPROD_WORKER_COMPLETION_REPLAY_MIN_INTERVAL_MS = 5000;

function usePostprodOutboxCallbacks({
  postprodAuth, t, showNotice,
  appMode, postprodAuthenticated,
  renderWorkerKey,
  postprodOfflineOutbox, postprodWorkerCompletionOutbox,
  postprodOfflineOutboxCount, postprodWorkerCompletionOutboxCount,
  updatePostprodOfflineOutbox, updatePostprodWorkerCompletionOutbox,
  loadPostprodRenders, loadPostprodRenderHealth,
  postprodRenderHealth,
}) {
  const postprodOfflineReplayInFlightRef = useRef(false);
  const postprodOfflineReplayLastKickRef = useRef(0);
  const postprodWorkerCompletionReplayInFlightRef = useRef(false);
  const postprodWorkerCompletionReplayLastKickRef = useRef(0);

  const resetOutboxState = useCallback(() => {
    postprodOfflineReplayInFlightRef.current = false;
    postprodOfflineReplayLastKickRef.current = 0;
    postprodWorkerCompletionReplayInFlightRef.current = false;
    postprodWorkerCompletionReplayLastKickRef.current = 0;
  }, []);
  const replayPostprodOfflineOutbox = useCallback(async ({ notifyIfNone = false } = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { replayed: 0, dropped: 0, pending: 0 };
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const initialOutbox = normalizePostprodOfflineOutbox(postprodOfflineOutbox);
    if (initialOutbox.length <= 0) {
      if (notifyIfNone) {
        showNotice(t('postprod.renders.msg.offlineReplayNone'), 'info');
      }
      return { replayed: 0, dropped: 0, pending: 0 };
    }
    if (postprodOfflineReplayInFlightRef.current) {
      return { replayed: 0, dropped: 0, pending: initialOutbox.length };
    }
    postprodOfflineReplayInFlightRef.current = true;
    let replayed = 0;
    let dropped = 0;
    let nextOutbox = initialOutbox;
    try {
      const outcome = await runOfflineOutboxReplay({
        token,
        currentUserId,
        outbox: initialOutbox,
        createRender: postprodCreateRender,
        isRecoverableError: isPostprodRecoverableOfflineError,
      });
      ({ replayed, dropped } = outcome);
      const { stoppedOnRecoverableError } = outcome;
      nextOutbox = applyOutboxReplayOutcome(initialOutbox, outcome);
      // Appliqué à l'état courant : les demandes ajoutées pendant le rejeu sont conservées.
      updatePostprodOfflineOutbox((current) => applyOutboxReplayOutcome(current, outcome));
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders({ silent: true }),
          loadPostprodRenderHealth({ silent: true }),
        ]);
        showNotice(t('postprod.renders.msg.offlineReplaySent', { count: replayed }), 'ok');
      } else if (notifyIfNone && dropped <= 0 && !stoppedOnRecoverableError) {
        showNotice(t('postprod.renders.msg.offlineReplayNone'), 'info');
      }
      if (dropped > 0) {
        showNotice(t('postprod.renders.msg.offlineReplayDropped', { count: dropped }), 'warn');
      }
    } finally {
      postprodOfflineReplayInFlightRef.current = false;
    }
    return {
      replayed,
      dropped,
      pending: Math.max(0, normalizePostprodOfflineOutbox(nextOutbox).length),
    };
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    postprodOfflineOutbox,
    updatePostprodOfflineOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);
  const replayPostprodWorkerCompletionOutbox = useCallback(async ({ notifyIfNone = false } = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return { replayed: 0, dropped: 0, pending: 0 };
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const initialOutbox = normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox);
    const scopedEntries = initialOutbox.filter((entry) => {
      if (String(entry?.workerKey || '').trim() !== workerKey) return false;
      if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
      return true;
    });
    if (scopedEntries.length <= 0) {
      if (notifyIfNone) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayNone'), 'info');
      }
      return { replayed: 0, dropped: 0, pending: 0 };
    }
    if (postprodWorkerCompletionReplayInFlightRef.current) {
      return { replayed: 0, dropped: 0, pending: scopedEntries.length };
    }
    postprodWorkerCompletionReplayInFlightRef.current = true;
    let replayed = 0;
    let dropped = 0;
    let nextOutbox = initialOutbox;
    try {
      const outcome = await runWorkerCompletionOutboxReplay({
        token,
        workerKey,
        entries: scopedEntries,
        getRenderJob: postprodGetRenderJob,
        completeRenderJob: postprodCompleteRenderWorkerJob,
        canReplay: canReplayWorkerCompletion,
        buildReplayPayload: buildWorkerCompletionReplayPayload,
        isRecoverableError: isPostprodRecoverableOfflineError,
      });
      ({ replayed, dropped } = outcome);
      const { stoppedOnRecoverableError } = outcome;
      nextOutbox = applyOutboxReplayOutcome(initialOutbox, outcome);
      // Appliqué à l'état courant : les complétions ajoutées pendant le rejeu sont conservées.
      updatePostprodWorkerCompletionOutbox((current) => applyOutboxReplayOutcome(current, outcome));
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders({ silent: true }),
          loadPostprodRenderHealth({ silent: true }),
        ]);
        showNotice(t('postprod.renders.msg.workerOfflineReplaySent', { count: replayed }), 'ok');
      } else if (notifyIfNone && dropped <= 0 && !stoppedOnRecoverableError) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayNone'), 'info');
      }
      if (dropped > 0) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayDropped', { count: dropped }), 'warn');
      }
    } finally {
      postprodWorkerCompletionReplayInFlightRef.current = false;
    }
    const pending = normalizePostprodWorkerCompletionOutbox(nextOutbox).filter((entry) => {
      if (String(entry?.workerKey || '').trim() !== workerKey) return false;
      if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
      return true;
    }).length;
    return { replayed, dropped, pending: Math.max(0, pending) };
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    renderWorkerKey,
    postprodWorkerCompletionOutbox,
    updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);
  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (postprodOfflineOutboxCount <= 0) return;
    if (postprodRenderHealth.loading) return;
    const hasError = String(postprodRenderHealth.error || '').trim().length > 0;
    if (hasError) return;
    const nowMs = Date.now();
    if ((nowMs - Number(postprodOfflineReplayLastKickRef.current || 0)) < POSTPROD_OFFLINE_REPLAY_MIN_INTERVAL_MS) {
      return;
    }
    postprodOfflineReplayLastKickRef.current = nowMs;
    replayPostprodOfflineOutbox().catch(() => {});
  }, [
    appMode,
    postprodAuthenticated,
    postprodOfflineOutboxCount,
    postprodRenderHealth.loading,
    postprodRenderHealth.error,
    postprodRenderHealth.data,
    replayPostprodOfflineOutbox,
  ]);
  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (postprodWorkerCompletionOutboxCount <= 0) return;
    if (postprodRenderHealth.loading) return;
    const hasError = String(postprodRenderHealth.error || '').trim().length > 0;
    if (hasError) return;
    const nowMs = Date.now();
    if ((nowMs - Number(postprodWorkerCompletionReplayLastKickRef.current || 0)) < POSTPROD_WORKER_COMPLETION_REPLAY_MIN_INTERVAL_MS) {
      return;
    }
    postprodWorkerCompletionReplayLastKickRef.current = nowMs;
    replayPostprodWorkerCompletionOutbox().catch(() => {});
  }, [
    appMode,
    postprodAuthenticated,
    postprodWorkerCompletionOutboxCount,
    postprodRenderHealth.loading,
    postprodRenderHealth.error,
    postprodRenderHealth.data,
    replayPostprodWorkerCompletionOutbox,
  ]);
  return { replayPostprodOfflineOutbox, replayPostprodWorkerCompletionOutbox, resetOutboxState };
}

export { usePostprodOutboxCallbacks };