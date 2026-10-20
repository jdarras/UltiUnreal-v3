'use strict';

const fs = require('fs');
const path = require('path');
const { detectOutputType } = require('./server-postprod-ffmpeg.cjs');

function safeLog(logLine, payload) {
  if (typeof logLine !== 'function') return;
  try { logLine(payload); } catch {}
}

function asRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function parsePayloadJsonSafe(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return asRecord(parsed) || {};
  } catch {
    return {};
  }
}

function normalizePathKey(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/]+/g, '/')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function resolveAbsSafe(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return path.resolve(raw);
  } catch {
    return raw;
  }
}

function isPathUnderRoot(pathValue, rootValue) {
  const absPath = resolveAbsSafe(pathValue);
  const absRoot = resolveAbsSafe(rootValue);
  const pathKey = normalizePathKey(absPath);
  const rootKey = normalizePathKey(absRoot);
  if (!pathKey || !rootKey) return false;
  if (pathKey === rootKey) return true;
  return pathKey.startsWith(`${rootKey}/`);
}

function sanitizeDestinationId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildFallbackDestinationId(name, dirPath, index) {
  const fromName = sanitizeDestinationId(name);
  if (fromName) return fromName;
  const fromPath = sanitizeDestinationId(String(dirPath || '').replace(/[\\/]/g, '-'));
  if (fromPath) return fromPath.slice(0, 80);
  return `dest-${Math.max(1, Number(index) + 1)}`;
}

function normalizeExportDestinationEntries(value, fallback = []) {
  const src = Array.isArray(value)
    ? value
    : (Array.isArray(fallback) ? fallback : []);
  const out = [];
  const seenId = new Set();
  for (let index = 0; index < src.length; index += 1) {
    const entry = asRecord(src[index]);
    if (!entry) continue;
    const destinationPath = resolveAbsSafe(entry.path || entry.destinationPath || entry.dir || '');
    if (!destinationPath) continue;
    const rawName = String(entry.name || entry.label || entry.title || '').trim();
    const id = sanitizeDestinationId(
      entry.id || entry.destinationId || buildFallbackDestinationId(rawName, destinationPath, index)
    );
    if (!id || seenId.has(id)) continue;
    seenId.add(id);
    out.push({
      id,
      name: rawName || id,
      path: destinationPath,
      isActive: entry.isActive !== false && entry.enabled !== false,
    });
  }
  return out;
}

