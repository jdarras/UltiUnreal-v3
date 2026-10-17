'use strict';

const fs = require('fs');
const path = require('path');
const { isRenderArtifactFileName } = require('./render-artifact-names.cjs');

function createRenderDetectedAutoScanHelpers(deps = {}) {
  const {
    db,
    stmts = {},
    sharedStore = null,
    resolveRenderDetectedRoots = () => [],
    renderDetectedExtensions = new Set(),
    DEFAULT_RENDER_DETECTED_EXTENSIONS = [],
    renderDetectedScanMaxFiles = 500,
    renderDetectedScanIntervalMs = 5000,
    MIN_RENDER_DETECTED_SCAN_INTERVAL_MS = 1000,
    MAX_RENDER_DETECTED_SCAN_INTERVAL_MS = 600000,
    DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS = 5000,
    nowIso = () => new Date().toISOString(),
    logLine = () => {},
    audit = () => {},
    resolveProjectForRender = () => ({ ok: false }),
    sanitizeRenderProjectName = (value) => String(value || '').trim(),
    sanitizeRenderTemplateName = (value, fallback = '') => {
      const text = String(value || '').trim();
      return text || String(fallback || '').trim();
    },
    DEFAULT_RENDER_DETECTED_TEMPLATE_NAME = 'detected',
    buildExpectedRenderTaskMatchCatalog = () => [],
    findExpectedRenderTaskMatch = () => null,
    buildRenderDetectedFileSignature = () => '',
    sanitizeRenderOutputPath = (value) => String(value || '').trim(),
    sanitizeTaskExpectedRenderName = (value) => String(value || '').trim(),
    normalizeTaskExpectedRenderCount = (value, _requestType, fallback = 1) => {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return fallback;
      return Math.trunc(n);
    },
    scheduleProxyGenerationForDoneRender = null,
  } = deps;

  const renderDetectedScanState = {
    lastRunMs: 0,
    lastSummary: null,
    lastWarnFingerprint: '',
    lastExceptionFingerprint: '',
  };
  let renderDetectedAutoScanTimer = null;
  let renderDetectedAutoScanBusy = false;

  function parsePayloadJsonSafe(value) {
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

  function normalizeExpectedNameKey(value = '') {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\.[^/.]+$/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function normalizeDetectedOutputPathKey(value = '') {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/\/+$/g, '')
      .toLowerCase();
  }

  function buildKnownRenderOutputPathKeySet() {
    const out = new Set();
    const rows = Array.isArray(stmts?.listRenderJobs?.all?.())
      ? stmts.listRenderJobs.all()
      : [];
    for (const row of rows) {
      const outputPath = sanitizeRenderOutputPath(
        row?.output_path
        || row?.outputPath
        || ''
      );
      const payload = parsePayloadJsonSafe(row?.payload_json || row?.payloadJson || row?.payload);
      const payloadOutputPath = sanitizeRenderOutputPath(
        payload?.outputPath
        || payload?.output_path
        || payload?.filePath
        || ''
      );
      const directKey = normalizeDetectedOutputPathKey(outputPath);
      const payloadKey = normalizeDetectedOutputPathKey(payloadOutputPath);
      if (directKey) out.add(directKey);
      if (payloadKey) out.add(payloadKey);
    }
    return out;
  }

  function buildActiveRenderCandidateFromRow(row = null) {
    const status = String(row?.status || '').trim();
    if (status !== 'Queued' && status !== 'Running') return null;
    const payload = parsePayloadJsonSafe(row?.payload_json || row?.payloadJson || row?.payload);
    const renderId = toPositiveInt(row?.id);
    if (renderId <= 0) return null;
    return {
      renderId,
      status,
      reviewStatus: String(row?.review_status || '').trim() || 'to_validate',
      validatedByUserId: toPositiveInt(row?.validated_by_user_id) || null,
      startedAt: String(row?.started_at || '').trim() || null,
      expectedName: String(payload?.matchedExpectedRenderName || '').trim(),
      payload,
    };
  }

  function buildActiveTaskRenderCandidatesByTaskId() {
    const out = new Map();
    const rows = Array.isArray(stmts?.listRenderJobs?.all?.())
      ? stmts.listRenderJobs.all()
      : [];
    for (const row of rows) {
      const candidate = buildActiveRenderCandidateFromRow(row);
      if (!candidate) continue;
      const payload = candidate.payload;
      const taskId = toPositiveInt(payload?.taskId);
      if (taskId <= 0) continue;
      const list = out.get(taskId) || [];
      list.push(candidate);
      out.set(taskId, list);
    }
    for (const [taskId, list] of out.entries()) {
      list.sort((a, b) => b.renderId - a.renderId);
      out.set(taskId, list);
    }
    return out;
  }

  function buildActiveRenderCandidatesByOutputPathKey() {
    const out = new Map();
    const rows = Array.isArray(stmts?.listRenderJobs?.all?.())
      ? stmts.listRenderJobs.all()
      : [];
    for (const row of rows) {
      const candidate = buildActiveRenderCandidateFromRow(row);
      if (!candidate) continue;
      const payload = candidate.payload;
      const directPath = sanitizeRenderOutputPath(
        row?.output_path
        || row?.outputPath
        || ''
      );
      const payloadPath = sanitizeRenderOutputPath(
        payload?.outputPath
        || payload?.output_path
        || payload?.filePath
        || ''
      );
      const candidateKeys = [
        normalizeDetectedOutputPathKey(directPath),
        normalizeDetectedOutputPathKey(payloadPath),
      ].filter(Boolean);
      if (candidateKeys.length <= 0) continue;
      for (const key of candidateKeys) {
        const list = out.get(key) || [];
        list.push(candidate);
        out.set(key, list);
      }
    }
    for (const [key, list] of out.entries()) {
      list.sort((a, b) => b.renderId - a.renderId);
      out.set(key, list);
    }
    return out;
  }

  function isRenderDetectedAutoScanBusy() {
    return renderDetectedAutoScanBusy === true;
  }

  function resolveRenderDetectedActorUserId(preferredUserId = null) {
    const direct = Number(preferredUserId || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const preferred = stmts.findRenderDetectionPreferredActor?.get?.();
    const preferredId = Number(preferred?.id || 0);
    if (Number.isFinite(preferredId) && preferredId > 0) return preferredId;
    const fallback = stmts.findRenderDetectionFallbackActor?.get?.();
    const fallbackId = Number(fallback?.id || 0);
    if (Number.isFinite(fallbackId) && fallbackId > 0) return fallbackId;
    return 0;
  }

  function listRenderDetectedFileCandidates(detectedRoots = null) {
    const out = [];
    const allowedExtensions = renderDetectedExtensions instanceof Set
      ? renderDetectedExtensions
      : new Set(DEFAULT_RENDER_DETECTED_EXTENSIONS);
    const roots = Array.isArray(detectedRoots) && detectedRoots.length > 0
      ? detectedRoots
      : resolveRenderDetectedRoots();
    const stack = [];
    for (const root of roots) {
      const absRoot = String(root || '').trim();
      if (!absRoot) continue;
      if (!fs.existsSync(absRoot)) continue;
      stack.push({ sourceDir: absRoot, currentDir: absRoot });
    }
    while (stack.length > 0 && out.length < renderDetectedScanMaxFiles) {
      const next = stack.pop();
      if (!next || !next.currentDir) continue;
      let entries = [];
      try {
        entries = fs.readdirSync(next.currentDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry || !entry.name) continue;
        const absPath = path.join(next.currentDir, entry.name);
        const entryName = String(entry.name || '').trim();
        const entryNameLower = entryName.toLowerCase();
        if (entry.isDirectory()) {
          if (entryNameLower === 'proxy' || entryNameLower === '_proxy') {
            continue;
          }
          stack.push({ sourceDir: next.sourceDir, currentDir: absPath });
          continue;
        }
        if (!entry.isFile()) continue;
        if (isRenderArtifactFileName(entryNameLower)) {
          continue;
        }
        const ext = String(path.extname(entry.name || '') || '').trim().toLowerCase();
        if (allowedExtensions.size > 0 && ext && !allowedExtensions.has(ext)) continue;
        if (allowedExtensions.size > 0 && !ext) continue;
        let stat = null;
        try {
          stat = fs.statSync(absPath);
        } catch {
          stat = null;
        }
        if (!stat || !stat.isFile()) continue;
        const size = Math.max(0, Math.trunc(Number(stat.size) || 0));
        const mtimeIso = Number.isFinite(Number(stat.mtimeMs))
          ? new Date(Number(stat.mtimeMs)).toISOString()
          : nowIso();
        const relPath = (() => {
          try {
            return path.relative(next.sourceDir, absPath);
          } catch {
            return entry.name;
          }
        })();
        const relPathNormalized = String(relPath || entry.name || '').replace(/\\/g, '/').toLowerCase();
        if (
          relPathNormalized.includes('/proxy/')
          || relPathNormalized.includes('/_proxy/')
          || relPathNormalized.endsWith('/thumbnail.jpg')
        ) {
          continue;
        }
        out.push({
          sourceDir: next.sourceDir,
          filePath: absPath,
          relativePath: String(relPath || entry.name || '').replace(/\\/g, '/'),
          fileName: String(entry.name || '').trim(),
          fileExt: ext,
          fileSize: size,
          fileMtimeAt: mtimeIso,
        });
        if (out.length >= renderDetectedScanMaxFiles) break;
      }
    }
    out.sort((a, b) => String(a.fileMtimeAt || '').localeCompare(String(b.fileMtimeAt || '')));
    return out;
  }

  function resolveDetectedRenderProjectName(candidate) {
    const relative = String(candidate?.relativePath || '').replace(/\\/g, '/');
    const firstSegment = relative.split('/').map((item) => String(item || '').trim()).filter(Boolean)[0] || '';
    if (!firstSegment) return '';
    const resolved = resolveProjectForRender(sharedStore, firstSegment, stmts);
    if (resolved?.ok && resolved?.project) {
      const projectRef = String(resolved.project.id || resolved.project.name || firstSegment).trim();
      return sanitizeRenderProjectName(projectRef);
    }
    return sanitizeRenderProjectName(firstSegment);
  }

  function resolveDetectedRenderTemplateName(candidate) {
    const filename = String(candidate?.fileName || '').trim();
    const withoutExt = filename.replace(/\.[^/.]+$/g, '').replace(/\s+/g, ' ').trim();
    return sanitizeRenderTemplateName(withoutExt, DEFAULT_RENDER_DETECTED_TEMPLATE_NAME);
  }

  function importDetectedRenderOutputs({
    actorUserId = null,
    force = false,
  } = {}) {
    const detectedRoots = resolveRenderDetectedRoots();
    const nowMs = Date.now();
    const previous = renderDetectedScanState.lastSummary && typeof renderDetectedScanState.lastSummary === 'object'
      ? renderDetectedScanState.lastSummary
      : null;
    if (!force && (nowMs - Number(renderDetectedScanState.lastRunMs || 0)) < renderDetectedScanIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'interval',
        imported: 0,
        duplicates: 0,
        errors: 0,
        matched: 0,
        unmatched: 0,
        scanned: 0,
        roots: detectedRoots,
        maxFiles: renderDetectedScanMaxFiles,
        scanIntervalMs: renderDetectedScanIntervalMs,
        at: nowIso(),
        previous,
      };
    }
    renderDetectedScanState.lastRunMs = nowMs;
    const effectiveActorUserId = resolveRenderDetectedActorUserId(actorUserId);
    if (!Number.isFinite(effectiveActorUserId) || effectiveActorUserId <= 0) {
      const missingUserSummary = {
        ok: false,
        skipped: true,
        reason: 'missing_actor_user',
        imported: 0,
        duplicates: 0,
        errors: 0,
        matched: 0,
        unmatched: 0,
        scanned: 0,
        roots: detectedRoots,
        maxFiles: renderDetectedScanMaxFiles,
        scanIntervalMs: renderDetectedScanIntervalMs,
        at: nowIso(),
      };
      renderDetectedScanState.lastSummary = missingUserSummary;
      return missingUserSummary;
    }
    const candidates = listRenderDetectedFileCandidates(detectedRoots);
    const knownOutputPathKeys = buildKnownRenderOutputPathKeySet();
    const taskMatchCatalog = buildExpectedRenderTaskMatchCatalog(stmts);
    const activeTaskRenderCandidatesByTaskId = buildActiveTaskRenderCandidatesByTaskId();
    const activeRenderCandidatesByOutputPathKey = buildActiveRenderCandidatesByOutputPathKey();
    const taskDetectedProgressById = new Map();
    const proxyScheduledRenderIds = new Set();
    const tx = db.transaction((payload) => {
      const signature = String(payload.signature || '').trim();
      const exists = stmts.findRenderDetectedFileBySignature.get(signature);
      if (exists) return { duplicate: true, renderId: Number(exists?.render_job_id || 0) };
      const createdAt = String(payload.createdAt || nowIso()).trim() || nowIso();

      if (toPositiveInt(payload.existingRenderId) > 0) {
        const existingRenderId = toPositiveInt(payload.existingRenderId);
        const existingStatus = String(payload.existingRenderStatus || '').trim() || 'Running';
        const existingReviewStatus = String(payload.existingRenderReviewStatus || '').trim() || 'to_validate';
        const existingValidatedByUserId = toPositiveInt(payload.existingValidatedByUserId) || null;
        const existingStartedAt = String(payload.existingStartedAt || '').trim() || null;
        const finishedAt = String(payload.finishedAt || createdAt).trim() || createdAt;

        if (existingStatus !== 'Done' && typeof stmts.updateRenderJobTransition?.run === 'function') {
          stmts.updateRenderJobTransition.run(
            'Done',
            existingReviewStatus,
            existingValidatedByUserId,
            payload.outputPath,
            '',
            existingStartedAt,
            finishedAt,
            createdAt,
            existingRenderId
          );
          if (typeof stmts.clearRenderWorkerCurrentJobByRenderId?.run === 'function') {
            stmts.clearRenderWorkerCurrentJobByRenderId.run(createdAt, existingRenderId);
          }
          if (typeof stmts.insertRenderJobEvent?.run === 'function') {
            stmts.insertRenderJobEvent.run(
              existingRenderId,
              existingStatus,
              'Done',
              payload.actorUserId,
              'detected_output_complete',
              createdAt
            );
          }
        } else if (typeof stmts.updateRenderJobOutputPath?.run === 'function') {
          stmts.updateRenderJobOutputPath.run(payload.outputPath, createdAt, existingRenderId);
        }

        if (typeof stmts.updateRenderJobPayload?.run === 'function') {
          stmts.updateRenderJobPayload.run(payload.renderPayloadJson, createdAt, existingRenderId);
        }

        stmts.insertRenderDetectedFile.run(
          signature,
          payload.sourceDir,
          payload.filePath,
          payload.projectName,
          payload.templateName,
          payload.fileName,
          payload.fileExt,
          payload.fileSize,
          payload.fileMtimeAt,
          existingRenderId,
          payload.matchedTaskId,
          payload.matchedExpectedRenderName,
          'imported',
          '',
          createdAt,
          createdAt
        );
        return { duplicate: false, renderId: existingRenderId, linkedExisting: true };
      }
      const insertRes = stmts.insertRenderJob.run(
        payload.projectName,
        payload.templateName,
        payload.renderPayloadJson,
        'Done',
        'to_validate',
        payload.actorUserId,
        null,
        1,
        payload.outputPath,
        '',
        payload.finishedAt,
        payload.finishedAt,
        null,
        0,
        createdAt,
        createdAt
      );
      const renderId = Number(insertRes?.lastInsertRowid || 0);
      stmts.insertRenderJobEvent.run(
        renderId,
        'Queued',
        'Done',
        payload.actorUserId,
        'detected_output_import',
        createdAt
      );
      stmts.insertRenderDetectedFile.run(
        signature,
        payload.sourceDir,
        payload.filePath,
        payload.projectName,
        payload.templateName,
        payload.fileName,
        payload.fileExt,
        payload.fileSize,
        payload.fileMtimeAt,
        renderId,
        payload.matchedTaskId,
        payload.matchedExpectedRenderName,
        'imported',
        '',
        createdAt,
        createdAt
      );
      return { duplicate: false, renderId };
    });

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    let matched = 0;
    let unmatched = 0;
    let firstErrorMessage = '';
    for (const candidate of candidates) {
      const signature = buildRenderDetectedFileSignature(
        candidate.filePath,
        candidate.fileSize,
        candidate.fileMtimeAt
      );
      const projectName = resolveDetectedRenderProjectName(candidate);
      const templateName = resolveDetectedRenderTemplateName(candidate);
      const filePath = sanitizeRenderOutputPath(candidate.filePath);
      const sourceDir = sanitizeRenderOutputPath(candidate.sourceDir);
      const outputPathKey = normalizeDetectedOutputPathKey(filePath);
      const fileName = String(candidate.fileName || '').trim().slice(0, 260);
      const fileExt = String(candidate.fileExt || '').trim().slice(0, 32).toLowerCase();
      const fileSize = Math.max(0, Math.trunc(Number(candidate.fileSize) || 0));
      const fileMtimeAt = String(candidate.fileMtimeAt || '').trim();
      const taskMatch = findExpectedRenderTaskMatch(taskMatchCatalog, fileName);
      const matchedTaskId = Number(taskMatch?.taskId || 0);
      const hasMatchedTask = Number.isFinite(matchedTaskId) && matchedTaskId > 0;
      const matchedExpectedRenderName = hasMatchedTask
        ? sanitizeTaskExpectedRenderName(taskMatch?.expectedRenderName)
        : '';
      const matchedTaskExpectedRenderCount = hasMatchedTask
        ? normalizeTaskExpectedRenderCount(
          taskMatch?.expectedRenderCount,
          taskMatch?.requestType,
          1
        )
        : 0;
      let matchedTaskDetectedBefore = 0;
      if (hasMatchedTask) {
        if (!taskDetectedProgressById.has(matchedTaskId)) {
          const existingCountRow = stmts.countRenderDetectedFilesByTaskId.get(matchedTaskId);
          const existingCount = Number(existingCountRow?.n || 0);
          taskDetectedProgressById.set(
            matchedTaskId,
            Number.isFinite(existingCount) && existingCount > 0 ? Math.trunc(existingCount) : 0
          );
        }
        matchedTaskDetectedBefore = Number(taskDetectedProgressById.get(matchedTaskId) || 0);
      }
      const payloadObj = {
        source: 'detected_file',
        filePath,
        fileName,
        fileExt,
        fileSize,
        fileMtimeAt,
      };
      if (hasMatchedTask) {
        payloadObj.taskId = matchedTaskId;
        payloadObj.taskTitle = String(taskMatch?.taskTitle || '');
        payloadObj.taskStatus = String(taskMatch?.taskStatus || '');
        payloadObj.matchedExpectedRenderName = matchedExpectedRenderName;
        payloadObj.taskExpectedRenderCount = matchedTaskExpectedRenderCount;
        payloadObj.taskDetectedRenderCount = matchedTaskDetectedBefore + 1;
      }
      let existingRenderCandidate = null;
      if (hasMatchedTask) {
        const candidatesForTask = Array.isArray(activeTaskRenderCandidatesByTaskId.get(matchedTaskId))
          ? activeTaskRenderCandidatesByTaskId.get(matchedTaskId)
          : [];
        if (candidatesForTask.length > 0) {
          const expectedNameKey = normalizeExpectedNameKey(matchedExpectedRenderName);
          if (expectedNameKey) {
            existingRenderCandidate = candidatesForTask.find(
              (entry) => normalizeExpectedNameKey(entry?.expectedName) === expectedNameKey
            ) || null;
          }
          if (!existingRenderCandidate) {
            existingRenderCandidate = candidatesForTask[0];
          }
          if (existingRenderCandidate?.payload && typeof existingRenderCandidate.payload === 'object') {
            payloadObj.source = String(existingRenderCandidate.payload.source || payloadObj.source || '').trim() || payloadObj.source;
            if (!String(payloadObj.taskTitle || '').trim()) {
              payloadObj.taskTitle = String(existingRenderCandidate.payload.taskTitle || taskMatch?.taskTitle || '').trim();
            }
            if (!String(payloadObj.taskStatus || '').trim()) {
              payloadObj.taskStatus = String(existingRenderCandidate.payload.taskStatus || taskMatch?.taskStatus || '').trim();
            }
          }
        }
      }
      if (!existingRenderCandidate && outputPathKey) {
        const candidatesForPath = Array.isArray(activeRenderCandidatesByOutputPathKey.get(outputPathKey))
          ? activeRenderCandidatesByOutputPathKey.get(outputPathKey)
          : [];
        if (candidatesForPath.length > 0) {
          existingRenderCandidate = candidatesForPath[0];
        }
      }
      if (outputPathKey && knownOutputPathKeys.has(outputPathKey) && toPositiveInt(existingRenderCandidate?.renderId) <= 0) {
        duplicates += 1;
        continue;
      }
      let renderPayloadJson = '{}';
      try {
        renderPayloadJson = JSON.stringify(payloadObj);
      } catch {
        renderPayloadJson = '{}';
      }
      try {
        const result = tx({
          signature,
          sourceDir,
          filePath,
          projectName,
          templateName,
          fileName,
          fileExt,
          fileSize,
          fileMtimeAt,
          outputPath: filePath,
          finishedAt: fileMtimeAt || nowIso(),
          actorUserId: effectiveActorUserId,
          createdAt: nowIso(),
          renderPayloadJson,
          existingRenderId: existingRenderCandidate?.renderId || 0,
          existingRenderStatus: existingRenderCandidate?.status || '',
          existingRenderReviewStatus: existingRenderCandidate?.reviewStatus || '',
          existingValidatedByUserId: existingRenderCandidate?.validatedByUserId || null,
          existingStartedAt: existingRenderCandidate?.startedAt || null,
          matchedTaskId: hasMatchedTask ? matchedTaskId : null,
          matchedExpectedRenderName,
        });
        if (result?.duplicate) {
          duplicates += 1;
        } else {
          if (outputPathKey) {
            knownOutputPathKeys.add(outputPathKey);
          }
          imported += 1;
          if (hasMatchedTask) {
            matched += 1;
            taskDetectedProgressById.set(matchedTaskId, matchedTaskDetectedBefore + 1);
          } else {
            unmatched += 1;
          }
          const importedRenderId = toPositiveInt(result?.renderId);
          if (
            importedRenderId > 0
            && typeof scheduleProxyGenerationForDoneRender === 'function'
            && !proxyScheduledRenderIds.has(importedRenderId)
          ) {
            proxyScheduledRenderIds.add(importedRenderId);
            try {
              scheduleProxyGenerationForDoneRender(importedRenderId);
            } catch {}
          }
        }
      } catch (err) {
        const msg = String(err?.message || err);
        if (/unique/i.test(msg)) {
          duplicates += 1;
          continue;
        }
        errors += 1;
        if (!firstErrorMessage) {
          firstErrorMessage = msg;
        }
      }
    }
    if (imported > 0) {
      audit(
        effectiveActorUserId,
        'render_detected_imported',
        {
          imported,
          duplicates,
          errors,
          matched,
          unmatched,
          scanned: candidates.length,
          roots: detectedRoots,
        },
        'render',
        ''
      );
    }
    const summary = {
      ok: true,
      skipped: false,
      reason: '',
      imported,
      duplicates,
      errors,
      matched,
      unmatched,
      scanned: candidates.length,
      firstErrorMessage,
      roots: detectedRoots,
      maxFiles: renderDetectedScanMaxFiles,
      scanIntervalMs: renderDetectedScanIntervalMs,
      at: nowIso(),
    };
    renderDetectedScanState.lastSummary = summary;
    return summary;
  }

  function runRenderDetectedAutoScan({ force = true } = {}) {
    if (renderDetectedAutoScanBusy) return;
    renderDetectedAutoScanBusy = true;
    try {
      const summary = importDetectedRenderOutputs({ force });
      const importedCount = Number(summary?.imported || 0);
      const errorCount = Number(summary?.errors || 0);
      const firstErrorMessage = String(summary?.firstErrorMessage || '').trim();
      if (renderDetectedScanState.lastExceptionFingerprint !== '') {
        renderDetectedScanState.lastExceptionFingerprint = '';
        logLine({ level: 'info', src: 'postprod', action: 'render_detected_auto_scan_recovered', message: 'Scan auto rendus detectes: rétabli' });
      }
      if (errorCount > 0) {
        const warnFingerprint = `${errorCount}|${firstErrorMessage}`;
        const shouldLogWarn = renderDetectedScanState.lastWarnFingerprint !== warnFingerprint;
        if (!shouldLogWarn) return;
        renderDetectedScanState.lastWarnFingerprint = warnFingerprint;
        logLine({
          level: 'warn',
          src: 'postprod',
          action: 'render_detected_auto_scan',
          message: firstErrorMessage
            ? `Scan auto rendus detectes: +${importedCount} / dup ${Number(summary?.duplicates || 0)} / err ${errorCount} (${firstErrorMessage})`
            : `Scan auto rendus detectes: +${importedCount} / dup ${Number(summary?.duplicates || 0)} / err ${errorCount}`,
          data: summary,
        });
        return;
      }
      if (renderDetectedScanState.lastWarnFingerprint !== '') {
        renderDetectedScanState.lastWarnFingerprint = '';
        logLine({ level: 'info', src: 'postprod', action: 'render_detected_auto_scan', message: 'Scan auto rendus detectes: plus d\'erreurs' });
      }
      if (importedCount > 0) {
        logLine({
          level: 'info',
          src: 'postprod',
          action: 'render_detected_auto_scan',
          message: `Scan auto rendus detectes: +${importedCount} / dup ${Number(summary?.duplicates || 0)} / err 0`,
          data: summary,
        });
      }
    } catch (err) {
      const fingerprint = String(err?.message || err || '').trim().slice(0, 200);
      if (renderDetectedScanState.lastExceptionFingerprint !== fingerprint) {
        renderDetectedScanState.lastExceptionFingerprint = fingerprint;
        logLine({
          level: 'warn',
          src: 'postprod',
          action: 'render_detected_auto_scan_failed',
          message: `Scan auto rendus detectes impossible: ${fingerprint}`,
        });
      }
    } finally {
      renderDetectedAutoScanBusy = false;
    }
  }

  function startRenderDetectedAutoScanLoop() {
    const intervalMs = Math.max(
      MIN_RENDER_DETECTED_SCAN_INTERVAL_MS,
      Math.min(MAX_RENDER_DETECTED_SCAN_INTERVAL_MS, Math.trunc(Number(renderDetectedScanIntervalMs) || DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS))
    );
    const firstDelayMs = Math.min(5000, Math.max(1000, Math.trunc(intervalMs / 2)));
    const scheduleNext = (delayMs = intervalMs) => {
      if (renderDetectedAutoScanTimer) clearTimeout(renderDetectedAutoScanTimer);
      renderDetectedAutoScanTimer = setTimeout(() => {
        runRenderDetectedAutoScan({ force: true });
        scheduleNext(intervalMs);
      }, Math.max(1000, Math.trunc(Number(delayMs) || intervalMs)));
      if (typeof renderDetectedAutoScanTimer?.unref === 'function') {
        renderDetectedAutoScanTimer.unref();
      }
    };
    scheduleNext(firstDelayMs);
  }

  return {
    renderDetectedScanState,
    isRenderDetectedAutoScanBusy,
    importDetectedRenderOutputs,
    runRenderDetectedAutoScan,
    startRenderDetectedAutoScanLoop,
  };
}

module.exports = {
  createRenderDetectedAutoScanHelpers,
};
