'use strict';

const { loadProjects } = require('./server-projects.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Vérifie si un projet quelconque est actuellement verrouillé (Unreal ouvert). */
function isAnyProjectEditing() {
  try {
    const pj = loadProjects();
    const projects = Array.isArray(pj.projects) ? pj.projects : [];
    return projects.some(p => p && Boolean(String(p.lockedByHostIp || '').trim()));
  } catch {
    return false;
  }
}

/**
 * Notifie la machine origine d'un changement de statut de son job.
 * Fire-and-forget avec timeout 3000 ms.
 */
async function notifyOriginStation({
  originStationIp,
  agentPort,
  body,
  logLine,
}) {
  const ip   = String(originStationIp || '').trim();
  const port = Number(agentPort) || 4000;
  if (!ip) return;

  const url = `http://${ip}:${port}/agent/postprod/remote/job-status-update`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl.signal,
    });
    logLine({
      level: 'info',
      src: 'postprod-remote',
      action: 'notify_origin_ok',
      message: `Notification envoyée à ${ip}:${port}`,
    });
  } catch (e) {
    logLine({
      level: 'info',
      src: 'postprod-remote',
      action: 'notify_origin_fail',
      message: `Notification à ${ip}:${port} échouée : ${String(e?.message || e).slice(0, 120)}`,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

async function handlePostprodRemoteJobRoutes({
  req,
  res,
  url,
  pathname = '',
  parseBody,
  sendJSON,
  stmts,
  buildRenderJobPayload,
  ensureProjectCanAutoRender,
  sanitizeRenderTemplateName,
  sanitizeRenderProjectName,
  normalizeRenderPayload,
  nowIso,
  sharedStore,
  stationIp = '',
  stationName = '',
  agentPort = 4000,
  logLine = () => {},
  notifyJobStatusUpdate,
}) {
  const routePath = String(pathname || url?.pathname || '').trim();
  if (!routePath.startsWith('/agent/postprod/remote/')) {
    return false;
  }
  if (!stmts || typeof stmts !== 'object') {
    sendJSON(res, 503, { ok: false, error: 'postprod_unavailable' });
    return true;
  }

  // -------------------------------------------------------------------------
  // GET /agent/postprod/remote/queue-length
  // -------------------------------------------------------------------------
  if (routePath === '/agent/postprod/remote/queue-length') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }

    let queueLength = 0;
    try {
      const row = stmts.countActiveRenderJobs.get();
      queueLength = Number(row?.n || 0);
    } catch {
      queueLength = 0;
    }

    const isEditing = isAnyProjectEditing();

    sendJSON(res, 200, {
      ok: true,
      queueLength,
      isEditing,
      stationName: String(stationName || ''),
      stationIp: String(stationIp || ''),
    });
    return true;
  }

  // -------------------------------------------------------------------------
  // GET /agent/postprod/remote/jobs
  // -------------------------------------------------------------------------
  if (routePath === '/agent/postprod/remote/jobs') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }

    let jobs = [];
    try {
      const rows = stmts.listAllRenderJobsForExport.all();
      jobs = Array.isArray(rows) ? rows.map(buildRenderJobPayload) : [];
    } catch {
      jobs = [];
    }

    sendJSON(res, 200, {
      ok: true,
      jobs,
      stationIp: String(stationIp || ''),
      stationName: String(stationName || ''),
    });
    return true;
  }

  // -------------------------------------------------------------------------
  // POST /agent/postprod/remote/receive-job
  // -------------------------------------------------------------------------
  if (routePath === '/agent/postprod/remote/receive-job') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    if (
      typeof sanitizeRenderTemplateName !== 'function'
      || typeof sanitizeRenderProjectName !== 'function'
      || typeof normalizeRenderPayload !== 'function'
      || typeof ensureProjectCanAutoRender !== 'function'
      || typeof nowIso !== 'function'
    ) {
      sendJSON(res, 503, { ok: false, error: 'postprod_unavailable' });
      return true;
    }

    const body = await parseBody(req);

    const originStationIp   = String(body?.originStationIp   || '').trim();
    const originStationName = String(body?.originStationName || '').trim();
    const remoteJobIdRaw    = Number(body?.remoteJobId || 0);
    const remoteJobId       = Number.isFinite(remoteJobIdRaw) && remoteJobIdRaw > 0
      ? Math.trunc(remoteJobIdRaw)
      : null;
    const templateName      = sanitizeRenderTemplateName(body?.templateName, '');
    const projectName       = sanitizeRenderProjectName(body?.projectName);
    const renderStation     = String(body?.renderStation     || 'local').trim();
    const renderStationName = String(body?.renderStationName || '').trim();

    // Validation des champs obligatoires
    if (!originStationIp) {
      sendJSON(res, 400, { ok: false, error: 'missing_origin_station_ip' });
      return true;
    }
    if (!templateName) {
      sendJSON(res, 400, { ok: false, error: 'missing_render_template_name' });
      return true;
    }
    if (!projectName) {
      sendJSON(res, 400, { ok: false, error: 'missing_project_name' });
      return true;
    }

    // Vérification que le projet peut rendre
    const projectEligibility = ensureProjectCanAutoRender(sharedStore, projectName, stmts);
    if (!projectEligibility.ok) {
      sendJSON(res, 400, {
        ok: false,
        error: projectEligibility.error || 'invalid_project',
        project: projectEligibility.project || null,
        usageMode: String(projectEligibility.usageMode || ''),
      });
      return true;
    }

    // scheduled_at optionnel
    let scheduledAt = null;
    const rawScheduledAt = body?.scheduledAt ?? null;
    if (rawScheduledAt !== null && rawScheduledAt !== undefined && rawScheduledAt !== '') {
      const d = new Date(rawScheduledAt);
      if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
        scheduledAt = d.toISOString();
      }
    }

    const normalizedPayload = normalizeRenderPayload(body?.payload);
    const payloadJson = normalizedPayload.ok ? normalizedPayload.payloadJson : '{}';

    const now = nowIso();
    const isEditing = isAnyProjectEditing();
    const stationStatus = isEditing ? 'waiting_station' : '';

    // Insertion du job
    const result = stmts.insertRenderJob.run(
      projectName,
      templateName,
      payloadJson,
      'Queued',
      'to_validate',
      null,   // requested_by_user_id (origine externe)
      null,   // validated_by_user_id
      0,      // requires_validation
      '',     // output_path
      '',     // error_message
      null,   // started_at
      null,   // finished_at
      scheduledAt,
      0,      // queue_order
      now,
      now
    );

    const jobId = Number(result?.lastInsertRowid || 0);

    if (jobId > 0) {
      // Renseigner les champs d'origine en UPDATE (colonnes ajoutées en v40)
      stmts.updateRenderJobRemoteOrigin.run(
        originStationIp,
        originStationName,
        remoteJobId,
        renderStation,
        renderStationName,
        stationStatus,
        now,
        jobId
      );
    }

    logLine({
      level: 'info',
      src: 'postprod-remote',
      action: 'receive_job',
      message: `Job reçu de ${originStationIp} (remoteId=${remoteJobId ?? 'n/a'}) → localId=${jobId} projet=${projectName} template=${templateName} stationStatus=${stationStatus || 'ok'}`,
    });

    // Si la station est occupée, notifier la machine origine
    if (isEditing && jobId > 0 && originStationIp) {
      if (typeof notifyJobStatusUpdate === 'function') {
        notifyJobStatusUpdate(originStationIp, agentPort, {
          remoteJobId,
          originStationIp: stationIp,
          status: 'Queued',
          stationStatus: 'waiting_station',
          outputPath: '',
          errorMessage: '',
        }).catch(() => {});
      } else {
        notifyOriginStation({
          originStationIp,
          agentPort,
          body: {
            remoteJobId,
            originStationIp: stationIp,
            status: 'Queued',
            stationStatus: 'waiting_station',
            outputPath: '',
            errorMessage: '',
          },
          logLine,
        }).catch(() => {});
      }
    }

    sendJSON(res, 201, {
      ok: true,
      jobId,
      stationStatus,
    });
    return true;
  }

  // -------------------------------------------------------------------------
  // POST /agent/postprod/remote/job-status-update
  // -------------------------------------------------------------------------
  if (routePath === '/agent/postprod/remote/job-status-update') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }

    const body = await parseBody(req);

    const remoteJobIdRaw  = Number(body?.remoteJobId || 0);
    const remoteJobId     = Number.isFinite(remoteJobIdRaw) && remoteJobIdRaw > 0
      ? Math.trunc(remoteJobIdRaw)
      : null;
    const originStationIp = String(body?.originStationIp || '').trim();
    const statusRaw       = String(body?.status || '').trim().toLowerCase();
    const statusMap = {
      queued: 'Queued',
      running: 'Running',
      done: 'Done',
      failed: 'Failed',
      canceled: 'Canceled',
      cancelled: 'Canceled',
    };
    const status          = String(statusMap[statusRaw] || '').trim();
    const stationStatus   = String(body?.stationStatus || '').trim();
    const outputPath      = String(body?.outputPath   || '').trim();
    const errorMessage    = String(body?.errorMessage || '').trim();

    if (!remoteJobId || !originStationIp) {
      sendJSON(res, 400, { ok: false, error: 'missing_remote_job_id_or_origin_ip' });
      return true;
    }

    const now = nowIso();

    // Retrouver le job local correspondant
    let localJob = null;
    try {
      localJob = stmts.findRenderJobByRemoteId.get(originStationIp, remoteJobId);
    } catch {
      localJob = null;
    }

    if (!localJob) {
      logLine({
        level: 'info',
        src: 'postprod-remote',
        action: 'job_status_update_not_found',
        message: `job-status-update: job introuvable pour originIp=${originStationIp} remoteId=${remoteJobId}`,
      });
      sendJSON(res, 200, { ok: true, found: false });
      return true;
    }

    const localJobId = Number(localJob.id);
    const currentStatus = String(localJob?.status || '').trim() || 'Queued';
    const currentReviewStatus = String(localJob?.review_status || 'to_validate').trim() || 'to_validate';
    const currentOutputPath = String(localJob?.output_path || '').trim();
    const currentErrorMessage = String(localJob?.error_message || '').trim();
    const currentStartedAt = localJob?.started_at ? String(localJob.started_at) : null;
    const currentFinishedAt = localJob?.finished_at ? String(localJob.finished_at) : null;

    // Mettre à jour station_status
    if (stationStatus !== undefined && stationStatus !== null) {
      stmts.updateRenderJobStationStatus.run(stationStatus, now, localJobId);
    }

    const nextOutputPath = outputPath || currentOutputPath;
    const nextErrorMessage = errorMessage || currentErrorMessage;
    let nextStartedAt = currentStartedAt;
    let nextFinishedAt = currentFinishedAt;
    if (status === 'Running' && !nextStartedAt) nextStartedAt = now;
    if ((status === 'Done' || status === 'Failed' || status === 'Canceled') && !nextFinishedAt) {
      nextFinishedAt = now;
    }

    if (status) {
      const shouldUpdateTransition =
        status !== currentStatus
        || nextOutputPath !== currentOutputPath
        || nextErrorMessage !== currentErrorMessage
        || nextStartedAt !== currentStartedAt
        || nextFinishedAt !== currentFinishedAt;
      if (shouldUpdateTransition) {
        stmts.updateRenderJobTransition.run(
          status,
          currentReviewStatus,
          localJob?.validated_by_user_id ?? null,
          nextOutputPath,
          nextErrorMessage,
          nextStartedAt,
          nextFinishedAt,
          now,
          localJobId
        );
        stmts.insertRenderJobEvent.run(
          localJobId,
          currentStatus,
          status,
          null,
          `remote_status_update${stationStatus ? `:${stationStatus}` : ''}`,
          now
        );
      }
    } else if (outputPath && outputPath !== currentOutputPath) {
      // Fallback: aucun status recu mais output_path mis a jour.
      stmts.updateRenderJobOutputPath.run(outputPath, now, localJobId);
    }

    logLine({
      level: 'info',
      src: 'postprod-remote',
      action: 'job_status_update',
      message: `job-status-update: localId=${localJobId} originIp=${originStationIp} remoteId=${remoteJobId} status=${status || '?'} stationStatus=${stationStatus || ''} outputPath=${outputPath || ''}`,
    });

    sendJSON(res, 200, { ok: true, found: true, localJobId });
    return true;
  }

  return false;
}

module.exports = { handlePostprodRemoteJobRoutes };
