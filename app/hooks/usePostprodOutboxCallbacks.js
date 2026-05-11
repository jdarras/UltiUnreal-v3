import { useCallback, useEffect, useRef } from "react";
import { postprodCreateRender, postprodGetRenderJob, postprodCompleteRenderWorkerJob } from "../utils/agent";
import {
  normalizePostprodOfflineOutbox,
  normalizePostprodWorkerCompletionOutbox,
  isPostprodRecoverableOfflineError,
} from "../utils/postprodOutboxHelpers";
import { canReplayWorkerCompletion, buildWorkerCompletionReplayPayload } from "../utils/renderProcessHelpers";
import { APP_MODE_POSTPROD } from "../utils/appConstants";

const POSTPROD_OFFLINE_REPLAY_MIN_INTERVAL_MS = 15000;
const POSTPROD_WORKER_COMPLETION_REPLAY_MIN_INTERVAL_MS = 5000;

function usePostprodOutboxCallbacks({
  postprodAuth, t, showNotice,
  appMode, postprodAuthenticated,
  renderWorkerKey, localPrimaryUnrealEditorPath,
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
    let stoppedOnRecoverableError = false;
    const nextOutbox = [...initialOutbox];
    try {
      for (const entry of initialOutbox) {
        if (entry?.kind !== 'create_render') continue;
        if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) {
          continue;
        }
        try {
          await postprodCreateRender(token, entry.payload || {});
          replayed += 1;
          const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry.id || ''));
          if (idx >= 0) nextOutbox.splice(idx, 1);
        } catch (err) {
          const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry.id || ''));
          if (isPostprodRecoverableOfflineError(err)) {
            stoppedOnRecoverableError = true;
            if (idx >= 0) {
              const attempts = Number(nextOutbox[idx]?.attempts || 0);
              nextOutbox[idx] = {
                ...nextOutbox[idx],
                attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
                lastAttemptAt: new Date().toISOString(),
                lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
              };
            }
            break;
          }
          dropped += 1;
          if (idx >= 0) nextOutbox.splice(idx, 1);
        }
      }
      updatePostprodOfflineOutbox(nextOutbox);
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders(),
          loadPostprodRenderHealth(),
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
    let stoppedOnRecoverableError = false;
    const nextOutbox = [...initialOutbox];
    try {
      for (const entry of scopedEntries) {
        const renderId = Number(entry?.renderId || 0);
        if (!Number.isFinite(renderId) || renderId <= 0) continue;
        const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry?.id || ''));
        if (idx < 0) continue;
        let completionPayload = entry?.payload && typeof entry.payload === 'object'
          ? entry.payload
          : {};
        try {
          const renderRes = await postprodGetRenderJob(token, renderId, 8000);
          const renderJob = renderRes?.render && typeof renderRes.render === 'object'
            ? renderRes.render
            : (renderRes?.renderJob && typeof renderRes.renderJob === 'object' ? renderRes.renderJob : null);
          if (!canReplayWorkerCompletion(renderJob, workerKey)) {
            dropped += 1;
            nextOutbox.splice(idx, 1);
            continue;
          }
          completionPayload = buildWorkerCompletionReplayPayload(completionPayload, renderJob, workerKey);
          await postprodCompleteRenderWorkerJob(token, renderId, completionPayload);
          replayed += 1;
          nextOutbox.splice(idx, 1);
        } catch (err) {
          if (isPostprodRecoverableOfflineError(err)) {
            stoppedOnRecoverableError = true;
            const attempts = Number(nextOutbox[idx]?.attempts || 0);
            nextOutbox[idx] = {
              ...nextOutbox[idx],
              payload: completionPayload,
              attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
              lastAttemptAt: new Date().toISOString(),
              lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
            };
            break;
          }
          dropped += 1;
          nextOutbox.splice(idx, 1);
        }
      }
      updatePostprodWorkerCompletionOutbox(nextOutbox);
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders(),
          loadPostprodRenderHealth(),
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
    localPrimaryUnrealEditorPath,
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