function sortHosts(list, locale = 'fr') {
  const collator = new Intl.Collator(locale || 'fr', { numeric: true, sensitivity: 'base' });
  return [...(Array.isArray(list) ? list : [])]
    .filter((h) => h && h.renderAvailability !== 'excluded' && h.eligible !== false)
    .sort((a, b) => {
      const ai = Number(a?.sortIndex);
      const bi = Number(b?.sortIndex);
      const hasAi = Number.isFinite(ai);
      const hasBi = Number.isFinite(bi);
      if (hasAi && hasBi && ai !== bi) return ai - bi;
      if (hasAi && !hasBi) return -1;
      if (!hasAi && hasBi) return 1;

      const na = String(a?.name || '').trim();
      const nb = String(b?.name || '').trim();
      if (na && nb) {
        const c = collator.compare(na, nb);
        if (c !== 0) return c;
      } else if (na) {
        return -1;
      } else if (nb) {
        return 1;
      }
      return collator.compare(String(a?.ip || ''), String(b?.ip || ''));
    });
}

function buildHostsSignature(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((h) => {
      const ip = String(h?.ip || '').trim();
      const name = String(h?.name || '').trim();
      const color = String(h?.color || '').trim();
      const uproject = String(h?.uproject || '').trim();
      const syncRoot = String(h?.syncRoot || '').trim();
      const avail = h?.renderAvailability || (h?.eligible === false ? 'excluded' : 'capable');
      const syncEnabled = h?.syncEnabled ? '1' : '0';
      const sortIndexRaw = Number(h?.sortIndex);
      const sortIndex = Number.isFinite(sortIndexRaw) ? String(sortIndexRaw) : '';
      return `${ip}|${name}|${color}|${uproject}|${syncRoot}|${avail}|${syncEnabled}|${sortIndex}`;
    })
    .sort()
    .join('||');
}

function buildProjectsSignature(payload) {
  const activeId = String(payload?.activeId || '').trim();
  const activeName = String(payload?.activeName || '').trim();

  const projectsSig = (Array.isArray(payload?.projects) ? payload.projects : [])
    .map((project) => {
      const id = String(project?.id || '').trim();
      const name = String(project?.name || '').trim();
      const uproject = String(project?.uproject || '').trim();
      const projectPath = String(project?.projectPath || '').trim();
      const pathValue = String(project?.path || '').trim();
      const engineVersion = String(project?.engineVersion || '').trim();
      return `${id}|${name}|${uproject}|${projectPath}|${pathValue}|${engineVersion}`;
    })
    .sort()
    .join('||');

  const activeByHost = payload?.activeByHost && typeof payload.activeByHost === 'object'
    ? payload.activeByHost
    : {};
  const activeByHostSig = Object.entries(activeByHost)
    .map(([ip, mapping]) => {
      const mapObj = mapping && typeof mapping === 'object' ? mapping : {};
      const mappingSig = Object.entries(mapObj)
        .map(([projectId, up]) => `${String(projectId || '').trim()}:${String(up || '').trim()}`)
        .sort()
        .join(',');
      return `${String(ip || '').trim()}=>${mappingSig}`;
    })
    .sort()
    .join('||');

  return `${activeId}|${activeName}|${projectsSig}|${activeByHostSig}`;
}

function isHostAllowedForLaunchMode({
  ip,
  localIp,
  launchMode,
  canUseLiveLaunch,
  canUseEditorLaunch,
}) {
  const isServerHost = !!localIp && String(ip || '').trim() === String(localIp || '').trim();
  return (
    (launchMode === 'production' && canUseLiveLaunch) ||
    (launchMode === 'integration' && canUseEditorLaunch && isServerHost)
  );
}

function computeAgentStatus({ isBusy, online, running, t }) {
  if (isBusy) return { cls: 'testing', title: t('launch.status.testing') };
  if (online && running) return { cls: 'ok', title: t('launch.status.unrealRunning') };
  if (online) return { cls: 'ok', title: t('launch.status.agentOnline') };
  return { cls: 'fail', title: t('launch.status.agentOffline') };
}

function computeProjectStatus({ host, ip, uproj, syncStatusMap, t }) {
  const syncEnabled = !!host?.syncEnabled;
  const syncRoot = String(host?.syncRoot || '').trim();
  const syncStatus = syncEnabled ? syncStatusMap[ip] : null;
  const syncStatusName = String(syncStatus?.status || '').trim().toLowerCase();
  const rawDiffValue = syncEnabled
    ? Number(
      syncStatus?.rawDiffCount ??
      (syncStatusName === 'desync' ? syncStatus?.diffCount : 0)
    )
    : 0;
  const rawDiffCount =
    Number.isFinite(rawDiffValue) && rawDiffValue > 0
      ? Math.trunc(rawDiffValue)
      : 0;
  const hasProject = !!uproj && (!syncEnabled || !!syncRoot);
  const syncDesync = syncEnabled && syncStatusName === 'desync';
  const syncError = syncEnabled && syncStatus && syncStatus.ok === false;
  const syncMissingRoot = syncEnabled && syncStatusName === 'no_root';
  return {
    cls: !hasProject || syncError || syncMissingRoot ? 'fail' : syncDesync ? 'warn' : 'ok',
    title: !hasProject
      ? t('launch.status.missingUproject')
      : (syncMissingRoot
        ? t('launch.status.missingSyncRoot')
        : (syncError
          ? t('launch.status.syncError')
          : (syncDesync
            ? t('launch.status.projectDesynced')
            : t('launch.status.projectDefined')))),
    rawDiffCount,
  };
}

function computeExeStatus({ hasExe, requiredVersion, t }) {
  return {
    cls: hasExe ? 'ok' : 'fail',
    title: hasExe
      ? t('launch.status.unrealExeReady')
      : (requiredVersion
        ? t('launch.status.missingExeVersion', { version: requiredVersion })
        : t('launch.status.missingExe')),
  };
}

function buildColorDotStyle(color) {
  return {
    display: 'inline-block',
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: '50%',
    background: color || '#6B7280',
  };
}

export {
  sortHosts,
  buildHostsSignature,
  buildProjectsSignature,
  isHostAllowedForLaunchMode,
  computeAgentStatus,
  computeProjectStatus,
  computeExeStatus,
  buildColorDotStyle,
};