function normalizeExportDestinationIds(value) {
  const src = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/[,\r\n;]+/g) : []);
  const out = [];
  const seen = new Set();
  for (const rawValue of src) {
    const id = sanitizeDestinationId(rawValue);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function resolveExportDestinationEntriesFromCommon(common = {}) {
  const cfg = asRecord(common) || {};
  return normalizeExportDestinationEntries(
    cfg.renderExportDestinations || cfg.render_export_destinations || [],
    []
  );
}

function resolveRenderOutputPath(renderRow = null, payload = null) {
  const row = asRecord(renderRow) || {};
  const payloadObj = asRecord(payload) || {};
  const candidates = [
    row.output_path,
    row.outputPath,
    payloadObj.outputPath,
    payloadObj.output_path,
  ];
  for (const value of candidates) {
    const raw = String(value || '').trim();
    if (!raw || /\{\{[^{}]+\}\}/.test(raw)) continue;
    return resolveAbsSafe(raw);
  }
  return '';
}

function sanitizeFileBaseName(value, fallback = 'render') {
  const raw = String(value || '')
    .trim()
    .replace(/\.[^/.\\]+$/g, '')
    .replace(/%0?\d*d/ig, '')
    .replace(/#+/g, '')
    .replace(/\*/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .trim();
  const candidate = raw || String(fallback || 'render').trim();
  return candidate.slice(0, 160) || 'render';
}

function listFilesSafe(dirPath = '') {
  try {
    const abs = resolveAbsSafe(dirPath);
    if (!abs || !fs.existsSync(abs)) return [];
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    return entries
      .filter((entry) => entry && typeof entry.isFile === 'function' && entry.isFile())
      .map((entry) => String(entry.name || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function escapeRegExp(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listSequenceFiles(patternPath = '') {
  const raw = String(patternPath || '').trim();
  if (!raw) return [];
  const dir = path.dirname(raw);
  const base = path.basename(raw);
  const files = listFilesSafe(dir);
  if (files.length <= 0) return [];

  const collect = (regex, groupIndex = 1) => {
    const matches = [];
    for (const fileName of files) {
      const m = regex.exec(fileName);
      if (!m) continue;
      const frameRaw = String(m[groupIndex] || '').trim();
      const frame = /^\d+$/.test(frameRaw) ? Number(frameRaw) : 0;
      matches.push({
        name: fileName,
        path: path.join(dir, fileName),
        frame: Number.isFinite(frame) ? frame : 0,
      });
    }
    matches.sort((a, b) => {
      if (a.frame > 0 && b.frame > 0 && a.frame !== b.frame) return a.frame - b.frame;
      return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
    });
    return matches;
  };

  if (base.includes('*')) {
    const regex = new RegExp(`^${escapeRegExp(base).replace(/\\\*/g, '.*')}$`, 'i');
    return collect(regex, 0);
  }

  const printfMatch = /%0?(\d*)d/i.exec(base);
  if (printfMatch) {
    const width = Number(printfMatch[1] || 0);
    const prefix = base.slice(0, printfMatch.index);
    const suffix = base.slice(printfMatch.index + printfMatch[0].length);
    const token = width > 0 ? `\\d{${width}}` : '\\d+';
    const regex = new RegExp(`^${escapeRegExp(prefix)}(${token})${escapeRegExp(suffix)}$`, 'i');
    return collect(regex, 1);
  }

  const hashMatch = /(#+)/.exec(base);
  if (hashMatch) {
    const width = String(hashMatch[1] || '').length;
    const prefix = base.slice(0, hashMatch.index);
    const suffix = base.slice(hashMatch.index + width);
    const token = width > 0 ? `\\d{${width}}` : '\\d+';
    const regex = new RegExp(`^${escapeRegExp(prefix)}(${token})${escapeRegExp(suffix)}$`, 'i');
    return collect(regex, 1);
  }

  return [];
}

function ensureDir(pathValue = '') {
  const abs = resolveAbsSafe(pathValue);
  if (!abs) return false;
  try {
    fs.mkdirSync(abs, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function buildUniqueFilePath(destinationDir, baseName, extWithDot = '') {
  const dir = resolveAbsSafe(destinationDir);
  const ext = String(extWithDot || '').trim();
  const safeBase = sanitizeFileBaseName(baseName, 'render');
  const first = path.join(dir, `${safeBase}${ext}`);
  if (!fs.existsSync(first)) return first;
  for (let version = 2; version <= 9999; version += 1) {
    const candidate = path.join(dir, `${safeBase}_v${version}${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${safeBase}_${Date.now()}${ext}`);
}

function buildUniqueDirectoryPath(destinationDir, folderBaseName) {
  const dir = resolveAbsSafe(destinationDir);
  const safeBase = sanitizeFileBaseName(folderBaseName, 'sequence');
  const first = path.join(dir, safeBase);
  if (!fs.existsSync(first)) return first;
  for (let version = 2; version <= 9999; version += 1) {
    const candidate = path.join(dir, `${safeBase}_v${version}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${safeBase}_${Date.now()}`);
}

function deriveSequenceFolderBaseName(renderRow = null, payload = {}, outputPath = '') {
  const row = asRecord(renderRow) || {};
  const payloadObj = asRecord(payload) || {};
  const outputBase = path.basename(String(outputPath || '').trim());
  const fromPayload = String(
    payloadObj.matchedExpectedRenderName
    || payloadObj.taskTitle
    || row.template_name
    || row.templateName
    || ''
  ).trim();
  if (fromPayload) return sanitizeFileBaseName(fromPayload, 'sequence');
  return sanitizeFileBaseName(outputBase, 'sequence');
}

function selectDestinationsByIds(destinationEntries = [], destinationIds = []) {
  const entries = Array.isArray(destinationEntries) ? destinationEntries : [];
  const selectedIds = normalizeExportDestinationIds(destinationIds);
  if (selectedIds.length <= 0) return [];
  const byId = new Map();
  for (const entry of entries) {
    const normalized = asRecord(entry);
    if (!normalized || normalized.isActive === false) continue;
    const id = sanitizeDestinationId(normalized.id);
    if (!id || byId.has(id)) continue;
    byId.set(id, normalized);
  }
  const out = [];
  for (const id of selectedIds) {
    const entry = byId.get(id);
    if (!entry) continue;
    out.push(entry);
  }
  return out;
}

function applyRenderExport({
  renderRow = null,
  payload = null,
  destinationEntries = [],
  destinationIds = [],
  logLine: _logLine = null,
} = {}) {
  const row = asRecord(renderRow) || {};
  const payloadObj = asRecord(payload) || parsePayloadJsonSafe(row.payload_json);
  const selectedDestinationIds = normalizeExportDestinationIds(destinationIds);
  const selectedDestinations = selectDestinationsByIds(destinationEntries, selectedDestinationIds);
  const summary = {
    ok: true,
    sourceType: 'unknown',
    outputPath: '',
    destinationIds: selectedDestinationIds,
    selectedCount: selectedDestinations.length,
    exportedCount: 0,
    artifacts: [],
    errors: [],
  };

  if (selectedDestinationIds.length <= 0 || selectedDestinations.length <= 0) {
    return summary;
  }

  const outputPath = resolveRenderOutputPath(row, payloadObj);
  summary.outputPath = outputPath;
  if (!outputPath) {
    return {
      ...summary,
      ok: false,
      errors: [{ code: 'missing_output_path', message: 'missing_output_path' }],
    };
  }

  const sourceType = detectOutputType(outputPath);
  summary.sourceType = String(sourceType?.type || 'unknown');
  if (sourceType.type === 'unknown') {
    return {
      ...summary,
      ok: false,
      errors: [{ code: 'unsupported_output_type', message: 'unsupported_output_type' }],
    };
  }

  if (sourceType.type === 'video' || sourceType.type === 'image') {
    if (!fs.existsSync(outputPath)) {
      return {
        ...summary,
        ok: false,
        errors: [{ code: 'output_not_found', message: 'output_not_found' }],
      };
    }
    const sourceExt = String(path.extname(outputPath) || '');
    const sourceBaseName = String(path.basename(outputPath, sourceExt) || '').trim() || 'render';

    for (const destination of selectedDestinations) {
      const destinationRoot = resolveAbsSafe(destination.path);
      if (!ensureDir(destinationRoot)) {
        summary.ok = false;
        summary.errors.push({
          destinationId: destination.id,
          code: 'destination_unwritable',
          message: 'destination_unwritable',
        });
        continue;
      }
      const targetFile = buildUniqueFilePath(destinationRoot, sourceBaseName, sourceExt);
      try {
        fs.copyFileSync(outputPath, targetFile);
        const artifact = {
          destinationId: destination.id,
          destinationName: destination.name,
          destinationPath: destinationRoot,
          path: targetFile,
          type: 'file',
          sourceType: sourceType.type,
        };
        summary.artifacts.push(artifact);
        summary.exportedCount += 1;
      } catch (err) {
        summary.ok = false;
        summary.errors.push({
          destinationId: destination.id,
          code: 'copy_failed',
          message: String(err?.message || err || 'copy_failed'),
        });
      }
    }
    return summary;
  }

  if (sourceType.type === 'image_sequence') {
    const files = listSequenceFiles(outputPath);
    if (files.length <= 0) {
      return {
        ...summary,
        ok: false,
        errors: [{ code: 'sequence_not_found', message: 'sequence_not_found' }],
      };
    }
    const sequenceFolderBase = deriveSequenceFolderBaseName(row, payloadObj, outputPath);
    for (const destination of selectedDestinations) {
      const destinationRoot = resolveAbsSafe(destination.path);
      if (!ensureDir(destinationRoot)) {
        summary.ok = false;
        summary.errors.push({
          destinationId: destination.id,
          code: 'destination_unwritable',
          message: 'destination_unwritable',
        });
        continue;
      }

      const targetFolder = buildUniqueDirectoryPath(destinationRoot, sequenceFolderBase);
      if (!ensureDir(targetFolder)) {
        summary.ok = false;
        summary.errors.push({
          destinationId: destination.id,
          code: 'destination_subdir_create_failed',
          message: 'destination_subdir_create_failed',
        });
        continue;
      }

      let copiedCount = 0;
      let copyError = '';
      for (const file of files) {
        const sourceFile = resolveAbsSafe(file.path);
        const targetFile = path.join(targetFolder, String(file.name || '').trim());
        try {
          fs.copyFileSync(sourceFile, targetFile);
          copiedCount += 1;
        } catch (err) {
          copyError = String(err?.message || err || 'copy_failed');
          break;
        }
      }

      if (copyError) {
        summary.ok = false;
        summary.errors.push({
          destinationId: destination.id,
          code: 'copy_failed',
          message: copyError,
        });
        continue;
      }

      const artifact = {
        destinationId: destination.id,
        destinationName: destination.name,
        destinationPath: destinationRoot,
        path: targetFolder,
        type: 'dir',
        sourceType: sourceType.type,
        fileCount: copiedCount,
      };
      summary.artifacts.push(artifact);
      summary.exportedCount += 1;
    }
    return summary;
  }

  return summary;
}

function normalizeArtifactList(value) {
  const src = Array.isArray(value) ? value : [];
  const out = [];
  const seen = new Set();
  for (const entry of src) {
    const artifact = asRecord(entry);
    if (!artifact) continue;
    const artifactPath = resolveAbsSafe(artifact.path);
    const key = normalizePathKey(artifactPath);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      destinationId: sanitizeDestinationId(artifact.destinationId),
      destinationName: String(artifact.destinationName || '').trim(),
      destinationPath: resolveAbsSafe(artifact.destinationPath),
      path: artifactPath,
      type: String(artifact.type || '').trim().toLowerCase() === 'dir' ? 'dir' : 'file',
      sourceType: String(artifact.sourceType || '').trim(),
      fileCount: Number.isFinite(Number(artifact.fileCount)) ? Math.max(0, Math.trunc(Number(artifact.fileCount))) : 0,
    });
  }
  return out;
}

function cleanupRenderExportArtifacts({
  artifacts = [],
  destinationEntries = [],
  logLine = null,
} = {}) {
  const normalizedArtifacts = normalizeArtifactList(artifacts);
  const destinations = normalizeExportDestinationEntries(destinationEntries || []);
  const destinationById = new Map(
    destinations.map((entry) => [sanitizeDestinationId(entry.id), resolveAbsSafe(entry.path)])
  );
  const allowedRoots = destinations
    .map((entry) => resolveAbsSafe(entry.path))
    .filter(Boolean);

  const summary = {
    ok: true,
    removedCount: 0,
    removed: [],
    skipped: [],
    errors: [],
  };

  for (const artifact of normalizedArtifacts) {
    const targetPath = resolveAbsSafe(artifact.path);
    const destinationRoot = resolveAbsSafe(
      artifact.destinationPath
      || destinationById.get(sanitizeDestinationId(artifact.destinationId))
      || ''
    );
    const rootCandidates = destinationRoot
      ? [destinationRoot]
      : allowedRoots;
    const isSafe = rootCandidates.length > 0 && rootCandidates.some((root) => isPathUnderRoot(targetPath, root));
    if (!isSafe) {
      summary.skipped.push({ path: targetPath, reason: 'unsafe_path' });
      continue;
    }
    if (!fs.existsSync(targetPath)) {
      summary.skipped.push({ path: targetPath, reason: 'not_found' });
      continue;
    }
    try {
      const stat = fs.lstatSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        summary.removed.push({ path: targetPath, type: 'dir' });
      } else {
        fs.rmSync(targetPath, { force: true });
        summary.removed.push({ path: targetPath, type: 'file' });
      }
      summary.removedCount += 1;
    } catch (err) {
      summary.ok = false;
      summary.errors.push({
        path: targetPath,
        message: String(err?.message || err || 'delete_failed'),
      });
    }
  }

  safeLog(logLine, {
    level: summary.ok ? 'info' : 'warn',
    src: 'postprod',
    action: 'render_export_cleanup',
    message: summary.ok ? 'render_export_cleanup_done' : 'render_export_cleanup_partial',
    data: {
      removed: summary.removedCount,
      skipped: summary.skipped.length,
      errors: summary.errors.length,
    },
  });

  return summary;
}

// Destinations d'export d'un rendu, avec la même règle que l'écran du rendu
// (resolveRenderExportDestinationIds dans RenderDetailInfoPanel.jsx) :
// celles enregistrées sur le rendu (même une liste vide, choix explicite),
// sinon celles de la demande de rendu liée.
function resolveRenderExportDestinationIds(payload = null, taskRow = null) {
  const payloadObj = asRecord(payload) || {};
  if (Object.prototype.hasOwnProperty.call(payloadObj, 'exportDestinationIds')) {
    return normalizeExportDestinationIds(payloadObj.exportDestinationIds);
  }
  if (Object.prototype.hasOwnProperty.call(payloadObj, 'destinationIds')) {
    return normalizeExportDestinationIds(payloadObj.destinationIds);
  }
  const autoConfig = asRecord(parsePayloadJsonSafe(taskRow?.auto_render_config_json)) || {};
  const autoPayload = asRecord(autoConfig.payload) || {};
  for (const candidate of [autoConfig.exportDestinationIds, autoPayload.exportDestinationIds]) {
    const ids = normalizeExportDestinationIds(candidate);
    if (ids.length > 0) return ids;
  }
  return [];
}

module.exports = {
  parsePayloadJsonSafe,
  normalizeExportDestinationEntries,
  normalizeExportDestinationIds,
  resolveRenderExportDestinationIds,
  resolveExportDestinationEntriesFromCommon,
  resolveRenderOutputPath,
  applyRenderExport,
  cleanupRenderExportArtifacts,
};
