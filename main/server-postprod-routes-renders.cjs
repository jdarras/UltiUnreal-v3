const fs = require('fs');
const os = require('os');
const path = require('path');
const { isOwnedRenderJobFolder } = require('./render-job-folder.cjs');

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

function normalizePathList(input = null) {
  const rawList = Array.isArray(input)
    ? input
    : (typeof input === 'string' ? input.split(/[;\r\n]+/g) : []);
  const out = [];
  const seen = new Set();
  for (const item of rawList) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    let abs = raw;
    try {
      abs = path.resolve(raw);
    } catch {}
    const key = String(abs || '').replace(/[\\/]+/g, '/').replace(/\/+$/g, '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(abs);
  }
  return out;
}

function normalizeExportDestinationIds(value = []) {
  const source = Array.isArray(value) ? value : [value];
  const out = [];
  const seen = new Set();
  for (const item of source) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    for (const chunk of raw.split(',')) {
      const id = String(chunk || '').trim().toLowerCase();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function resolveConfiguredRenderRoots(readCommonServerConfigFile, commonServerFile, resolveRenderDetectedRoots) {
  const common = readSafeCommonConfig(readCommonServerConfigFile, commonServerFile);
  const fromList = Array.isArray(common?.render_output_dirs)
    ? common.render_output_dirs
    : (Array.isArray(common?.renderOutputDirs) ? common.renderOutputDirs : []);
  const fromSingle = String(
    common?.render_output_dir ??
    common?.renderOutputDir ??
    ''
  ).trim();
  const configured = [
    ...normalizePathList(fromList),
    ...normalizePathList(fromSingle),
  ];
  const detectedRoots = normalizePathList(
    typeof resolveRenderDetectedRoots === 'function'
      ? resolveRenderDetectedRoots()
      : []
  );
  return normalizePathList([...configured, ...detectedRoots]);
}

function resolveAbsPathSafe(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return path.resolve(raw);
  } catch {
    return raw;
  }
}

function normalizeAbsPathKey(value) {
  return String(value || '').replace(/[\\/]+/g, '/').replace(/\/+$/g, '').toLowerCase();
}

function isPathUnderRoot(pathValue, rootValue) {
  const absPath = resolveAbsPathSafe(pathValue);
  const absRoot = resolveAbsPathSafe(rootValue);
  const pathKey = normalizeAbsPathKey(absPath);
  const rootKey = normalizeAbsPathKey(absRoot);
  if (!pathKey || !rootKey) return false;
  if (pathKey === rootKey) return true;
  return pathKey.startsWith(`${rootKey}/`);
}

function parseRenderRowPayload(renderRow) {
  try {
    const parsed = JSON.parse(String(renderRow?.payload_json || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function collectAbsPaths(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    const abs = resolveAbsPathSafe(raw);
    const key = normalizeAbsPathKey(abs);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(abs);
  }
  return out;
}

// Fichiers produits par le rendu : seuls candidats à la suppression.
function collectRenderCleanupCandidates(renderRow) {
  const payload = parseRenderRowPayload(renderRow);
  return collectAbsPaths([
    renderRow?.output_path,
    payload?.outputPath,
    payload?.output_path,
    payload?.proxyPath,
    payload?.alphaPath,
    payload?.thumbPath,
  ]);
}

// Dossiers de sortie choisis par l'utilisateur : partagés entre rendus, jamais supprimés.
function collectRenderOutputFolders(renderRow) {
  const payload = parseRenderRowPayload(renderRow);
  return collectAbsPaths([payload?.outputDir, payload?.renderOutputDir]);
}

// Chemin réel : jonctions et liens résolus. Pour un chemin inexistant, seul le
// plus long préfixe existant est résolu, le reste est conservé tel quel.
function canonicalPath(value) {
  const abs = resolveAbsPathSafe(value);
  if (!abs) return '';
  let existing = abs;
  const tail = [];
  while (existing && !fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) return abs;
    tail.unshift(path.basename(existing));
    existing = parent;
  }
  try {
    return path.join(fs.realpathSync.native(existing), ...tail);
  } catch {
    return abs;
  }
}

function removeEmptyParentDir(filePath, { allowedRoots, protectedKeys }) {
  const parentDir = path.dirname(filePath);
  const parentKey = normalizeAbsPathKey(parentDir);
  if (!parentKey || protectedKeys.has(parentKey)) return null;
  if (allowedRoots.some((root) => normalizeAbsPathKey(resolveAbsPathSafe(root)) === parentKey)) return null;
  if (!allowedRoots.some((root) => isPathUnderRoot(parentDir, root))) return null;
  try {
    if (fs.readdirSync(parentDir).length > 0) return null;
    fs.rmdirSync(parentDir);
    return parentDir;
  } catch {
    return null;
  }
}

function cleanupRenderArtifacts({
  renderRow = null,
  readCommonServerConfigFile = null,
  commonServerFile = '',
  resolveRenderDetectedRoots = null,
  otherRenderRows = [],
} = {}) {
  const allowedRoots = resolveConfiguredRenderRoots(
    readCommonServerConfigFile,
    commonServerFile,
    resolveRenderDetectedRoots
  );
  const candidates = collectRenderCleanupCandidates(renderRow);
  const otherRows = Array.isArray(otherRenderRows) ? otherRenderRows : [];
  // Toutes les comparaisons portent sur les chemins réels : une jonction placée
  // sous une racine autorisée ne permet pas d'atteindre un fichier extérieur.
  const realRoots = allowedRoots.map(canonicalPath).filter(Boolean);
  const realRootKeys = new Set(realRoots.map(normalizeAbsPathKey));
  const sharedFileKeys = new Set(
    otherRows.flatMap((row) => collectRenderCleanupCandidates(row)).map((p) => normalizeAbsPathKey(canonicalPath(p)))
  );
  const protectedFolderKeys = new Set(
    [renderRow, ...otherRows].flatMap((row) => collectRenderOutputFolders(row)).map((p) => normalizeAbsPathKey(canonicalPath(p)))
  );
  const deleted = [];
  const skipped = [];
  const errors = [];

  for (const candidate of candidates) {
    const absCandidate = resolveAbsPathSafe(candidate);
    if (!normalizeAbsPathKey(absCandidate)) continue;

    if (allowedRoots.length <= 0) {
      skipped.push({ path: absCandidate, reason: 'no_allowed_roots' });
      continue;
    }
    if (!fs.existsSync(absCandidate)) {
      skipped.push({ path: absCandidate, reason: 'not_found' });
      continue;
    }

    try {
      if (!fs.lstatSync(absCandidate).isFile()) {
        skipped.push({ path: absCandidate, reason: 'not_a_file' });
        continue;
      }
      const realCandidate = canonicalPath(absCandidate);
      const realKey = normalizeAbsPathKey(realCandidate);
      if (realRootKeys.has(realKey)) {
        skipped.push({ path: absCandidate, reason: 'refuse_root_delete' });
        continue;
      }
      if (!realRoots.some((root) => isPathUnderRoot(realCandidate, root))) {
        skipped.push({ path: absCandidate, reason: 'outside_allowed_roots' });
        continue;
      }
      if (sharedFileKeys.has(realKey)) {
        skipped.push({ path: absCandidate, reason: 'shared_with_other_render' });
        continue;
      }
      fs.rmSync(realCandidate, { force: true });
      deleted.push({ path: realCandidate, type: 'file' });
      const removedDir = removeEmptyParentDir(realCandidate, { allowedRoots: realRoots, protectedKeys: protectedFolderKeys });
      if (removedDir) deleted.push({ path: removedDir, type: 'dir' });
    } catch (err) {
      errors.push({ path: absCandidate, reason: String(err?.message || err || 'delete_failed') });
    }
  }

  // Sous-dossier exclusif créé par le serveur à l'attribution du rendu
  // (<racine>/<id>_<projet>, voir createOwnedRenderJobFolder) : supprimé en
  // entier seulement s'il porte le marqueur de propriété de CE rendu pour CE
  // chemin, directement sous une racine autorisée, sans lien ni jonction, et
  // qu'aucun autre rendu n'y référence rien.
  const renderId = toPositiveInt(renderRow?.id);
  if (renderId > 0 && realRoots.length > 0) {
    const otherKeys = [
      ...otherRows.flatMap((row) => collectRenderCleanupCandidates(row)),
      ...otherRows.flatMap((row) => collectRenderOutputFolders(row)),
    ].map((p) => normalizeAbsPathKey(canonicalPath(p)));
    const jobFolders = collectAbsPaths([...collectRenderOutputFolders(renderRow), renderRow?.output_path]);
    for (const folder of jobFolders) {
      try {
        if (!fs.existsSync(folder)) continue;
        const stat = fs.lstatSync(folder);
        if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
        const realFolder = canonicalPath(folder);
        const realKey = normalizeAbsPathKey(realFolder);
        // Parent réel = racine autorisée : exclut un dossier atteint via une jonction.
        if (!realRootKeys.has(normalizeAbsPathKey(path.dirname(realFolder)))) continue;
        if (!path.basename(realFolder).startsWith(`${renderId}_`)) continue;
        // Preuve de propriété : marqueur déposé par le serveur à la création (V1).
        if (!isOwnedRenderJobFolder(realFolder, renderId)) continue;
        if (otherKeys.some((key) => key === realKey || key.startsWith(`${realKey}/`))) {
          skipped.push({ path: realFolder, reason: 'job_folder_shared_with_other_render' });
          continue;
        }
        fs.rmSync(realFolder, { recursive: true, force: true });
        deleted.push({ path: realFolder, type: 'dir' });
      } catch (err) {
        errors.push({ path: folder, reason: String(err?.message || err || 'delete_failed') });
      }
    }
  }

  return {
    ok: errors.length <= 0,
    allowedRoots,
    deleted,
    skipped,
    errors,
    deletedCount: deleted.length,
    skippedCount: skipped.length,
    errorCount: errors.length,
  };
}

function parsePayloadObjectSafe(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toPositiveInt(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function normalizeRelaunchMeta(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const changedFields = Array.isArray(source?.changedFields)
    ? source.changedFields
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .slice(0, 24)
    : [];
  const changedFieldCountRaw = Number(source?.changedFieldCount || changedFields.length || 0);
  const changedFieldCount = Number.isFinite(changedFieldCountRaw)
    ? Math.max(0, Math.trunc(changedFieldCountRaw))
    : changedFields.length;
  return {
    changedFieldCount,
    changedFields,
    hasMoreChangedFields: source?.hasMoreChangedFields === true || changedFieldCount > changedFields.length,
    noChanges: source?.noChanges === true || changedFieldCount <= 0,
  };
}

function resolveRenderVersionForTaskId({
  linkedTaskId = 0,
  stmts = null,
} = {}) {
  const taskId = toPositiveInt(linkedTaskId);
  if (taskId <= 0 || typeof stmts?.listRenderJobs?.all !== 'function') return 1;
  let rows = [];
  try {
    rows = stmts.listRenderJobs.all();
  } catch {
    rows = [];
  }
  let count = 0;
  let maxKnownVersion = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const payload = parsePayloadObjectSafe(row?.payload_json);
    const rowTaskId = toPositiveInt(payload?.taskId);
    if (rowTaskId !== taskId) continue;
    count += 1;
    const rowVersion = toPositiveInt(payload?.renderVersion || payload?.render_version || payload?.version);
    if (rowVersion > maxKnownVersion) maxKnownVersion = rowVersion;
  }
  return Math.max(maxKnownVersion, count) + 1;
}

function buildRenderCreationEventComment({
  rawComment = '',
  sourceTag = '',
  renderVersion = 0,
  relaunchMeta = null,
  scheduledAt = null,
} = {}) {
  const explicitComment = String(rawComment || '').trim();
  if (explicitComment) return explicitComment;
  const versionLabel = Number.isFinite(Number(renderVersion)) && Number(renderVersion) > 0
    ? `V${Math.trunc(Number(renderVersion))}`
    : 'V?';
  const normalizedSource = String(sourceTag || '').trim().toLowerCase();
  const hasScheduledAt = !!String(scheduledAt || '').trim();
  if (normalizedSource === 'task_auto_render_relaunch') {
    const meta = normalizeRelaunchMeta(relaunchMeta);
    if (meta.noChanges) {
      return `Rendu relance (${versionLabel}) - aucune modification du formulaire`;
    }
    if (meta.changedFieldCount > 0) {
      const changedFieldsLabel = meta.changedFields.length > 0
        ? `: ${meta.changedFields.join(', ')}${meta.hasMoreChangedFields ? ', ...' : ''}`
        : '';
      return `Rendu relance (${versionLabel}) - ${meta.changedFieldCount} champ(s) modifie(s)${changedFieldsLabel}`;
    }
    return `Rendu relance (${versionLabel})`;
  }
  if (normalizedSource === 'task_auto_render_scheduled' || hasScheduledAt) {
    return `Rendu cree (${versionLabel}) - lancement programme`;
  }
  if (normalizedSource === 'task_auto_render_now') {
    return `Rendu cree (${versionLabel}) - lancement immediat`;
  }
  return `Rendu cree (${versionLabel})`;
}

function buildRenderScheduleEventComment(scheduledAt = null) {
  const scheduledText = String(scheduledAt || '').trim();
  if (scheduledText) {
    return `Lancement programme: ${scheduledText}`;
  }
  return 'Lancement immediat (sans programmation)';
}

function encodeAlertMeta(meta = null) {
  const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  try {
    return JSON.stringify(source);
  } catch {
    return '{}';
  }
}

function upsertOpenUserAlert({
  stmts = null,
  userId = 0,
  alertType = '',
  taskId = 0,
  renderId = 0,
  createdByUserId = 0,
  message = '',
  meta = null,
  now = '',
} = {}) {
  const normalizedUserId = toPositiveInt(userId);
  const normalizedTaskId = toPositiveInt(taskId);
  const normalizedRenderId = toPositiveInt(renderId);
  const normalizedByUserId = toPositiveInt(createdByUserId);
  const normalizedAlertType = String(alertType || '').trim().toLowerCase();
  if (
    normalizedUserId <= 0
    || normalizedAlertType !== 'new_assignment'
    || typeof stmts?.insertOpenUserAlert?.run !== 'function'
  ) {
    return 0;
  }
  const safeMessage = String(message || '').trim().slice(0, 500);
  const metaJson = encodeAlertMeta(meta);
  try {
    const inserted = stmts.insertOpenUserAlert.run(
      normalizedUserId,
      normalizedAlertType,
      normalizedTaskId,
      normalizedRenderId,
      normalizedByUserId,
      safeMessage,
      metaJson,
      now,
      now
    );
    const changes = Number(inserted?.changes || 0);
    if (
      changes <= 0
      && typeof stmts?.touchOpenUserAlertByScope?.run === 'function'
    ) {
      stmts.touchOpenUserAlertByScope.run(
        normalizedByUserId,
        safeMessage,
        metaJson,
        now,
        normalizedUserId,
        normalizedAlertType,
        normalizedTaskId,
        normalizedRenderId
      );
    }
    return changes;
  } catch {
    return 0;
  }
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
  if (pathname === '/agent/postprod/renders/reserve-id' || pathname === '/agent/postprod/render-jobs/reserve-id') {
    if (req.method !== 'POST') {
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
    const now = nowIso();
    const reservedRenderId = db.transaction(() => {
      const reserveRes = stmts.reserveRenderJobId.run(
        '',
        '__reserved__',
        '{}',
        'Reserved',
        'to_validate',
        Number(auth.session.user_id),
        null,
        0,
        '',
        '',
        null,
        null,
        null,
        0,
        now,
        now
      );
      const nextId = Number(reserveRes?.lastInsertRowid || 0);
      if (nextId > 0) {
        stmts.deleteReservedRenderJobById.run(nextId);
      }
      return nextId;
    })();
    if (!Number.isFinite(reservedRenderId) || reservedRenderId <= 0) {
      sendJSON(res, 500, { ok: false, error: 'reserve_render_id_failed' });
      return true;
    }
    sendJSON(res, 200, { ok: true, reservedRenderId: Math.trunc(reservedRenderId) });
    return true;
  }

  if (pathname === '/agent/postprod/renders' || pathname === '/agent/postprod/render-jobs') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);

    if (req.method === 'GET') {
      // Interrogation fréquente d'une station : seuls ses rendus en cours, sans
      // liste complète ni analyse des dossiers de rendus détectés.
      const assignedWorkerKey = String(url?.searchParams?.get('assignedWorker') || '').trim();
      if (assignedWorkerKey && typeof stmts.listRunningRenderJobsByWorkerKey?.all === 'function') {
        const workerRenders = stmts.listRunningRenderJobsByWorkerKey.all(assignedWorkerKey).map(buildRenderJobPayload);
        sendJSON(res, 200, { ok: true, renders: workerRenders });
        return true;
      }
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
      if (!normalizedPayload.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedPayload.error || 'invalid_render_payload' });
        return true;
      }
      const payloadObject = (() => {
        try { return JSON.parse(normalizedPayload.payloadJson || '{}'); } catch { return {}; }
      })();
      const linkedTaskIdRaw = Number(payloadObject?.taskId ?? body?.taskId ?? 0);
      const linkedTaskId = Number.isFinite(linkedTaskIdRaw) && linkedTaskIdRaw > 0
        ? Math.trunc(linkedTaskIdRaw)
        : 0;
      if (linkedTaskId <= 0) {
        sendJSON(res, 400, { ok: false, error: 'missing_linked_task' });
        return true;
      }
      const linkedTask = typeof stmts.findTaskById?.get === 'function'
        ? (stmts.findTaskById.get(linkedTaskId) || null)
        : null;
      if (!linkedTask) {
        sendJSON(res, 400, { ok: false, error: 'task_not_found' });
        return true;
      }
      const actorUserId = toPositiveInt(auth?.session?.user_id);
      const taskAssigneeUserId = toPositiveInt(linkedTask?.assignee_user_id);
      const actorIsLinkedTaskAssignee = (
        actorUserId > 0
        && taskAssigneeUserId > 0
        && actorUserId === taskAssigneeUserId
      );
      if (!actorIsLinkedTaskAssignee && !requireRenderLaunchForProject(
        auth,
        res,
        sendJSON,
        projectEligibility?.project?.id || projectName
      )) return true;

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
      const requestedReservedRenderIdRaw = Number(
        body?.reservedRenderId ?? body?.reserved_render_id ?? body?.renderId ?? 0
      );
      const requestedReservedRenderId = Number.isFinite(requestedReservedRenderIdRaw) && requestedReservedRenderIdRaw > 0
        ? Math.trunc(requestedReservedRenderIdRaw)
        : 0;
      payloadObject.taskId = linkedTaskId;
      if (!String(payloadObject?.taskTitle || '').trim()) {
        payloadObject.taskTitle = String(linkedTask?.title || '').trim();
      }
      if (!String(payloadObject?.taskStatus || '').trim()) {
        payloadObject.taskStatus = String(linkedTask?.status || 'A faire').trim();
      }
      const renderVersion = resolveRenderVersionForTaskId({
        linkedTaskId,
        stmts,
      });
      payloadObject.renderVersion = renderVersion;
      if (!payloadObject.version) payloadObject.version = renderVersion;
      const sourceTag = String(payloadObject?.source || '').trim().toLowerCase();
      const relaunchMeta = normalizeRelaunchMeta(payloadObject?.relaunchMeta);
      let payloadJsonForInsert = '{}';
      try {
        payloadJsonForInsert = JSON.stringify(payloadObject);
      } catch {
        sendJSON(res, 400, { ok: false, error: 'invalid_render_payload' });
        return true;
      }

      let renderId = 0;
      try {
        if (requestedReservedRenderId > 0) {
          const insertWithIdResult = stmts.insertRenderJobWithId.run(
            requestedReservedRenderId,
            projectName,
            templateName,
            payloadJsonForInsert,
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
          if (Number(insertWithIdResult?.changes || 0) <= 0) {
            sendJSON(res, 409, {
              ok: false,
              error: 'reserved_render_id_conflict',
              reservedRenderId: requestedReservedRenderId,
            });
            return true;
          }
          renderId = requestedReservedRenderId;
        } else {
          const result = stmts.insertRenderJob.run(
            projectName,
            templateName,
            payloadJsonForInsert,
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
          renderId = Number(result?.lastInsertRowid || 0);
        }
      } catch (err) {
        const errMessage = String(err?.message || err || '').trim();
        const looksLikeConflict = /constraint|unique|primary key/i.test(errMessage);
        sendJSON(res, requestedReservedRenderId > 0 && looksLikeConflict ? 409 : 500, {
          ok: false,
          error: requestedReservedRenderId > 0 && looksLikeConflict
            ? 'reserved_render_id_conflict'
            : 'render_create_failed',
          message: errMessage || undefined,
          reservedRenderId: requestedReservedRenderId > 0 ? requestedReservedRenderId : undefined,
        });
        return true;
      }
      if (!Number.isFinite(renderId) || renderId <= 0) {
        sendJSON(res, 500, { ok: false, error: 'render_create_failed' });
        return true;
      }
      const taskTitleForAlert = String(linkedTask?.title || '').trim();
      const assigneeUserId = toPositiveInt(linkedTask?.assignee_user_id);
      if (assigneeUserId > 0 && assigneeUserId !== actorUserId) {
        upsertOpenUserAlert({
          stmts,
          userId: assigneeUserId,
          alertType: 'new_assignment',
          taskId: linkedTaskId,
          renderId,
          createdByUserId: actorUserId,
          message: taskTitleForAlert
            ? `Nouveau rendu assigne: ${taskTitleForAlert}`
            : `Nouveau rendu assigne (tache #${String(linkedTaskId)})`,
          meta: {
            taskId: linkedTaskId,
            renderId,
            taskTitle: taskTitleForAlert,
            renderVersion,
            source: sourceTag || '',
          },
          now,
        });
      }
      if (
        actorUserId > 0
        && linkedTaskId > 0
        && typeof stmts?.resolveOpenUserAlertsByUserTaskIdAndType?.run === 'function'
      ) {
        stmts.resolveOpenUserAlertsByUserTaskIdAndType.run(
          now,
          now,
          actorUserId,
          linkedTaskId,
          'new_assignment'
        );
      }
      if (
        sourceTag === 'task_auto_render_relaunch'
        && linkedTaskId > 0
        && typeof stmts?.resolveOpenUserAlertsByTaskIdAndType?.run === 'function'
      ) {
        stmts.resolveOpenUserAlertsByTaskIdAndType.run(now, now, linkedTaskId, 'to_modify');
        stmts.resolveOpenUserAlertsByTaskIdAndType.run(now, now, linkedTaskId, 'render_error');
      }
      const comment = sanitizeRenderComment(buildRenderCreationEventComment({
        rawComment: body?.comment,
        sourceTag,
        renderVersion,
        relaunchMeta,
        scheduledAt,
      }));
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
            'Station de rendu indisponible',
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
          renderVersion,
          projectName,
          projectUsageMode: String(projectEligibility.usageMode || ''),
          templateName,
          status: initialStatus,
          requiresValidation,
          source: sourceTag || '',
          relaunchMeta,
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
      const renderPayload = buildRenderJobPayload(render);
      const linkedTaskIdRaw = Number(
        renderPayload?.linkedTaskId
        || renderPayload?.payload?.taskId
        || 0
      );
      const linkedTaskId = Number.isFinite(linkedTaskIdRaw) && linkedTaskIdRaw > 0
        ? Math.trunc(linkedTaskIdRaw)
        : 0;
      const linkedTaskRow = linkedTaskId > 0 && typeof stmts.findTaskById?.get === 'function'
        ? (stmts.findTaskById.get(linkedTaskId) || null)
        : null;
      const renderRowsById = new Map();
      renderRowsById.set(renderId, render);
      let hasRunningLinkedRender = false;
      let allRenderRows = [];
      if (typeof stmts.listRenderJobs?.all === 'function') {
        try {
          allRenderRows = stmts.listRenderJobs.all();
        } catch {
          allRenderRows = [];
        }
      }
      if (!Array.isArray(allRenderRows)) allRenderRows = [];
      if (linkedTaskId > 0) {
        for (const row of allRenderRows) {
          const rowRenderIdRaw = Number(row?.id || 0);
          const rowRenderId = Number.isFinite(rowRenderIdRaw) && rowRenderIdRaw > 0
            ? Math.trunc(rowRenderIdRaw)
            : 0;
          if (rowRenderId <= 0 || renderRowsById.has(rowRenderId)) continue;
          const rowPayload = buildRenderJobPayload(row);
          const rowTaskIdRaw = Number(
            rowPayload?.linkedTaskId
            || rowPayload?.payload?.taskId
            || 0
          );
          const rowTaskId = Number.isFinite(rowTaskIdRaw) && rowTaskIdRaw > 0
            ? Math.trunc(rowTaskIdRaw)
            : 0;
          if (rowTaskId !== linkedTaskId) continue;
          if (String(row?.status || '') === 'Running') {
            hasRunningLinkedRender = true;
            continue;
          }
          renderRowsById.set(rowRenderId, row);
        }
      }
      if (hasRunningLinkedRender) {
        sendJSON(res, 409, { ok: false, error: 'render_running_cannot_delete' });
        return true;
      }
      const deletionResult = db.transaction(() => {
        let deletedRenderChanges = 0;
        const deletedRenderIds = [];
        for (const [candidateRenderId] of renderRowsById.entries()) {
          const deletedRender = stmts.deleteRenderJobById.run(candidateRenderId);
          const changes = Number(deletedRender?.changes || 0);
          if (changes > 0) {
            deletedRenderChanges += changes;
            deletedRenderIds.push(candidateRenderId);
          }
        }
        let deletedTaskChanges = 0;
        if (
          deletedRenderChanges > 0
          && linkedTaskId > 0
          && typeof stmts.deleteTaskById?.run === 'function'
        ) {
          const deletedTask = stmts.deleteTaskById.run(linkedTaskId);
          deletedTaskChanges = Number(deletedTask?.changes || 0);
        }
        return {
          deletedRenderChanges,
          deletedRenderIds,
          deletedTaskChanges,
        };
      })();
      if (Number(deletionResult?.deletedRenderChanges || 0) <= 0) {
        sendJSON(res, 404, { ok: false, error: 'render_not_found' });
        return true;
      }
      // Nettoyage disque seulement après suppression effective en base,
      // en protégeant les fichiers encore référencés par les autres rendus.
      const otherRenderRows = allRenderRows.filter((row) => {
        const rowIdRaw = Number(row?.id || 0);
        const rowId = Number.isFinite(rowIdRaw) && rowIdRaw > 0 ? Math.trunc(rowIdRaw) : 0;
        return !renderRowsById.has(rowId);
      });
      const deletedRenderIdSet = new Set(Array.isArray(deletionResult?.deletedRenderIds) ? deletionResult.deletedRenderIds : []);
      const cleanupItems = [];
      for (const [candidateRenderId, candidateRenderRow] of renderRowsById.entries()) {
        if (!deletedRenderIdSet.has(candidateRenderId)) continue;
        const cleanup = cleanupRenderArtifacts({
          renderRow: candidateRenderRow,
          readCommonServerConfigFile,
          commonServerFile,
          resolveRenderDetectedRoots,
          otherRenderRows,
        });
        cleanupItems.push({
          renderId: candidateRenderId,
          cleanup,
        });
      }
      const cleanupSummary = cleanupItems.reduce((acc, item) => {
        const cleanup = item?.cleanup || {};
        acc.deletedCount += Number(cleanup?.deletedCount || 0);
        acc.skippedCount += Number(cleanup?.skippedCount || 0);
        acc.errorCount += Number(cleanup?.errorCount || 0);
        return acc;
      }, { deletedCount: 0, skippedCount: 0, errorCount: 0 });
      const deletionNow = nowIso();
      if (typeof stmts?.resolveOpenUserAlertsByRenderId?.run === 'function') {
        for (const deletedRenderId of Array.isArray(deletionResult?.deletedRenderIds) ? deletionResult.deletedRenderIds : []) {
          const normalizedRenderId = toPositiveInt(deletedRenderId);
          if (normalizedRenderId <= 0) continue;
          stmts.resolveOpenUserAlertsByRenderId.run(deletionNow, deletionNow, normalizedRenderId);
        }
      }
      if (
        Number(deletionResult?.deletedTaskChanges || 0) > 0
        && linkedTaskId > 0
        && typeof stmts?.resolveOpenUserAlertsByTaskId?.run === 'function'
      ) {
        stmts.resolveOpenUserAlertsByTaskId.run(deletionNow, deletionNow, linkedTaskId);
      }
      audit(
        auth.session.user_id,
        'render_deleted',
        {
          renderId,
          deletedRenderIds: Array.isArray(deletionResult?.deletedRenderIds) ? deletionResult.deletedRenderIds : [renderId],
          projectName: String(render?.project_name || ''),
          templateName: String(render?.template_name || ''),
          status: String(render?.status || ''),
          reviewStatus: String(render?.review_status || ''),
          cleanup: cleanupSummary,
          linkedTask: {
            id: linkedTaskId > 0 ? linkedTaskId : null,
            deleted: Number(deletionResult?.deletedTaskChanges || 0) > 0,
          },
        },
        'render',
        String(renderId)
      );
      if (Number(deletionResult?.deletedTaskChanges || 0) > 0 && linkedTaskRow) {
        audit(
          auth.session.user_id,
          'task_deleted',
          {
            taskId: linkedTaskId,
            title: String(linkedTaskRow?.title || ''),
            status: String(linkedTaskRow?.status || ''),
            requestType: String(linkedTaskRow?.request_type || ''),
            source: 'render_delete_cascade',
            renderId,
          },
          'task',
          String(linkedTaskId)
        );
      }
      sendJSON(res, 200, {
        ok: true,
        renderId,
        deletedRenderIds: Array.isArray(deletionResult?.deletedRenderIds) ? deletionResult.deletedRenderIds : [renderId],
        cleanup: cleanupSummary,
        deletedLinkedTaskId: Number(deletionResult?.deletedTaskChanges || 0) > 0 ? linkedTaskId : null,
      });
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
    stmts.insertRenderJobEvent.run(
      renderId,
      'Queued',
      'Queued',
      Number(auth.session.user_id),
      buildRenderScheduleEventComment(scheduledAt),
      now
    );
    const updated = stmts.findRenderJobById.get(renderId);
    const payload = buildRenderJobPayload(updated);
    sendJSON(res, 200, { ok: true, render: payload, renderJob: payload });
    return true;
  }

  const exportDestinationsMatch = /^\/agent\/postprod\/(?:renders|render-jobs)\/(\d+)\/export-destinations$/.exec(pathname);
  if (exportDestinationsMatch) {
    if (req.method !== 'PUT') {
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
    const renderId = Number(exportDestinationsMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const currentRender = stmts.findRenderJobById.get(renderId);
    if (!currentRender) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    if (!requireRenderLaunchForProject(
      auth,
      res,
      sendJSON,
      currentRender?.project_name || '',
      { forbiddenError: 'forbidden_project_render_update' }
    )) return true;
    if (!stmts?.updateRenderJobPayload || typeof stmts.updateRenderJobPayload.run !== 'function') {
      sendJSON(res, 503, { ok: false, error: 'postprod_unavailable' });
      return true;
    }

    const body = await parseBody(req);
    const rawDestinationIds = Array.isArray(body?.exportDestinationIds)
      ? body.exportDestinationIds
      : (Array.isArray(body?.destinationIds)
        ? body.destinationIds
        : (body?.exportDestinationIds != null ? [body.exportDestinationIds] : []));
    const exportDestinationIds = normalizeExportDestinationIds(rawDestinationIds);

    let payloadObject = {};
    try {
      payloadObject = JSON.parse(String(currentRender?.payload_json || '{}'));
    } catch {
      payloadObject = {};
    }
    const updatedPayloadObject = {
      ...(payloadObject && typeof payloadObject === 'object' && !Array.isArray(payloadObject) ? payloadObject : {}),
      exportDestinationIds,
    };
    const now = nowIso();
    stmts.updateRenderJobPayload.run(
      JSON.stringify(updatedPayloadObject),
      now,
      renderId
    );
    stmts.insertRenderJobEvent.run(
      renderId,
      String(currentRender?.status || 'Queued'),
      String(currentRender?.status || 'Queued'),
      Number(auth.session.user_id),
      `Destinations de sortie mises a jour (${exportDestinationIds.length})`,
      now
    );
    const updated = stmts.findRenderJobById.get(renderId);
    const payload = buildRenderJobPayload(updated);
    audit(
      auth.session.user_id,
      'render_export_destinations_updated',
      {
        renderId,
        exportDestinationIds,
      },
      'render',
      String(renderId)
    );
    sendJSON(res, 200, {
      ok: true,
      render: payload,
      renderJob: payload,
      exportDestinationIds,
    });
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
  cleanupRenderArtifacts,
};
