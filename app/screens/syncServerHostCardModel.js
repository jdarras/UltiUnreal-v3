import {
  safeStr,
  buildSyncDestinationInfo,
  getSyncStatusLabel,
  getSyncStatusToneClass,
} from './synchronisationHelpers';

function buildSyncServerHostCardModel({
  host,
  index,
  isRenderMode,
  displayProjectName,
  sourceProjectName,
  t,
  syncStatus,
  syncDetails,
  syncDiffs,
  syncCopyProjects,
  syncSelection,
  diffFoldState,
}) {
  const ip = safeStr(host?.ip || host?.address, `#${index + 1}`);
  const syncRoot = typeof host?.syncRoot === 'string' ? host.syncRoot : '';
  const uproject = typeof host?.uproject === 'string' ? host.uproject : '';

  const destInfo = buildSyncDestinationInfo({
    isRenderMode,
    syncRoot,
    uproject,
    displayProjectName,
    sourceProjectName,
    t,
  });

  const status = syncStatus[ip] || 'unknown';
  const statusLabel = getSyncStatusLabel(status, t);
  const statusLine = syncDetails[ip] ? `${statusLabel} - ${syncDetails[ip]}` : statusLabel;
  const statusToneClass = getSyncStatusToneClass(status);
  const canCopy = !!syncRoot && status !== 'checking' && status !== 'copying';
  const isBusy = status === 'copying' || status === 'checking';

  const diffs = syncDiffs[ip] || {};
  const added = Array.isArray(diffs.added) ? diffs.added : [];
  const modified = Array.isArray(diffs.modified) ? diffs.modified : [];
  const removed = Array.isArray(diffs.removed) ? diffs.removed : [];
  const renderProjects = Array.isArray(diffs.renderProjects) ? diffs.renderProjects : [];

  const copyState =
    syncCopyProjects[ip] && typeof syncCopyProjects[ip] === 'object'
      ? syncCopyProjects[ip]
      : null;

  return {
    ip,
    destInfo,
    statusLine,
    statusToneClass,
    canCopy,
    isBusy,
    added,
    modified,
    removed,
    renderProjects,
    copyState,
    selection: syncSelection[ip] || {},
    fold: diffFoldState[ip] || {},
  };
}

export { buildSyncServerHostCardModel };
