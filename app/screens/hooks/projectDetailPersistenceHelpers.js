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
    category: meta?.category || '',
    fileVersion: pvValue || meta?.fileVersion || '',
    referents: meta?.referents || {},
    keywords: keywords || [],
    note: meta?.note || '',
    wrcNames: wrcNamesValue,
  };
}

export function buildProjectDetailPreserved(meta) {
  return {
    status: meta?.status,
    type: meta?.type,
    usageMode: meta?.usageMode,
    note: meta?.note,
    keywords: meta?.keywords,
    referents: meta?.referents,
  };
}

export function buildMergedProjectMeta({
  metaRaw,
  preserved,
  isFavorite,
} = {}) {
  const raw = metaRaw || {};
  const keep = preserved || {};
  return {
    ...raw,
    status: keep.status ?? raw.status,
    type: keep.type ?? raw.type,
    usageMode: keep.usageMode ?? raw.usageMode,
    note: keep.note ?? raw.note,
    keywords: keep.keywords ?? raw.keywords,
    referents: { ...(raw.referents || {}), ...(keep.referents || {}) },
    favorite: isFavorite === true,
  };
}

export function buildProjectListPatchFromPayload({
  pathValue,
  wrcNamesValue,
  payload,
} = {}) {
  return {
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
}

export function buildProjectListPatchFromMergedMeta({
  pathValue,
  wrcNamesValue,
  mergedMeta,
} = {}) {
  const meta = mergedMeta || {};
  return {
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
