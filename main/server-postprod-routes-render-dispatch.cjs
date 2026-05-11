const { getOnlineState } = require('./server-hosts-online.cjs');
const { RENDER_AVAILABILITY_VALUES } = require('./server-normalize.cjs');

async function handlePostprodRenderDispatchRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  nowIso,
  addSeconds,
  RENDER_WORKER_ONLINE_TTL_SECONDS,
  sweepStaleWorkersAndRequeue,
  stmts,
  buildRenderWorkerPayload,
  rolePermissions,
  rolesCache,
  sanitizeRenderWorkerKey,
  sanitizeRenderWorkerName,
  normalizeRenderWorkerCapabilities,
  requireRenderDispatch,
  resolveRenderDispatchConfig,
  buildRenderDispatchPolicyPayload,
  resolveRequestedRenderDispatchConfig,
  buildRenderDispatchPolicyStorageJson,
  audit,
  coercePositiveInt,
  MAX_RENDER_DISPATCH_MAX_JOBS,
  DEFAULT_RENDER_DISPATCH_MAX_JOBS,
  computeRenderDispatchFetchLimit,
  normalizeDispatchRenderIds,
  MAX_RENDER_DISPATCH_WORKER_FETCH_LIMIT,
  isDispatchableRenderRow,
  toDispatchableRenderRow,
  selectRenderJobsForDispatch,
  buildRenderDispatchPairs,
  db,
  buildRenderJobPayload,
  createRenderOutputSubdir = null,
}) {
  if (pathname === '/agent/postprod/render-workers') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const now = nowIso();
    const cutoff = addSeconds(now, -RENDER_WORKER_ONLINE_TTL_SECONDS);
    sweepStaleWorkersAndRequeue(now, cutoff, auth.session.user_id);

    if (req.method === 'GET') {
      const onlineState = getOnlineState();
      const workers = stmts.listRenderWorkers.all().map((row) => {
        const payload = buildRenderWorkerPayload(row);
        const onlineEntry = onlineState[payload.workerKey] || null;
        const renderAvailability = RENDER_AVAILABILITY_VALUES.includes(onlineEntry?.renderAvailability)
          ? onlineEntry.renderAvailability
          : (payload.canRender ? 'capable' : 'excluded');
        return { ...payload, renderAvailability };
      });
      sendJSON(res, 200, { ok: true, workers });
      return true;
    }

    if (req.method === 'POST') {
      const actorPerms = rolePermissions(auth.session.role, rolesCache);
      if (actorPerms.canLaunchRenders !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden' });
        return true;
      }
      const body = await parseBody(req);
      const workerKey = sanitizeRenderWorkerKey(body?.workerKey || body?.key || '');
      if (!workerKey) {
        sendJSON(res, 400, { ok: false, error: 'invalid_worker_key' });
        return true;
      }
      const displayName = sanitizeRenderWorkerName(body?.displayName, workerKey);
      const canRender = body?.canRender !== false;
      const isActive = body?.isActive !== false;
      const isOnline = body?.isOnline !== false;
      const lastSeenAt = isOnline ? now : null;
      const previousWorker = stmts.findRenderWorkerByKey.get(workerKey);
      const hasCapabilitiesInput = (
        body && typeof body === 'object' && (
          Object.prototype.hasOwnProperty.call(body, 'capabilities') ||
          Object.prototype.hasOwnProperty.call(body, 'workerCapabilities') ||
          Object.prototype.hasOwnProperty.call(body, 'capabilitiesJson')
        )
      );
      let capabilitiesJson = String(previousWorker?.capabilities_json || '{}');
      if (hasCapabilitiesInput) {
        const normalizedCapabilities = normalizeRenderWorkerCapabilities(
          body?.capabilities ?? body?.workerCapabilities ?? body?.capabilitiesJson
        );
        if (!normalizedCapabilities.ok) {
          sendJSON(res, 400, { ok: false, error: normalizedCapabilities.error || 'invalid_worker_capabilities' });
          return true;
        }
        capabilitiesJson = normalizedCapabilities.capabilitiesJson;
      }
      stmts.upsertRenderWorkerByKey.run(
        workerKey,
        displayName,
        capabilitiesJson,
        canRender ? 1 : 0,
        isActive ? 1 : 0,
        isOnline ? 1 : 0,
        lastSeenAt,
        now,
        now
      );
      const worker = stmts.findRenderWorkerByKey.get(workerKey);
      sendJSON(res, 200, { ok: true, worker: buildRenderWorkerPayload(worker) });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const aptitudeMatch = /^\/agent\/postprod\/render-workers\/([^/]+)\/aptitude$/.exec(pathname);
  if (aptitudeMatch) {
    if (req.method !== 'PATCH') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    if (actorPerms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return true;
    }
    const workerKey = sanitizeRenderWorkerKey(decodeURIComponent(aptitudeMatch[1] || ''));
    if (!workerKey) {
      sendJSON(res, 400, { ok: false, error: 'invalid_worker_key' });
      return true;
    }
    const existing = stmts.findRenderWorkerByKey.get(workerKey);
    if (!existing) {
      sendJSON(res, 404, { ok: false, error: 'worker_not_found' });
      return true;
    }
    const body = await parseBody(req);
    const apte = body?.apte === true || body?.apte === 1;
    const now = nowIso();
    const wasApte = Number(existing?.apte) === 1;
    const apteChanged = wasApte !== apte;
    let updated = existing;
    if (apteChanged) {
      stmts.updateRenderWorkerAptitude.run(apte ? 1 : 0, now, workerKey);
      updated = stmts.findRenderWorkerByKey.get(workerKey);
    }
    if (apteChanged) {
      audit(
        auth.session.user_id,
        'render_worker_aptitude_updated',
        { workerKey, apte },
        'render',
        ''
      );
    }
    sendJSON(res, 200, { ok: true, worker: buildRenderWorkerPayload(updated) });
    return true;
  }

  if (pathname === '/agent/postprod/renders/dispatch-policy') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const dispatchPerms = requireRenderDispatch(auth, res, sendJSON);
    if (!dispatchPerms) return true;

    if (req.method === 'GET') {
      const dispatchConfig = resolveRenderDispatchConfig(stmts);
      sendJSON(res, 200, {
        ok: true,
        dispatchPolicy: buildRenderDispatchPolicyPayload(dispatchConfig, { includeRules: true }),
      });
      return true;
    }

    if (req.method === 'PUT') {
      const now = nowIso();
      let dispatchConfig = resolveRenderDispatchConfig(stmts);
      const body = await parseBody(req);
      const requestedConfig = resolveRequestedRenderDispatchConfig(body, dispatchConfig);
      if (requestedConfig.shouldPersistDispatchConfig) {
        const createdAt = String(dispatchConfig.createdAt || '').trim() || now;
        const updatedByUserId = Number.isFinite(Number(auth.session.user_id))
          ? Number(auth.session.user_id)
          : null;
        stmts.upsertRenderDispatchPolicyById.run(
          1,
          requestedConfig.requestedMaxJobs,
          buildRenderDispatchPolicyStorageJson(requestedConfig.requestedDispatchPolicy),
          updatedByUserId,
          createdAt,
          now
        );
        dispatchConfig = {
          ...dispatchConfig,
          maxJobs: requestedConfig.requestedMaxJobs,
          dispatchPolicy: requestedConfig.requestedDispatchPolicy,
          updatedByUserId,
          createdAt,
          updatedAt: now,
        };
        audit(
          auth.session.user_id,
          'render_dispatch_policy_updated',
          {
            maxJobs: dispatchConfig.maxJobs,
            dispatchPolicy: buildRenderDispatchPolicyPayload(dispatchConfig, { includeRules: true }),
          },
          'render',
          ''
        );
      }
      sendJSON(res, 200, {
        ok: true,
        saved: requestedConfig.shouldPersistDispatchConfig,
        dispatchPolicy: buildRenderDispatchPolicyPayload(dispatchConfig, { includeRules: true }),
      });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  if (pathname === '/agent/postprod/renders/dispatch') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const dispatchPerms = requireRenderDispatch(auth, res, sendJSON);
    if (!dispatchPerms) return true;
    const body = await parseBody(req);
    const now = nowIso();
    const cutoff = addSeconds(now, -RENDER_WORKER_ONLINE_TTL_SECONDS);
    sweepStaleWorkersAndRequeue(now, cutoff, auth.session.user_id);
    let dispatchConfig = resolveRenderDispatchConfig(stmts);
    const requestedConfig = resolveRequestedRenderDispatchConfig(body, dispatchConfig);
    if (requestedConfig.shouldPersistDispatchConfig) {
      const createdAt = String(dispatchConfig.createdAt || '').trim() || now;
      const updatedByUserId = Number.isFinite(Number(auth.session.user_id))
        ? Number(auth.session.user_id)
        : null;
      stmts.upsertRenderDispatchPolicyById.run(
        1,
        requestedConfig.requestedMaxJobs,
        buildRenderDispatchPolicyStorageJson(requestedConfig.requestedDispatchPolicy),
        updatedByUserId,
        createdAt,
        now
      );
      dispatchConfig = {
        ...dispatchConfig,
        maxJobs: requestedConfig.requestedMaxJobs,
        dispatchPolicy: requestedConfig.requestedDispatchPolicy,
        updatedByUserId,
        createdAt,
        updatedAt: now,
      };
    }
    const maxJobs = Math.min(
      MAX_RENDER_DISPATCH_MAX_JOBS,
      coercePositiveInt(dispatchConfig.maxJobs, DEFAULT_RENDER_DISPATCH_MAX_JOBS, 1)
    );
    const dispatchPolicy = dispatchConfig.dispatchPolicy;
    const dispatchPolicyPayload = buildRenderDispatchPolicyPayload(dispatchConfig);
    const dispatchFetchLimit = computeRenderDispatchFetchLimit(maxJobs, dispatchPolicy);
    const requestedRenderIds = normalizeDispatchRenderIds(body?.renderIds);
    const workerFetchLimit = Math.min(
      MAX_RENDER_DISPATCH_WORKER_FETCH_LIMIT,
      Math.max(maxJobs, dispatchFetchLimit)
    );
    const onlineState = getOnlineState();
    const availableWorkers = stmts.listAvailableRenderWorkers.all(cutoff, workerFetchLimit).filter((w) => {
      const entry = onlineState[String(w.worker_key || '').trim()];
      if (!entry) return true;
      return String(entry.renderAvailability || '').trim().toLowerCase() === 'capable';
    });
    let dispatchableJobs = [];
    if (requestedRenderIds.length > 0) {
      for (const renderId of requestedRenderIds) {
        const row = stmts.findRenderJobById.get(renderId);
        if (!isDispatchableRenderRow(row)) continue;
        dispatchableJobs.push(toDispatchableRenderRow(row));
      }
    } else {
      dispatchableJobs = stmts.listDispatchableRenderJobsScheduled.all(nowIso(), dispatchFetchLimit);
    }
    const runningProjectLoads = stmts.listRunningRenderLoadByProject.all();
    const selectedJobs = requestedRenderIds.length > 0
      ? selectRenderJobsForDispatch(
        dispatchableJobs,
        Math.min(maxJobs, availableWorkers.length),
        { applied: false },
        runningProjectLoads
      )
      : selectRenderJobsForDispatch(
        dispatchableJobs,
        Math.min(maxJobs, availableWorkers.length),
        dispatchPolicy,
        runningProjectLoads
      );
    const dispatchPairs = buildRenderDispatchPairs(
      selectedJobs.jobs,
      availableWorkers,
      maxJobs
    );
    const compatibilityBlockedJobs = Array.isArray(dispatchPairs.unmatchedJobs)
      ? dispatchPairs.unmatchedJobs
      : [];
    const compatibilityBlockedCount = compatibilityBlockedJobs.length;
    const pairCount = dispatchPairs.pairs.length;
    if (pairCount <= 0) {
      sendJSON(res, 200, {
        ok: true,
        dispatched: [],
        count: 0,
        queued: dispatchableJobs.length,
        workersAvailable: availableWorkers.length,
        compatibilityBlocked: compatibilityBlockedCount,
        compatibilityBlockedJobs,
        requestedRenderIds,
        dispatchPolicy: {
          ...dispatchPolicyPayload,
          applied: selectedJobs.policyApplied,
          byProject: selectedJobs.byProject,
          activeByProject: selectedJobs.activeByProject,
          totalByProject: selectedJobs.totalByProject,
        },
      });
      return true;
    }

    const actorUserId = Number(auth.session.user_id || 0);
    const dispatchEventComment = selectedJobs.policyApplied
      ? 'Lancement automatique (politique par projet)'
      : 'Lancement automatique (FIFO)';
    const dispatched = db.transaction(() => {
      const out = [];
      for (let i = 0; i < dispatchPairs.pairs.length; i += 1) {
        const pair = dispatchPairs.pairs[i];
        const job = pair?.job;
        const worker = pair?.worker;
        const claimed = stmts.assignRenderJobToWorkerCurrent.run(
          Number(job?.id || 0),
          now,
          Number(worker?.id || 0)
        );
        if (Number(claimed?.changes || 0) <= 0) continue;
        const updated = stmts.dispatchRenderJobToWorker.run(
          Number(worker?.id || 0),
          now,
          now,
          now,
          Number(job?.id || 0)
        );
        if (Number(updated?.changes || 0) <= 0) {
          stmts.clearRenderWorkerCurrentJobByRenderId.run(now, Number(job?.id || 0));
          continue;
        }
        stmts.insertRenderJobEvent.run(
          Number(job?.id || 0),
          'Queued',
          'Running',
          actorUserId,
          dispatchEventComment,
          now
        );
        const full = stmts.findRenderJobById.get(Number(job?.id || 0));
        if (full) out.push(buildRenderJobPayload(full));
      }
      return out;
    })();

    if (typeof createRenderOutputSubdir === 'function') {
      for (const job of dispatched) {
        const jobId = Number(job?.id || 0);
        const projectName = String(job?.projectName || '').trim();
        if (!jobId || !projectName) continue;
        const result = createRenderOutputSubdir(jobId, projectName);
        if (result.ok && result.outputPath) {
          const jobDir = result.outputPath;
          stmts.updateRenderJobOutputPath.run(jobDir, now, jobId);
          job.outputPath = jobDir;
          const existingPayload = job?.payload && typeof job.payload === 'object' ? job.payload : {};
          const updatedPayload = { ...existingPayload, outputDir: jobDir };
          try {
            stmts.updateRenderJobPayload.run(JSON.stringify(updatedPayload), now, jobId);
            job.payload = updatedPayload;
          } catch {}
        }
      }
    }

    if (dispatched.length > 0) {
      audit(
        auth.session.user_id,
        'renders_dispatched',
        {
          count: dispatched.length,
          maxJobs,
          requestedRenderIds,
          compatibilityBlocked: compatibilityBlockedCount,
          dispatchPolicy: {
            ...dispatchPolicyPayload,
            applied: selectedJobs.policyApplied,
          },
          byProject: selectedJobs.byProject,
          activeByProject: selectedJobs.activeByProject,
          totalByProject: selectedJobs.totalByProject,
        },
        'render',
        ''
      );
    }
    sendJSON(res, 200, {
      ok: true,
      dispatched,
      count: dispatched.length,
      queued: dispatchableJobs.length,
      workersAvailable: availableWorkers.length,
      compatibilityBlocked: compatibilityBlockedCount,
      compatibilityBlockedJobs,
      requestedRenderIds,
      dispatchPolicy: {
        ...dispatchPolicyPayload,
        applied: selectedJobs.policyApplied,
        byProject: selectedJobs.byProject,
        activeByProject: selectedJobs.activeByProject,
        totalByProject: selectedJobs.totalByProject,
      },
    });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodRenderDispatchRoutes,
};
