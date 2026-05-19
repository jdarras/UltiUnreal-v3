function safeStr(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (!value) return fallback;
  if (typeof value === 'object') {
    if (typeof value.ip === 'string') return value.ip;
    if (typeof value.address === 'string') return value.address;
    if (typeof value.value === 'string') return value.value;
    if (typeof value.name === 'string') return value.name;
    if (typeof value.label === 'string') return value.label;
  }
  return fallback;
}

function normalizeRel(rel) {
  return String(rel || '').replace(/\\/g, '/');
}

function normalizeKey(rel) {
  return normalizeRel(rel).toLowerCase();
}

function normalizeRenderScopeProjects(res) {
  const rows = Array.isArray(res?.projects) ? res.projects : [];
  return rows.map((row) => {
    const addedList = Array.isArray(row?.effectiveAdded)
      ? row.effectiveAdded
      : (Array.isArray(row?.added) ? row.added : []);
    const modifiedList = Array.isArray(row?.effectiveModified)
      ? row.effectiveModified
      : (Array.isArray(row?.modified) ? row.modified : []);
    const removedList = Array.isArray(row?.effectiveRemoved)
      ? row.effectiveRemoved
      : (Array.isArray(row?.removed) ? row.removed : []);
    return {
      projectId: String(row?.projectId || '').trim(),
      projectName: String(row?.projectName || row?.projectId || 'Projet').trim(),
      status: String(row?.status || '').trim(),
      sourceHostName: String(row?.sourceHostName || '').trim(),
      sourceHostIp: String(row?.sourceHostIp || '').trim(),
      sourceDir: String(row?.sourceDir || '').trim(),
      destDir: String(row?.destDir || '').trim(),
      message: String(row?.message || '').trim(),
      addedCount: addedList.length,
      modifiedCount: modifiedList.length,
      removedCount: removedList.length,
      diffCount:
        typeof row?.diffCount === 'number'
          ? row.diffCount
          : (addedList.length + modifiedList.length + removedList.length),
    };
  });
}

function normalizeRenderCopyProjects(res) {
  const rows = Array.isArray(res?.projects) ? res.projects : [];
  return rows.map((row) => ({
    projectId: String(row?.projectId || '').trim(),
    projectName: String(row?.projectName || row?.projectId || 'Projet').trim(),
    status: String(row?.status || '').trim(),
    message: String(row?.message || '').trim(),
    copied: Number(row?.copied || 0),
    deleted: Number(row?.deleted || 0),
    copyErrors: Number(row?.copyErrors || 0),
    deleteErrors: Number(row?.deleteErrors || 0),
    addedCount: Number(row?.addedCount || 0),
    modifiedCount: Number(row?.modifiedCount || 0),
    removedCount: Number(row?.removedCount || 0),
  }));
}

const SYNC_STATUS_LABEL_KEYS = {
  checking: 'sync.server.status.checking',
  copying: 'sync.server.status.copying',
  in_sync: 'sync.server.status.inSync',
  desync: 'sync.server.status.desync',
  no_root: 'sync.server.status.noRoot',
  error: 'sync.server.status.error',
};

function getSyncStatusLabel(status, t) {
  const key = SYNC_STATUS_LABEL_KEYS[String(status || '').trim().toLowerCase()];
  if (!key) return t('sync.server.status.unknown');
  return t(key);
}

function getSyncStatusToneClass(status) {
  const st = String(status || '').trim().toLowerCase();
  if (st === 'in_sync') return 'uu-sync-status-ok';
  if (st === 'desync' || st === 'error' || st === 'no_root') return 'uu-sync-status-bad';
  return 'uu-sync-status-neutral';
}

function getRenderProjectStatusLabel(value) {
  const statusValue = String(value || '').trim().toLowerCase();
  if (statusValue === 'in_sync') return 'A jour';
  if (statusValue === 'desync') return 'Desynchronise';
  if (statusValue === 'no_source') return 'Pas de source';
  if (statusValue === 'no_root') return 'Pas de dossier';
  if (statusValue === 'error') return 'Erreur';
  return statusValue || 'Inconnu';
}

function getRenderProjectStatusClass(value) {
  const statusValue = String(value || '').trim().toLowerCase();
  if (statusValue === 'in_sync') return 'uu-sync-status-ok';
  if (statusValue === 'desync' || statusValue === 'error' || statusValue === 'no_source') {
    return 'uu-sync-status-bad';
  }
  return 'uu-sync-status-neutral';
}

function getRenderCopyStatusLabel(value) {
  const statusValue = String(value || '').trim().toLowerCase();
  if (statusValue === 'ok') return 'OK';
  if (statusValue === 'partial') return 'Partiel';
  if (statusValue === 'error') return 'Erreur';
  if (statusValue === 'no_source') return 'Pas de source';
  return statusValue || '-';
}

function getRenderCopyStatusClass(value) {
  const statusValue = String(value || '').trim().toLowerCase();
  if (statusValue === 'ok') return 'uu-sync-status-ok';
  if (statusValue === 'partial') return 'uu-sync-status-neutral';
  if (statusValue === 'error' || statusValue === 'no_source') return 'uu-sync-status-bad';
  return 'uu-sync-status-neutral';
}

function buildSyncDestinationInfo({
  isRenderMode,
  syncRoot,
  uproject,
  displayProjectName,
  sourceProjectName,
  t,
}) {
  if (isRenderMode) {
    return syncRoot ? `${syncRoot}\\<projets rendu automatique>` : t('sync.server.destMissing');
  }
  const destBase = displayProjectName || sourceProjectName;
  if (syncRoot) return destBase ? `${syncRoot}\\${destBase}` : syncRoot;
  if (uproject) {
    const norm = uproject.replace(/\//g, '\\');
    const idx = norm.lastIndexOf('\\');
    return idx > 0 ? norm.slice(0, idx) : norm;
  }
  return t('sync.server.destMissing');
}

export {
  safeStr,
  normalizeRel,
  normalizeKey,
  normalizeRenderScopeProjects,
  normalizeRenderCopyProjects,
  getSyncStatusLabel,
  getSyncStatusToneClass,
  getRenderProjectStatusLabel,
  getRenderProjectStatusClass,
  getRenderCopyStatusLabel,
  getRenderCopyStatusClass,
  buildSyncDestinationInfo,
};
