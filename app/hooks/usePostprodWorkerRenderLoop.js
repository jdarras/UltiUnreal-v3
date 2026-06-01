import { useEffect, useRef } from "react";
import {
  postprodUpsertRenderWorker,
  postprodListRenders,
  postprodCompleteRenderWorkerJob,
  spawnDetachedRender,
  checkPidAlive,
  checkFileExists,
  findRenderOutputs,
  readRenderPid,
  deleteRenderPid,
  getOnlineMap,
} from "../utils/agent";
import {
  normalizePostprodWorkerCompletionOutbox,
  isPostprodRecoverableOfflineError,
} from "../utils/postprodOutboxHelpers";
import {
  waitMs,
  buildRenderProcessTemplateContext,
  replaceProcessTemplateVars,
  hasProcessTemplateToken,
  normalizeBooleanFlag,
  isLikelyRenderOutputMedia,
  buildRenderOutputPathCandidates,
  buildWorkerProcessEventComment,
  summarizeProcessFailure,
} from "../utils/renderProcessHelpers";
import { isPostprodQueueRuntimeActive } from "../utils/postprodAuthHelpers";
import { startPostprodAsyncLoop } from "./postprodAsyncLoop";

function usePostprodWorkerRenderLoop({
  postprodAuth, t, showNotice,
  postprodAuthenticated, postprodCanLaunchRenders,
  hasLocalUnrealCapability, localRenderEnabled, localRenderAvailability,
  renderWorkerKey, renderWorkerDisplayName, renderWorkerCapabilities, localPrimaryUnrealEditorPath,
  postprodWorkerCompletionOutbox,
  replayPostprodWorkerCompletionOutbox, updatePostprodWorkerCompletionOutbox,
  loadPostprodRenders, loadPostprodRenderWorkers, loadPostprodRenderHealth,
  handlePostprodDispatchRenders,
}) {
  useEffect(() => {
    if (!postprodAuthenticated) return;
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;

    const payloadBase = {
      workerKey,
      displayName: renderWorkerDisplayName,
      capabilities: renderWorkerCapabilities,
      canRender: localRenderEnabled,
      renderAvailability: localRenderAvailability,
      isActive: true,
    };

    const stopLoop = startPostprodAsyncLoop({
      intervalMs: 30000,
      tick: async () => {
        try {
          await postprodUpsertRenderWorker(token, { ...payloadBase, isOnline: true });
        } catch {}
      },
    });

    return () => {
      stopLoop();
      // Ne pas forcer offline sur chaque rerender/transition UI.
      // Le sweep backend marque offline automatiquement si heartbeat stale.
    };
  }, [
    postprodAuthenticated,
    postprodAuth.token,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (!postprodCanLaunchRenders || !localRenderEnabled) return;
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    let stopped = false;

    const stopLoop = startPostprodAsyncLoop({
      intervalMs: 5000,
      initialDelayMs: 2500,
      inFlightDelayMs: 5000,
      tick: async () => {
      try {
        await replayPostprodWorkerCompletionOutbox();
        const pendingCompletionRenderIds = new Set(
          normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox)
            .filter((entry) => {
              if (String(entry?.workerKey || '').trim() !== workerKey) return false;
              if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
              return true;
            })
            .map((entry) => Number(entry?.renderId || 0))
            .filter((renderId) => Number.isFinite(renderId) && renderId > 0)
        );
        const res = await postprodListRenders(token, 8000);
        const renders = Array.isArray(res?.renders) ? res.renders : [];
        const assignedRunning = renders.find((render) => {
          const status = String(render?.status || '').trim();
          const assignedKey = String(render?.assignedWorkerKey || '').trim();
          const renderId = Number(render?.id || 0);
          return (
            status === 'Running'
            && assignedKey === workerKey
            && !pendingCompletionRenderIds.has(renderId)
          );
        });
        const renderId = Number(assignedRunning?.id || 0);
        if (renderId > 0) {
          const payload = assignedRunning?.payload && typeof assignedRunning.payload === 'object' && !Array.isArray(assignedRunning.payload)
            ? assignedRunning.payload
            : {};
          const execution = payload?.execution && typeof payload.execution === 'object' && !Array.isArray(payload.execution)
            ? payload.execution
            : {};
          const executionModeRaw = String(
            execution?.mode ?? payload?.workerExecutionMode ?? payload?.workerMode ?? 'simulate'
          ).trim().toLowerCase();

          let completionPayload = null;
          if (executionModeRaw === 'process') {
            const templateContext = buildRenderProcessTemplateContext({
              render: assignedRunning,
              payload,
              execution,
              workerKey,
              defaultUnrealEditorPath: localPrimaryUnrealEditorPath,
            });
            const primaryCommand = replaceProcessTemplateVars(
              execution?.command ?? payload?.command ?? '',
              templateContext
            ).trim();
            const fallbackCommand = replaceProcessTemplateVars(
              execution?.commandFallback ?? payload?.commandFallback ?? '',
              templateContext
            ).trim();
            const command = primaryCommand || fallbackCommand;
            const args = (
              Array.isArray(execution?.args)
              ? execution.args
                : (Array.isArray(payload?.args) ? payload.args : [])
            ).map((arg) => replaceProcessTemplateVars(arg, templateContext).trim()).filter(Boolean);
            const normalizedArgs = [];
            for (let i = 0; i < args.length; i += 1) {
              const currentArg = String(args[i] || '').trim();
              if (!currentArg) continue;
              if (
                currentArg.toLowerCase() === '-moviepipelineconfig'
                && i + 1 < args.length
              ) {
                const nextArg = String(args[i + 1] || '').trim();
                if (nextArg && !nextArg.startsWith('-')) {
                  normalizedArgs.push(`-MoviePipelineConfig=${nextArg}`);
                  i += 1;
                  continue;
                }
              }
              normalizedArgs.push(currentArg);
            }
            const outputDirForArgs = String(templateContext.outputdir || payload?.outputDir || '').trim();
            const expectedNameForArgs = String(templateContext.expectedrendername || '').trim();
            const hasMovieFolderArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('moviefolder'));
            const hasMovieNameArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('moviename'));
            const hasOutputDirArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('uurenderoutputdir'));
            if (outputDirForArgs && !hasMovieFolderArg) {
              normalizedArgs.push(`-MovieFolder=${outputDirForArgs}`);
            }
            if (expectedNameForArgs && !hasMovieNameArg) {
              normalizedArgs.push(`-MovieName=${expectedNameForArgs}`);
            }
            if (outputDirForArgs && !hasOutputDirArg) {
              normalizedArgs.push(`-UURenderOutputDir=${outputDirForArgs}`);
            }
            const timeoutMsRaw = Number(execution?.timeoutMs ?? payload?.timeoutMs ?? 30 * 60 * 1000);
            const timeoutMs = Number.isFinite(timeoutMsRaw)
              ? Math.max(1000, Math.min(4 * 60 * 60 * 1000, Math.trunc(timeoutMsRaw)))
              : (30 * 60 * 1000);
            const cwd = replaceProcessTemplateVars(
              execution?.cwd ?? payload?.cwd ?? '',
              templateContext
            ).trim();
            const configuredOutputPathTemplate = String(
              execution?.outputPath ?? payload?.outputPath ?? ''
            ).trim();
            const configuredOutputPath = replaceProcessTemplateVars(
              configuredOutputPathTemplate,
              templateContext
            ).trim();
            const fallbackOutputPath = String(templateContext.outputpath || '').trim();
            const completionOutputPathRaw = configuredOutputPath || fallbackOutputPath;
            const completionOutputPath = hasProcessTemplateToken(completionOutputPathRaw)
              ? ''
              : completionOutputPathRaw;
            const outputDirForSearch = String(
              templateContext.outputdir || payload?.outputDir || ''
            ).trim();
            const allowMissingOutputArtifact = normalizeBooleanFlag(
              execution?.allowMissingOutputArtifact
                ?? payload?.allowMissingOutputArtifact
                ?? false,
              false
            );
            const processStartMs = Date.now();
            let detectedOutputPath = '';

            if (!command) {
              completionPayload = {
                workerKey,
                success: false,
                errorMessage: 'missing_worker_command',
                comment: 'worker_process_fail',
              };
            } else {
              const pidTag = `r${renderId}`;
              let _procOk = null;
              let _procError = '';

              const existingPidRes = await readRenderPid(pidTag);
              if (stopped) return;
              const existingPid = Number(existingPidRes?.pid || 0);

              const pollUntilDead = async (pid, deadlineMs) => {
                while (true) {
                  if (stopped) return 'stopped';
                  if (Date.now() > deadlineMs) return 'timeout';
                  await waitMs(10_000);
                  if (stopped) return 'stopped';
                  const alive = await checkPidAlive(pid);
                  if (!alive?.alive) return 'done';
                }
              };

              const resolveOutputArtifactPath = async () => {
                const directCandidates = buildRenderOutputPathCandidates(
                  completionOutputPath || fallbackOutputPath
                );
                for (const candidate of directCandidates) {
                  const candidatePath = String(candidate || '').trim();
                  if (!candidatePath) continue;
                  const fileRes = await checkFileExists(candidatePath);
                  if (fileRes?.exists === true) return candidatePath;
                }

                if (!outputDirForSearch) return '';
                const scanRes = await findRenderOutputs({
                  rootDir: outputDirForSearch,
                  minMtimeMs: Math.max(0, processStartMs - (24 * 60 * 60 * 1000)),
                  maxDepth: 6,
                  limit: 300,
                });
                const files = Array.isArray(scanRes?.files) ? scanRes.files : [];
                for (const entry of files) {
                  const candidatePath = String(entry?.path || '').trim();
                  if (!candidatePath) continue;
                  if (!isLikelyRenderOutputMedia(candidatePath)) continue;
                  return candidatePath;
                }
                return '';
              };

              const resolveOutputOk = async () => {
                const resolvedOutput = await resolveOutputArtifactPath();
                if (resolvedOutput) {
                  detectedOutputPath = resolvedOutput;
                  return true;
                }
                return allowMissingOutputArtifact === true;
              };

              if (existingPid > 0) {
                const aliveCheck = await checkPidAlive(existingPid);
                if (stopped) return;
                if (aliveCheck?.alive) {
                  const pollResult = await pollUntilDead(existingPid, Date.now() + timeoutMs);
                  if (pollResult === 'stopped') return;
                  if (pollResult === 'timeout') { _procOk = false; _procError = 'timeout'; }
                }
                if (_procOk === null) {
                  _procOk = await resolveOutputOk();
                  if (!_procOk) _procError = 'output_file_not_found';
                }
                await deleteRenderPid(pidTag);
              } else {
                const spawnRes = await spawnDetachedRender({ command, args: normalizedArgs, cwd, pidTag });
                if (stopped) return;
                if (!spawnRes?.ok || !spawnRes?.detached) {
                  _procOk = false;
                  _procError = spawnRes?.error || 'spawn_failed';
                } else {
                  const pollResult = await pollUntilDead(Number(spawnRes.pid || 0), Date.now() + timeoutMs);
                  if (pollResult === 'stopped') return;
                  if (pollResult === 'timeout') { _procOk = false; _procError = 'timeout'; }
                  if (_procOk === null) {
                    _procOk = await resolveOutputOk();
                    if (!_procOk) _procError = 'output_file_not_found';
                  }
                  await deleteRenderPid(pidTag);
                }
              }

              const procRes = { ok: _procOk === true, stdout: '', stderr: '', error: _procError, timedOut: _procError === 'timeout' };
              if (stopped) return;
              const workerLogPath = String(templateContext.workerlogpath || '').trim();
              let workerLogText = '';
              if (workerLogPath && typeof window !== 'undefined' && window?.electron?.readFileText) {
                try {
                  const loadedText = await window.electron.readFileText(workerLogPath);
                  workerLogText = typeof loadedText === 'string' ? loadedText : '';
                } catch {
                  workerLogText = '';
                }
              }
              const processEventComment = buildWorkerProcessEventComment({
                command,
                args: normalizedArgs,
                procRes,
                workerLogPath,
                workerLogText,
              });
              if (procRes?.ok === true) {
                const finalOutputPath = String(
                  detectedOutputPath || completionOutputPath || `renders/render-${renderId}.mov`
                ).trim();
                completionPayload = {
                  workerKey,
                  success: true,
                  outputPath: finalOutputPath,
                  comment: ['worker_process_done', processEventComment]
                    .filter((part) => String(part || '').trim().length > 0)
                    .join('\n')
                    .slice(0, 12000),
                };
              } else {
                completionPayload = {
                  workerKey,
                  success: false,
                  errorMessage: summarizeProcessFailure(procRes),
                  comment: ['worker_process_fail', processEventComment]
                    .filter((part) => String(part || '').trim().length > 0)
                    .join('\n')
                    .slice(0, 12000),
                };
              }
            }
          } else {
            const requestedDelay = Number(
              execution?.delayMs ??
              execution?.simulateDurationMs ??
              payload?.workerDurationMs ??
              payload?.simulateDurationMs ??
              payload?.delayMs ??
              4000
            );
            const delayMs = Math.min(120000, Math.max(1000, Math.trunc(requestedDelay || 4000)));
            await waitMs(delayMs);
            if (stopped) return;

            const shouldFail =
              execution?.simulateFail === true ||
              payload?.simulateFail === true ||
              payload?.forceFail === true;
            const simulatedOutputPathRaw = String(
              execution?.outputPath ??
              payload?.outputPath ??
              `renders/render-${renderId}.mov`
            ).trim();
            const simulatedOutputCandidates = buildRenderOutputPathCandidates(simulatedOutputPathRaw);
            let simulatedDetectedOutputPath = '';
            for (const candidate of simulatedOutputCandidates) {
              const candidatePath = String(candidate || '').trim();
              if (!candidatePath) continue;
              const fileRes = await checkFileExists(candidatePath);
              if (fileRes?.exists === true) {
                simulatedDetectedOutputPath = candidatePath;
                break;
              }
            }
            const allowMissingOutputArtifact = normalizeBooleanFlag(
              execution?.allowMissingOutputArtifact
                ?? payload?.allowMissingOutputArtifact
                ?? false,
              false
            );
            const simulatedOutputReady = !!simulatedDetectedOutputPath || allowMissingOutputArtifact === true;
            const simulatedSuccess = !shouldFail && simulatedOutputReady;

            completionPayload = simulatedSuccess
              ? {
                workerKey,
                success: true,
                outputPath: simulatedDetectedOutputPath || simulatedOutputPathRaw,
                comment: 'worker_auto_done',
              }
              : {
                workerKey,
                success: false,
                errorMessage: shouldFail
                  ? String(
                    execution?.errorMessage ??
                    payload?.errorMessage ??
                    'worker_simulated_failure'
                  )
                  : 'output_file_not_found',
                comment: shouldFail ? 'worker_auto_fail' : 'worker_auto_missing_output',
              };
          }

          try {
            await postprodCompleteRenderWorkerJob(token, renderId, completionPayload);
            await Promise.all([
              loadPostprodRenders().catch(() => ({})),
              loadPostprodRenderWorkers().catch(() => ({})),
              loadPostprodRenderHealth().catch(() => ({})),
            ]);
            if (isPostprodQueueRuntimeActive()) {
              await Promise.resolve(
                handlePostprodDispatchRenders({ maxJobs: 1, silent: true })
              ).catch(() => ({}));
            }
          } catch (err) {
            if (isPostprodRecoverableOfflineError(err)) {
              const nowIso = new Date().toISOString();
              let pendingCount = 0;
              updatePostprodWorkerCompletionOutbox((current) => {
                const next = normalizePostprodWorkerCompletionOutbox(current);
                const existingIdx = next.findIndex((entry) => (
                  String(entry?.workerKey || '').trim() === workerKey
                  && Number(entry?.renderId || 0) === renderId
                  && (
                    currentUserId == null
                    || entry?.userId == null
                    || Number(entry.userId) === currentUserId
                  )
                ));
                if (existingIdx >= 0) {
                  const attempts = Number(next[existingIdx]?.attempts || 0);
                  next[existingIdx] = {
                    ...next[existingIdx],
                    payload: completionPayload,
                    attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
                    lastAttemptAt: nowIso,
                    lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
                  };
                } else {
                  next.push({
                    id: `worker-complete-${workerKey}-${renderId}-${Date.now()}`,
                    kind: 'worker_complete',
                    workerKey,
                    renderId,
                    userId: currentUserId,
                    payload: completionPayload,
                    createdAt: nowIso,
                    attempts: 1,
                    lastAttemptAt: nowIso,
                    lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
                  });
                }
                pendingCount = next.filter((entry) => (
                  String(entry?.workerKey || '').trim() === workerKey
                  && (
                    currentUserId == null
                    || entry?.userId == null
                    || Number(entry.userId) === currentUserId
                  )
                )).length;
                return next;
              });
              showNotice(t('postprod.renders.msg.workerQueuedOffline', { count: pendingCount }), 'warn');
              loadPostprodRenderHealth().catch(() => ({}));
            }
          }
        }
      } catch {}
      },
    });

    return () => {
      stopped = true;
      stopLoop();
    };
  }, [
    postprodAuthenticated,
    postprodCanLaunchRenders,
    hasLocalUnrealCapability,
    localRenderEnabled,
    postprodAuth.token,
    postprodAuth.user?.id,
    renderWorkerKey,
    postprodWorkerCompletionOutbox,
    replayPostprodWorkerCompletionOutbox,
    updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    handlePostprodDispatchRenders,
    showNotice,
    t,
  ]);

  // ---- Notifications renderReturnAt (retour de station depuis 'busy') ----
  const renderReturnNotifiedRef = useRef({}); // { `${ip}:${threshold}` -> true }
  useEffect(() => {
    const THRESHOLDS_MIN = [15, 5, 1];
    const stopLoop = startPostprodAsyncLoop({
      intervalMs: 60000,
      tick: async () => {
        try {
          const map = await getOnlineMap();
          const now = Date.now();
          for (const [ip, entry] of Object.entries(map || {})) {
            if (entry?.renderAvailability !== 'busy') continue;
            const rat = entry?.renderReturnAt;
            if (!rat || typeof rat !== 'string') continue;
            const returnMs = Date.parse(rat);
            if (!Number.isFinite(returnMs)) continue;
            const diffMin = (returnMs - now) / 60000;
            if (diffMin < 0) continue; // already past

            const name = String(entry?.name || ip || '').trim() || ip;
            for (const thresh of THRESHOLDS_MIN) {
              if (diffMin <= thresh + 0.5 && diffMin > thresh - 1.5) {
                const key = `${ip}:${thresh}`;
                if (!renderReturnNotifiedRef.current[key]) {
                  renderReturnNotifiedRef.current[key] = true;
                  const msgKey = thresh === 15
                    ? 'renderReturnAt.notify.15min'
                    : thresh === 5
                      ? 'renderReturnAt.notify.5min'
                      : 'renderReturnAt.notify.1min';
                  showNotice(t(msgKey, { name }), 'info');
                }
              }
            }
            // Clear stale notified keys for entries no longer busy
            const stalePrefix = `${ip}:`;
            for (const k of Object.keys(renderReturnNotifiedRef.current)) {
              if (k.startsWith(stalePrefix)) {
                const thresh = Number(k.split(':')[1]);
                const diffMin2 = (returnMs - Date.now()) / 60000;
                if (diffMin2 < thresh - 2) {
                  // threshold is safely behind us — allow re-notification next cycle if needed
                  delete renderReturnNotifiedRef.current[k];
                }
              }
            }
          }
        } catch {}
      },
    });
    return stopLoop;
  }, [showNotice, t]);
}

export { usePostprodWorkerRenderLoop };
