import { normPath } from '../../utils/projects-helpers.js';

export function normalizeProjectMetaStatus(status) {
  return status === 'PAS' ? 'PAD' : (status || '');
}

export function buildProjectDetailPayload({
  meta,
  pvValue,
  wrcNamesValue,
  keywords,
} = {}) {
  return {
    status: normalizeProjectMetaStatus(meta?.status),
    type: meta?.type || '',
    usageMode: meta?.usageMode || '',
    syncIncluded: meta?.syncIncluded === true,
    category: meta?.category || '',
    fileVersion: pvValue || meta?.fileVersion || '',
    referents: meta?.referents || {},
    keywords: keywords || [],
    note: meta?.note || '',
    wrcNames: wrcNamesValue,
  };
}

export function buildProjectDetailPreserved(meta) {
  const preserved = {
    status: meta?.status,
    type: meta?.type,
    usageMode: meta?.usageMode,
    note: meta?.note,
    keywords: meta?.keywords,
    referents: meta?.referents,
  };
  if (Object.prototype.hasOwnProperty.call(meta || {}, 'syncIncluded')) {
    preserved.syncIncluded = meta?.syncIncluded === true;
  }
  return preserved;
}

export function buildMergedProjectMeta({
  metaRaw,
  preserved,
  isFavorite,
} = {}) {
  const raw = metaRaw || {};
  const keep = preserved || {};
  const merged = {
    ...raw,
    status: keep.status ?? raw.status,
    type: keep.type ?? raw.type,
    usageMode: keep.usageMode ?? raw.usageMode,
    note: keep.note ?? raw.note,
    keywords: keep.keywords ?? raw.keywords,
    referents: { ...(raw.referents || {}), ...(keep.referents || {}) },
    favorite: isFavorite === true,
  };
  if (
    Object.prototype.hasOwnProperty.call(keep, 'syncIncluded')
    || Object.prototype.hasOwnProperty.call(raw, 'syncIncluded')
  ) {
    merged.syncIncluded = (keep.syncIncluded ?? raw.syncIncluded) === true;
  }
  return merged;
}

export function buildProjectListPatchFromPayload({
  pathValue,
  wrcNamesValue,
  payload,
} = {}) {
  const patch = {
    uproject: pathValue ? normPath(pathValue) : undefined,
    wrcNames: wrcNamesValue,
    note: payload?.note,
    metaStatus: payload?.status || '',
    metaType: payload?.type || '',
    metaUsageMode: payload?.usageMode || '',
    metaCategory: payload?.category || '',
    metaFileVersion: payload?.fileVersion ?? '',
    metaReferents: payload?.referents || {},
    metaKeywords: payload?.keywords || [],
  };
  if (Object.prototype.hasOwnProperty.call(payload || {}, 'syncIncluded')) {
    patch.syncIncluded = payload?.syncIncluded === true;
  }
  return patch;
}

export function buildProjectListPatchFromMergedMeta({
  pathValue,
  wrcNamesValue,
  mergedMeta,
} = {}) {
  const meta = mergedMeta || {};
  const patch = {
    uproject: pathValue ? normPath(pathValue) : undefined,
    wrcNames: wrcNamesValue,
    note: meta.note,
    metaStatus: meta.status || '',
    metaType: meta.type || '',
    metaUsageMode: meta.usageMode || '',
    metaCategory: meta.category || '',
    metaFileVersion: meta.fileVersion ?? '',
    metaReferents: meta.referents || {},
    metaKeywords: Array.isArray(meta.keywords) ? meta.keywords : [],
  };
  if (Object.prototype.hasOwnProperty.call(meta, 'syncIncluded')) {
    patch.syncIncluded = meta.syncIncluded === true;
  }
  return patch;
}

export function mapProjectById(projects, pid, patchBuilder) {
  return (projects || []).map((p) => {
    if (String(p.id || '').trim() !== pid) return p;
    const patch = patchBuilder(p) || {};
    const nextPatch = { ...patch };
    if (nextPatch.uproject === undefined) {
      delete nextPatch.uproject;
    }
    return { ...p, ...nextPatch };
  });
}
