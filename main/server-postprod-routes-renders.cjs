const os = require('os');

function readSafeCommonConfig(readCommonServerConfigFile, commonServerFile) {
  if (typeof readCommonServerConfigFile !== 'function') return {};
  try {
    const parsed = readCommonServerConfigFile(commonServerFile);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeStationChoice(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return 'local';
  const low = raw.toLowerCase();
  if (low === 'auto') return 'auto';
  if (low === 'local') return 'local';
  return raw;
}

function resolveLocalStationInfo(readCommonServerConfigFile, commonServerFile) {
  const common = readSafeCommonConfig(readCommonServerConfigFile, commonServerFile);
  const ip = String(common?.localIp || common?.hostIp || '127.0.0.1').trim() || '127.0.0.1';
  const name =
    String(common?.hostName || common?.stationName || '').trim()
    || String(common?.machineName || '').trim()
    || String(common?.machine || '').trim()
    || os.hostname()
    || ip;
  return { ip, name };
}

function resolveAgentPort(readCommonServerConfigFile, commonServerFile) {
  const common = readSafeCommonConfig(readCommonServerConfigFile, commonServerFile);
  const n = Number(common?.agentPort);
  if (Number.isFinite(n) && n > 0 && n <= 65535) return Math.trunc(n);
  return 4000;
}

async function handlePostprodRendersRoutes({
  req,
  res,
  pathname = '',
  url,
  parseBody,
  sendJSON,
  requireSession,
  rolePermissions,
  rolesCache,
  parseBooleanFlag,
  importDetectedRenderOutputs,
  resolveRenderDetectedRoots,
  stmts,
  buildRenderJobPayload,
  shouldExposeDetectedRender,
  sanitizeRenderTemplateName,
  sanitizeRenderProjectName,
  ensureProjectCanAutoRender,
  sharedStore,
  normalizeRenderPayload,
  requireRenderLaunchForProject,
  nowIso,
  sanitizeRenderComment,
  audit,
  db,
  selectBestStation = null,
  sendJobToStation = null,
  readCommonServerConfigFile = null,
  commonServerFile = '',
}) {
  if (pathname === '/agent/postprod/renders' || pathname === '/agent/postprod/render-jobs') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);

    if (req.method === 'GET') {
      const scanRequested = parseBooleanFlag(url?.searchParams?.get('scan'), false);
      const detectedScan = importDetectedRenderOutputs({
        actorUserId: auth.session.user_id,
        force: scanRequested,
      });
      const currentDetectedRoots = resolveRenderDetectedRoots();
      const renders = stmts.listRenderJobs.all()
        .map(buildRenderJobPayload)
        .filter((render) => {
          if (String(render?.origin || '').trim().toLowerCase() !== 'detected') return true;
          const payload = render?.payload && typeof render.payload === 'object' && !Array.isArray(render.payload)
            ? render.payload
            : {};
          return shouldExposeDetectedRender(payload, currentDetectedRoots);
        });
      sendJSON(res, 200, {
        ok: true,
        renders,
        renderJobs: renders,
        detectedScan,
      });
      return true;
    }

    if (req.method === 'POST') {
      if (actorPerms.canLaunchRenders !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden' });
        return true;
      }

      const body = await parseBody(req);
      const templateName = sanitizeRenderTemplateName(body?.templateName, '');
      const projectName = sanitizeRenderProjectName(body?.projectName);
      const requestedStation = normalizeStationChoice(
        body?.render_station ?? body?.renderStation ?? ''
      );
      const requestedStationName = String(
        body?.render_station_name ?? body?.renderStationName ?? ''
      ).trim();
      const projectEligibility = ensureProjectCanAutoRender(sharedStore, projectName, stmts);
      const requiresValidation = body?.requiresValidation === true;
      const normalizedPayload = normalizeRenderPayload(body?.payload);
      if (!templateName) {
        sendJSON(res, 400, { ok: false, error: 'missing_render_template_name' });
        return true;
      }
      if (!projectEligibility.ok) {
        sendJSON(res, 400, {
          ok: false,
          error: projectEligibility.error || 'invalid_project',
          project: projectEligibility.project || null,
          usageMode: String(projectEligibility.usageMode || ''),
        });
        return true;
      }
      if (!requireRenderLaunchForProject(
        auth,
        res,
        sendJSON,
        projectEligibility?.project?.id || projectName
      )) return true;
      if (!normalizedPayload.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedPayload.error || 'invalid_render_payload' });
        return true;
      }

      const now = nowIso();
      const initialStatus = 'Queued';
      const initialReviewStatus = 'to_validate';

      // scheduled_at validation
      let scheduledAt = null;
      const rawScheduledAt = body?.scheduledAt ?? null;
      if (rawScheduledAt !== null && rawScheduledAt !== undefined && rawScheduledAt !== '') {
        const d = new Date(rawScheduledAt);
        if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
          scheduledAt = d.toISOString();
        }
      }
      const queueOrder = Number.isFinite(Number(body?.queueOrder)) ? Math.trunc(Number(body.queueOrder)) : 0;
      const payloadObject = (() => {
        try { return JSON.parse(normalizedPayload.payloadJson || '{}'); } catch { return {}; }
      })();

      const result = stmts.insertRenderJob.run(
        projectName,
        templateName,
        normalizedPayload.payloadJson,
        initialStatus,
        initialReviewStatus,
        Number(auth.session.user_id),
        null,
        requiresValidation ? 1 : 0,
        '',
        '',
        null,
        null,
        scheduledAt,
        queueOrder,
        now,
        now
      );
      const renderId = Number(result?.lastInsertRowid || 0);
      const comment = sanitizeRenderComment(body?.comment);
      stmts.insertRenderJobEvent.run(
        renderId,
        'Created',
        initialStatus,
        Number(auth.session.user_id),
        comment,
        now
      );

      const localStation = resolveLocalStationInfo(readCommonServerConfigFile, commonServerFile);
      const agentPort = resolveAgentPort(readCommonServerConfigFile, commonServerFile);
      let finalRenderStation = 'local';
      let finalRenderStationName = localStation.name;
      let finalStationStatus = '';
      let finalRemoteJobId = null;
      let remoteDispatch = null;

      const pushToRemoteStation = async (targetIp, targetName) => {
        if (typeof sendJobToStation !== 'function') {
          return {
            ok: false,
            error: 'remote_dispatch_unavailable',
            stationStatus: 'station_unreachable',
            jobId: null,
          };
        }
        const remotePayload = {
          originStationIp: localStation.ip,
          originStationName: localStation.name,
          remoteJobId: renderId,
          templateName,
          projectName,
          payload: payloadObject,
          scheduledAt,
          renderStation: String(targetIp || '').trim(),
          renderStationName: String(targetName || '').trim(),
        };
        return await sendJobToStation(targetIp, agentPort, remotePayload);
      };

      if (requestedStation === 'auto') {
        let selectedStation = null;
        if (typeof selectBestStation === 'function') {
          selectedStation = await selectBestStation(localStation.ip, agentPort);
        }
        if (selectedStation && String(selectedStation.ip || '').trim()) {
          const targetIp = String(selectedStation.ip || '').trim();
          const targetName = String(selectedStation.stationName || targetIp).trim() || targetIp;
          const remoteResult = await pushToRemoteStation(targetIp, targetName);
          if (remoteResult?.ok) {
            finalRenderStation = targetIp;
            finalRenderStationName = targetName;
            finalStationStatus = String(remoteResult.stationStatus || 'queued_remote').trim();
            finalRemoteJobId = Number.isFinite(Number(remoteResult.jobId)) && Number(remoteResult.jobId) > 0
              ? Math.trunc(Number(remoteResult.jobId))
              : null;
            remoteDispatch = {
              mode: 'auto',
              stationIp: finalRenderStation,
              stationName: finalRenderStationName,
              ok: true,
            };
          } else {
            finalRenderStation = 'local';
            finalRenderStationName = localStation.name;
            finalStationStatus = '';
            remoteDispatch = {
              mode: 'auto',
              stationIp: targetIp,
              stationName: targetName,
              ok: false,
              error: String(remoteResult?.error || 'station_unreachable'),
              fallback: 'local',
            };
          }
        }
      } else if (requestedStation !== 'local') {
        const targetIp = String(requestedStation || '').trim();
        const targetName = String(requestedStationName || targetIp).trim() || targetIp;
        const remoteResult = await pushToRemoteStation(targetIp, targetName);
        if (remoteResult?.ok) {
          finalRenderStation = targetIp;
          finalRenderStationName = targetName;
          finalStationStatus = String(remoteResult.stationStatus || 'queued_remote').trim();
          finalRemoteJobId = Number.isFinite(Number(remoteResult.jobId)) && Number(remoteResult.jobId) > 0
            ? Math.trunc(Number(remoteResult.jobId))
            : null;
          remoteDispatch = {
            mode: 'manual',
            stationIp: finalRenderStation,
            stationName: finalRenderStationName,
            ok: true,
          };
        } else {
          finalRenderStation = targetIp;
          finalRenderStationName = targetName;
          finalStationStatus = 'station_unreachable';
          remoteDispatch = {
            mode: 'manual',
            stationIp: targetIp,
            stationName: targetName,
            ok: false,
            error: String(remoteResult?.error || 'station_unreachable'),
          };
          stmts.updateRenderJobTransition.run(
            'Queued',
            'to_validate',
            null,
            '',
            'station_unreachable',
            null,
            null,
            now,
            renderId
          );
          stmts.insertRenderJobEvent.run(
            renderId,
            'Queued',
            'Queued',
            Number(auth.session.user_id),
            'station_unreachable',
            now
          );
        }
      }

      stmts.updateRenderJobRemoteOrigin.run(
        localStation.ip,
        localStation.name,
        finalRemoteJobId,
        finalRenderStation,
        finalRenderStationName,
        finalStationStatus,
        now,
        renderId
      );

      const created = stmts.findRenderJobById.get(renderId);
      audit(
        auth.session.user_id,
        'render_created',
        {
          renderId,
          projectName,
          projectUsageMode: String(projectEligibility.usageMode || ''),
          templateName,
          status: initialStatus,
          requiresValidation,
          renderStation: finalRenderStation,
          renderStationName: finalRenderStationName,
          stationStatus: finalStationStatus,
          remoteDispatch,
        },
        'render',
        String(renderId)
      );
      const renderPayload = buildRenderJobPayload(created);
      sendJSON(res, 201, {
        ok: true,
        render: renderPayload,
        renderJob: renderPayload,
        remoteDispatch,
      });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  if (pathname === '/agent/postprod/renders/detected/scan') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    if (actorPerms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_dispatch' });
      return true;
    }
    const body = await parseBody(req);
    const summary = importDetectedRenderOutputs({
      actorUserId: auth.session.user_id,
      force: parseBooleanFlag(body?.force, true),
    });
    sendJSON(res, 200, { ok: true, detectedScan: summary });
    return true;
  }

  const renderByIdMatch = /^\/agent\/postprod\/(?:renders|render-jobs)\/(\d+)$/.exec(pathname);
  if (renderByIdMatch) {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const renderId = Number(renderByIdMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const render = stmts.findRenderJobById.get(renderId);
    if (!render) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }

    if (req.method === 'DELETE') {
      const actorPerms = rolePermissions(auth.session.role, rolesCache);
      if (actorPerms.canLaunchRenders !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_render_transition' });
        return true;
      }
      if (String(render.status || '') === 'Running') {
        sendJSON(res, 409, { ok: false, error: 'render_running_cannot_delete' });
        return true;
      }
      const deleted = stmts.deleteRenderJobById.run(renderId);
      if (Number(deleted?.changes || 0) <= 0) {
        sendJSON(res, 404, { ok: false, error: 'render_not_found' });
        return true;
      }
      audit(
        auth.session.user_id,
        'render_deleted',
        {
          renderId,
          projectName: String(render?.project_name || ''),
          templateName: String(render?.template_name || ''),
          status: String(render?.status || ''),
          reviewStatus: String(render?.review_status || ''),
        },
        'render',
        String(renderId)
      );
      sendJSON(res, 200, { ok: true, renderId });
      return true;
    }

    const payload = buildRenderJobPayload(render);
    sendJSON(res, 200, { ok: true, render: payload, renderJob: payload });
    return true;
  }

  const scheduleMatch = /^\/agent\/postprod\/(?:renders|render-jobs)\/(\d+)\/schedule$/.exec(pathname);
  if (scheduleMatch) {
    if (req.method !== 'PUT') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const renderId = Number(scheduleMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const render = stmts.findRenderJobById.get(renderId);
    if (!render) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    if (String(render.status || '') !== 'Queued') {
      sendJSON(res, 400, { ok: false, error: 'render_already_started' });
      return true;
    }
    const body = await parseBody(req);
    const rawScheduledAt = body?.scheduledAt ?? null;
    let scheduledAt = null;
    if (rawScheduledAt !== null && rawScheduledAt !== undefined && rawScheduledAt !== '') {
      const d = new Date(rawScheduledAt);
      if (isNaN(d.getTime())) {
        sendJSON(res, 400, { ok: false, error: 'invalid_scheduled_at' });
        return true;
      }
      if (d.getTime() <= Date.now()) {
        sendJSON(res, 400, { ok: false, error: 'scheduled_at_must_be_future' });
        return true;
      }
      scheduledAt = d.toISOString();
    }
    const now = nowIso();
    stmts.updateRenderJobSchedule.run(scheduledAt, now, renderId);
    const updated = stmts.findRenderJobById.get(renderId);
    const payload = buildRenderJobPayload(updated);
    sendJSON(res, 200, { ok: true, render: payload, renderJob: payload });
    return true;
  }

  if (pathname === '/agent/postprod/renders/reorder' || pathname === '/agent/postprod/render-jobs/reorder') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const body = await parseBody(req);
    const order = Array.isArray(body?.order) ? body.order : [];
    if (order.length === 0) {
      sendJSON(res, 400, { ok: false, error: 'order_required' });
      return true;
    }
    // Valider que tous les ids existent et sont 'Queued'
    const now = nowIso();
    for (const entry of order) {
      const id = Number(entry?.id || 0);
      if (!Number.isFinite(id) || id <= 0) {
        sendJSON(res, 400, { ok: false, error: 'invalid_render_id', detail: entry?.id });
        return true;
      }
      const row = stmts.findRenderJobById.get(id);
      if (!row) {
        sendJSON(res, 404, { ok: false, error: 'render_not_found', detail: id });
        return true;
      }
      if (String(row.status || '') !== 'Queued') {
        sendJSON(res, 400, { ok: false, error: 'render_already_started', detail: id });
        return true;
      }
    }
    const tx = db.transaction(() => {
      for (const entry of order) {
        const id = Number(entry.id);
        const queueOrder = Number.isFinite(Number(entry?.queueOrder)) ? Math.trunc(Number(entry.queueOrder)) : 0;
        stmts.updateRenderJobQueueOrder.run(queueOrder, now, id);
      }
    });
    tx();
    sendJSON(res, 200, { ok: true, updated: order.length });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodRendersRoutes,
};
