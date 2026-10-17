import { useCallback } from "react";
import {
  postprodListRenderWorkers,
  postprodPatchRenderWorkerAptitude,
  postprodDispatchRenders,
  setAgentRenderAvailability,
  getHosts,
  postprodReserveRenderId,
  postprodCreateRender,
  postprodScheduleRenderJob,
  postprodUpdateRenderExportDestinations,
  postprodDeleteRenderJob,
  postprodReorderRenderJobs,
  postprodTransitionRender,
  postprodSaveDispatchPolicy,
} from "../utils/agent";
import { resolvePostprodRendersError } from "../utils/postprodErrorHelpers";
import {
  MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS,
  appendToOutboxWithinCapacity,
  isPostprodRecoverableOfflineError,
} from "../utils/postprodOutboxHelpers";
import {
  isPostprodQueueRuntimeActive,
  LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY,
} from "../utils/postprodAuthHelpers";
import {
  normalizeBooleanFlag,
  buildDefaultUnrealProcessExecution,
  normalizeUnrealPresetName,
  withRenderOffscreenProcessArgs,
  withJobContextProcessArgs,
} from "../utils/renderProcessHelpers";

function usePostprodRenderCallbacks({
  postprodAuth, t, showNotice,
  ensureLocalRenderWorkerOnline, tryUpdatePostprodOfflineOutbox,
  loadPostprodRenders, loadPostprodRenderHealth, loadPostprodUserAlerts, loadPostprodTasks,
  aptitudeCheckPending, queuePausedLaunchPending, busyImmediateLaunchPending,
  localPrimaryUnrealEditorPath, postprodRenderOutputDir,
  renderWorkerKey, renderWorkerDisplayName, localRenderAvailability,
  postprodRenderWorkers,
  setAptitudeCheckPending, setQueuePausedLaunchPending, setBusyImmediateLaunchPending,
  setPostprodRenders, setPostprodRenderWorkers, setHostsCfg, setHostsLoaded,
}) {
  const loadPostprodRenderWorkers = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderWorkers({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderWorkers((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderWorkers((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListRenderWorkers(token);
      const items = Array.isArray(res?.workers) ? res.workers : [];
      setPostprodRenderWorkers({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRenderWorkers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const handlePatchLocalWorkerAptitude = useCallback(async (apte) => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;
    try {
      await postprodPatchRenderWorkerAptitude(token, workerKey, apte);
      await loadPostprodRenderWorkers();
    } catch {
      // best-effort
    }
  }, [postprodAuth.token, renderWorkerKey, loadPostprodRenderWorkers]);

  const handleAptitudeConfirm = useCallback(async () => {
    const pending = aptitudeCheckPending;
    setAptitudeCheckPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await ensureLocalRenderWorkerOnline();
      await handlePatchLocalWorkerAptitude(true);
      await ensureLocalRenderWorkerOnline();
      if (!isPostprodQueueRuntimeActive()) {
        showNotice("File d'attente en pause: le rendu reste en attente.", "warn");
        await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
        return;
      }
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pending.renderId > 0 ? [pending.renderId] : undefined,
      });
      const dispatchedCount = Number.isFinite(Number(dispatchRes?.count)) ? Math.max(0, Math.trunc(Number(dispatchRes.count))) : 0;
      if (dispatchedCount <= 0) {
        showNotice("Rendu cree mais non demarre: aucune station disponible.", "warn");
      }
    } catch {
      showNotice("Rendu cree, mais lancement immediat indisponible.", "warn");
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    aptitudeCheckPending,
    handlePatchLocalWorkerAptitude,
    ensureLocalRenderWorkerOnline,
    postprodAuth.token,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
  ]);

  const handleAptitudeCancel = useCallback(() => {
    setAptitudeCheckPending(null);
    showNotice(t('postprod.renders.aptitude.noticeCancelled'), 'warn');
  }, [showNotice, t]);

  const handleQueuePausedLaunchConfirm = useCallback(async () => {
    const pending = queuePausedLaunchPending;
    setQueuePausedLaunchPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      localStorage.setItem(LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY, 'active');
    } catch {}
    const pendingRenderIdRaw = Number(pending?.renderId || 0);
    const pendingRenderId = Number.isFinite(pendingRenderIdRaw) && pendingRenderIdRaw > 0
      ? Math.trunc(pendingRenderIdRaw)
      : 0;
    try {
      await ensureLocalRenderWorkerOnline();
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pendingRenderId > 0 ? [pendingRenderId] : undefined,
      });
      const dispatchedCount = Number.isFinite(Number(dispatchRes?.count))
        ? Math.max(0, Math.trunc(Number(dispatchRes.count)))
        : 0;
      if (dispatchedCount <= 0) {
        showNotice("Rendu cree mais non demarre: aucune station de rendu disponible/compatible pour le moment.", "warn");
      } else {
        showNotice(t('postprod.renders.queuePause.noticeActivated'), 'ok');
      }
    } catch {
      showNotice("Rendu cree, mais lancement immediat indisponible. Verifie les stations de rendu disponibles.", "warn");
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    queuePausedLaunchPending,
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);

  const handleQueuePausedLaunchContinue = useCallback(() => {
    setQueuePausedLaunchPending(null);
    showNotice(t('postprod.renders.queuePause.noticeKeptPaused'), 'info');
  }, [showNotice, t]);

  const handleBusyImmediateLaunchConfirm = useCallback(async () => {
    const pending = busyImmediateLaunchPending;
    setBusyImmediateLaunchPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;

    try {
      await setAgentRenderAvailability('capable', null);
      const freshHosts = await getHosts().catch(() => null);
      if (Array.isArray(freshHosts)) {
        setHostsCfg(freshHosts);
        setHostsLoaded(true);
      }
      await ensureLocalRenderWorkerOnline();
      await handlePatchLocalWorkerAptitude(true);
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pending.renderId > 0 ? [pending.renderId] : undefined,
      });
      const dispatchedCountRaw = Number(dispatchRes?.count || 0);
      const dispatchedCount = Number.isFinite(dispatchedCountRaw) ? Math.max(0, Math.trunc(dispatchedCountRaw)) : 0;
      if (dispatchedCount <= 0) {
        showNotice(
          "Rendu créé mais non démarré: aucune station de rendu disponible/compatible pour le moment.",
          "warn"
        );
      }
    } catch {
      showNotice(
        "Impossible de passer la station en disponible. Le rendu reste en attente.",
        "warn"
      );
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    busyImmediateLaunchPending,
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    handlePatchLocalWorkerAptitude,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
  ]);

  const handleBusyImmediateLaunchCancel = useCallback(() => {
    setBusyImmediateLaunchPending(null);
    showNotice("Rendu en attente: sera lancé automatiquement quand une station sera disponible.", "info");
  }, [showNotice]);

  const handlePostprodReserveRenderId = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return 0;
    try {
      const res = await postprodReserveRenderId(token);
      const idRaw = Number(res?.reservedRenderId || 0);
      return Number.isFinite(idRaw) && idRaw > 0 ? Math.trunc(idRaw) : 0;
    } catch {
      return 0;
    }
  }, [postprodAuth.token]);

  const handlePostprodCreateRender = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const sourcePayload = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
    const sourceJobPayload = sourcePayload?.payload && typeof sourcePayload.payload === 'object' && !Array.isArray(sourcePayload.payload)
      ? sourcePayload.payload
      : {};
    const normalizedPayload = {
      ...sourcePayload,
      payload: {
        ...sourceJobPayload,
      },
    };
    const jobPayload = normalizedPayload.payload;
    const mapName = String(jobPayload?.mapName || normalizedPayload?.mapName || '').trim();
    const sequenceName = String(jobPayload?.sequenceName || normalizedPayload?.sequenceName || '').trim();
    const outputProfile = String(jobPayload?.outputProfile || normalizedPayload?.outputProfile || '').trim();
    const formData = jobPayload?.formData && typeof jobPayload.formData === 'object' && !Array.isArray(jobPayload.formData)
      ? jobPayload.formData
      : (normalizedPayload?.formData && typeof normalizedPayload.formData === 'object' && !Array.isArray(normalizedPayload.formData)
          ? normalizedPayload.formData
          : {});
    const formDataCount = Object.keys(formData).length;
    const payloadWrcFiles = Array.isArray(jobPayload?.wrcFiles)
      ? jobPayload.wrcFiles
      : (Array.isArray(jobPayload?.wrc_files) ? jobPayload.wrc_files : []);
    const fallbackWrcPresetPath = payloadWrcFiles
      .map((entry) => String(entry || '').trim())
      .find(Boolean) || '';
    const presetPath = String(
      jobPayload?.presetPath
      || jobPayload?.preset_path
      || normalizedPayload?.presetPath
      || normalizedPayload?.preset_path
      || fallbackWrcPresetPath
      || ''
    ).trim();
    const explicitPresetName = String(
      jobPayload?.presetName
      || normalizedPayload?.presetName
      || ''
    ).trim();
    const renderModePresetFallback = formDataCount > 0
      ? ''
      : String(
        jobPayload?.renderModeName
        || normalizedPayload?.renderModeName
        || ''
      ).trim();
    const presetName = explicitPresetName
      || normalizeUnrealPresetName(presetPath)
      || renderModePresetFallback;
    if (presetPath && !jobPayload.presetPath) jobPayload.presetPath = presetPath;
    if (presetName && !jobPayload.presetName) jobPayload.presetName = presetName;
    const textValue = String(jobPayload?.textValue || normalizedPayload?.textValue || '').trim();
    const renderOffscreen = normalizeBooleanFlag(
      jobPayload?.renderOffscreen
      ?? normalizedPayload?.renderOffscreen
      ?? jobPayload?.execution?.renderOffscreen
      ?? false,
      false
    );
    jobPayload.renderOffscreen = renderOffscreen;
    const outputDir = String(
      jobPayload?.outputDir
      || normalizedPayload?.outputDir
      || postprodRenderOutputDir
      || ''
    ).trim();
    if (outputDir && !jobPayload.outputDir) {
      jobPayload.outputDir = outputDir;
    }
    if (localPrimaryUnrealEditorPath && !jobPayload.unrealEditorPath) {
      jobPayload.unrealEditorPath = localPrimaryUnrealEditorPath;
    }
    const existingExecution = jobPayload?.execution;
    const hasExecutionObject = existingExecution && typeof existingExecution === 'object' && !Array.isArray(existingExecution);
    if (!hasExecutionObject) {
      jobPayload.execution = buildDefaultUnrealProcessExecution({
        mapName,
        sequenceName,
        outputProfile,
        outputDir,
        presetName,
        formData,
        textValue,
        renderOffscreen,
      });
    } else {
      let normalizedExecution = withRenderOffscreenProcessArgs(existingExecution, renderOffscreen);
      if (!normalizedExecution && typeof existingExecution === 'object' && !Array.isArray(existingExecution)) {
        normalizedExecution = { ...existingExecution, renderOffscreen };
      }
      if (normalizedExecution) {
        jobPayload.execution = withJobContextProcessArgs(normalizedExecution, formDataCount > 0) || normalizedExecution;
      }
    }
    const sourceTag = String(jobPayload?.source || normalizedPayload?.source || "").trim().toLowerCase();
    const launchModeTag = String(normalizedPayload?.launchMode || "").trim().toLowerCase();
    const launchNowRequested = (
      sourceTag === "task_auto_render_now"
      || launchModeTag === "now"
      || normalizedPayload?.launchNow === true
    );
    const requestedStationChoice = String(
      normalizedPayload?.render_station
      || normalizedPayload?.renderStation
      || jobPayload?.render_station
      || jobPayload?.renderStation
      || ''
    ).trim().toLowerCase();
    const autoDispatcherRequested = (
      requestedStationChoice === 'auto'
      || requestedStationChoice === 'auto_dispatcher'
    );
    const queueRuntimeActive = isPostprodQueueRuntimeActive();
    const createPayload = {
      ...normalizedPayload,
      payload: {
        ...jobPayload,
      },
    };
    if (launchNowRequested && !queueRuntimeActive) {
      createPayload.render_station = 'local';
      createPayload.render_station_name = '';
      createPayload.renderStation = 'local';
      createPayload.renderStationName = '';
      if (createPayload.payload && typeof createPayload.payload === 'object' && !Array.isArray(createPayload.payload)) {
        createPayload.payload.render_station = 'local';
        createPayload.payload.render_station_name = '';
        createPayload.payload.renderStation = 'local';
        createPayload.payload.renderStationName = '';
      }
    }
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const createRes = await postprodCreateRender(token, createPayload);
      const remoteDispatch = createRes?.remoteDispatch && typeof createRes.remoteDispatch === 'object'
        ? createRes.remoteDispatch
        : null;
      const createdRenderIdRaw = Number(createRes?.render?.id || createRes?.renderJob?.id || 0);
      const createdRenderId = Number.isFinite(createdRenderIdRaw) && createdRenderIdRaw > 0
        ? Math.trunc(createdRenderIdRaw)
        : 0;
      const remoteDispatchMode = String(remoteDispatch?.mode || '').trim().toLowerCase();
      const remoteDispatchOk = remoteDispatch?.ok === true
        && (remoteDispatchMode === 'auto' || remoteDispatchMode === 'manual');
      if (launchNowRequested && !queueRuntimeActive) {
        if (createdRenderId > 0) {
          setQueuePausedLaunchPending({ renderId: createdRenderId });
        } else {
          showNotice(t('postprod.renders.queuePause.noticeKeptPaused'), 'info');
        }
      }
      if (launchNowRequested && !remoteDispatchOk && queueRuntimeActive) {
        const localWorkerKey = String(renderWorkerKey || '').trim();
        let freshWorkersList = postprodRenderWorkers.items || [];
        try {
          const freshWorkersRes = await postprodListRenderWorkers(token);
          if (Array.isArray(freshWorkersRes?.workers)) {
            freshWorkersList = freshWorkersRes.workers;
            setPostprodRenderWorkers((prev) => ({ ...prev, items: freshWorkersList }));
          }
        } catch {
          // fall back to cached state
        }
        const localWorkerInList = localWorkerKey
          ? freshWorkersList.find((w) => String(w?.workerKey || '').trim() === localWorkerKey)
          : null;
        const localWorkerAvailability = String(
          localWorkerInList?.renderAvailability || localRenderAvailability || ''
        ).trim().toLowerCase();
        const localWorkerIsBusy = localWorkerAvailability === 'busy';
        const localWorkerIsInapte = localWorkerInList && localWorkerInList.apte === false;
        const localWorkerKeyLower = String(localWorkerKey || '').trim().toLowerCase();
        const launchTargetsLocalWorker = (
          !requestedStationChoice
          || requestedStationChoice === 'local'
          || requestedStationChoice === localWorkerKeyLower
          || autoDispatcherRequested
        );
        if (localWorkerIsBusy && launchTargetsLocalWorker) {
          setBusyImmediateLaunchPending({
            renderId: createdRenderId,
            workerDisplayName: String(localWorkerInList?.displayName || renderWorkerDisplayName || localWorkerKey).trim(),
          });
        } else if (localWorkerIsInapte && !autoDispatcherRequested) {
          setAptitudeCheckPending({
            renderId: createdRenderId,
            workerDisplayName: String(localWorkerInList?.displayName || renderWorkerDisplayName || localWorkerKey).trim(),
          });
        } else {
          try {
            await ensureLocalRenderWorkerOnline();
            await handlePatchLocalWorkerAptitude(true);
            const dispatchRes = await postprodDispatchRenders(token, {
              maxJobs: 1,
              renderIds: createdRenderId > 0 ? [createdRenderId] : undefined,
            });
            const dispatchedCountRaw = Number(dispatchRes?.count || 0);
            const dispatchedCount = Number.isFinite(dispatchedCountRaw) ? Math.max(0, Math.trunc(dispatchedCountRaw)) : 0;
            if (dispatchedCount <= 0) {
              showNotice(
                "Rendu cree mais non demarre: aucune station de rendu disponible/compatible pour le moment.",
                "warn"
              );
            }
          } catch (dispatchErr) {
            const dispatchErrCode = String(dispatchErr?.code || "").trim().toLowerCase();
            if (dispatchErrCode === "forbidden_dispatch") {
              showNotice(
                "Rendu cree, mais dispatch auto non autorise pour ce role. Lance le rendu depuis la file d'attente.",
                "warn"
              );
            } else {
              showNotice(
                "Rendu cree, mais lancement immediat indisponible. Verifie les stations de rendu disponibles.",
                "warn"
              );
            }
          }
        }
      }
      if (launchNowRequested && remoteDispatchOk && queueRuntimeActive) {
        showNotice(
          `Rendu transmis a ${remoteDispatch?.stationName || remoteDispatch?.stationIp || 'la station distante'}.`,
          'info'
        );
      }
      if (remoteDispatch && remoteDispatch.ok === false) {
        if (String(remoteDispatch.mode || '').trim().toLowerCase() === 'manual') {
          showNotice(
            `Station cible indisponible (${remoteDispatch.stationName || remoteDispatch.stationIp || 'inconnue'}). Le rendu reste en attente.`,
            'warn'
          );
        } else if (String(remoteDispatch.mode || '').trim().toLowerCase() === 'auto') {
          showNotice(
            'Aucune station distante joignable: bascule automatique en rendu local.',
            'warn'
          );
        }
      }
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodRenderWorkers(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.created'), 'ok');
      return createRes?.render || createRes?.renderJob || null;
    } catch (e) {
      if (isPostprodRecoverableOfflineError(e)) {
        const item = {
          id: `offline-render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'create_render',
          userId: currentUserId,
          payload: normalizedPayload,
          createdAt: new Date().toISOString(),
          attempts: 0,
          lastAttemptAt: '',
          lastError: String(e?.message || e?.code || 'network_error').trim().slice(0, 200),
        };
        // Décision prise sur la file courante, au moment même de l'ajout : le
        // message affiché correspond au résultat effectif (accepté ou refusé).
        const queued = tryUpdatePostprodOfflineOutbox((current) => {
          const result = appendToOutboxWithinCapacity(current, item, MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);
          return { next: result.list, accepted: result.accepted };
        });
        if (queued?.accepted !== true) {
          // File pleine : refus explicite, aucune demande en attente n'est supprimée.
          const fullMessage = t('postprod.renders.msg.offlineQueueFull', { max: MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS });
          setPostprodRenders((prev) => ({ ...prev, loading: false, error: fullMessage }));
          showNotice(fullMessage, 'error');
          return null;
        }
        setPostprodRenders((prev) => ({
          ...prev,
          loading: false,
          error: '',
        }));
        showNotice(t('postprod.renders.msg.queuedOffline', { count: queued.list.length }), 'warn');
        return null;
      }
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return null;
    }
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    tryUpdatePostprodOfflineOutbox,
    localPrimaryUnrealEditorPath,
    postprodRenderOutputDir,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    ensureLocalRenderWorkerOnline,
    renderWorkerKey,
    renderWorkerDisplayName,
    localRenderAvailability,
    postprodRenderWorkers.items,
    setAptitudeCheckPending,
    setBusyImmediateLaunchPending,
    handlePatchLocalWorkerAptitude,
    t,
  ]);

  const handlePostprodScheduleRender = useCallback(async (renderId, scheduledAt) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodScheduleRenderJob(token, renderId, { scheduledAt: scheduledAt ?? null });
      await loadPostprodRenders();
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'schedule_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodUpdateRenderExportDestinations = useCallback(async (renderId, exportDestinationIds = []) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodUpdateRenderExportDestinations(token, renderId, exportDestinationIds);
      await loadPostprodRenders({ silent: true });
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'update_export_destinations_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodDeleteRender = useCallback(async (renderId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    const renderIdNum = Number(renderId);
    const normalizedRenderId = Number.isFinite(renderIdNum) && renderIdNum > 0
      ? Math.trunc(renderIdNum)
      : 0;
    if (normalizedRenderId <= 0) return false;

    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderJob(token, normalizedRenderId);
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodTasks(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [
    postprodAuth.token,
    loadPostprodRenders,
    loadPostprodTasks,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    t,
  ]);

  const handlePostprodReorderRenders = useCallback(async (order = []) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodReorderRenderJobs(token, { order });
      await loadPostprodRenders();
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'reorder_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodTransitionRender = useCallback(async (renderId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodTransitionRender(token, renderId, payload);
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.transitionOk'), 'info');
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, loadPostprodRenders, loadPostprodRenderHealth, loadPostprodUserAlerts, showNotice, t]);

  const handlePostprodDispatchRenders = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const sourcePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const silent = sourcePayload.silent === true;
    const forceDispatch = sourcePayload.force === true;
    if (!token) return { count: 0, compatibilityBlocked: 0 };
    if (!isPostprodQueueRuntimeActive() && !forceDispatch) {
      if (!silent) {
        showNotice("File d'attente en pause: aucun rendu ne peut etre lance.", "warn");
      }
      return { count: 0, compatibilityBlocked: 0 };
    }
    const dispatchPayload = { ...sourcePayload };
    delete dispatchPayload.silent;
    delete dispatchPayload.force;
    if (!silent) {
      setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      await ensureLocalRenderWorkerOnline();
      const res = await postprodDispatchRenders(token, dispatchPayload);
      await Promise.all([
        loadPostprodRenders(silent ? { silent: true } : undefined),
        loadPostprodRenderWorkers(silent ? { silent: true } : undefined),
        loadPostprodRenderHealth(silent ? { silent: true } : undefined),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      const count = Number(res?.count || 0);
      const compatibilityBlockedRaw = res?.compatibilityBlocked;
      const compatibilityBlocked = Array.isArray(compatibilityBlockedRaw)
        ? compatibilityBlockedRaw.length
        : Number(compatibilityBlockedRaw || 0);
      if (!silent) {
        showNotice(
          t('postprod.renders.msg.dispatched', { count: Number.isFinite(count) ? count : 0 }),
          count > 0 ? 'ok' : 'info'
        );
        if (Number.isFinite(compatibilityBlocked) && compatibilityBlocked > 0) {
          showNotice(
            `Dispatch: ${count} assignes, ${compatibilityBlocked} en attente (incompatibilite capacites station de rendu).`,
            'warn'
          );
        }
      }
      return {
        count,
        compatibilityBlocked: Number.isFinite(compatibilityBlocked) ? compatibilityBlocked : 0,
      };
    } catch (e) {
      if (!silent) {
        setPostprodRenders((prev) => ({
          ...prev,
          loading: false,
          error: resolvePostprodRendersError(e, t),
        }));
      }
      return { count: 0, compatibilityBlocked: 0 };
    }
  }, [
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    t,
  ]);

  const handlePostprodPatchWorkerAptitude = useCallback(async (workerKey, apte) => {
    const token = String(postprodAuth.token || '').trim();
    const key = String(workerKey || '').trim();
    if (!token || !key) return;
    try {
      await postprodPatchRenderWorkerAptitude(token, key, apte);
      await loadPostprodRenderWorkers();
      if ((apte === true || apte === 1) && isPostprodQueueRuntimeActive()) {
        await Promise.resolve(handlePostprodDispatchRenders({ maxJobs: 1, silent: true })).catch(() => ({}));
      }
    } catch {
      // best-effort
    }
  }, [postprodAuth.token, loadPostprodRenderWorkers, handlePostprodDispatchRenders]);

  const handlePostprodSaveDispatchPolicy = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodSaveDispatchPolicy(token, payload);
      await loadPostprodRenderHealth();
      setPostprodRenders((prev) => ({ ...prev, loading: false, error: '' }));
      showNotice(t('postprod.renders.dispatchPolicy.msg.saved', 'Politique de dispatch enregistree.'), 'ok');
      return res?.dispatchPolicy && typeof res.dispatchPolicy === 'object'
        ? res.dispatchPolicy
        : null;
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return null;
    }
  }, [postprodAuth.token, loadPostprodRenderHealth, showNotice, t]);
  return {
    loadPostprodRenderWorkers,
    handlePatchLocalWorkerAptitude,
    handleAptitudeConfirm,
    handleAptitudeCancel,
    handleQueuePausedLaunchConfirm,
    handleQueuePausedLaunchContinue,
    handleBusyImmediateLaunchConfirm,
    handleBusyImmediateLaunchCancel,
    handlePostprodReserveRenderId,
    handlePostprodCreateRender,
    handlePostprodScheduleRender,
    handlePostprodUpdateRenderExportDestinations,
    handlePostprodDeleteRender,
    handlePostprodReorderRenders,
    handlePostprodTransitionRender,
    handlePostprodDispatchRenders,
    handlePostprodPatchWorkerAptitude,
    handlePostprodSaveDispatchPolicy,
  };
}

export { usePostprodRenderCallbacks };