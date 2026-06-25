import React from 'react';

import { readIdentity } from '../../utils/identity';
import { createT } from '../../i18n';
import { usePromiseConfirmDialog } from './usePromiseConfirmDialog';
import { useSyncClientFlow } from './useSyncClientFlow';
import { useSyncClientRootCache } from './useSyncClientRootCache';
import { useSyncClientViewModel } from './useSyncClientViewModel';
import { useSyncServerActions } from './useSyncServerActions';
import { useSyncServerAutoCheck } from './useSyncServerAutoCheck';
import { useSyncBootstrap } from './useSyncBootstrap';
import { useSyncConfirmDialogNode } from './useSyncConfirmDialogNode';
import { useSyncServerPolling } from './useSyncServerPolling';
import { useSyncServerViewModel } from './useSyncServerViewModel';
import { useTransientMessage } from './useTransientMessage';
import { setSyncProjectSource } from '../../utils/agent';

function useSynchronisationOrchestrator() {
  const identity = readIdentity();
  const role = identity?.role || 'server';
  const appMode = String(identity?.mode || '').trim().toLowerCase();
  const isRenderMode = appMode === 'postprod' || appMode === 'render';
  const effectiveRole = isRenderMode ? 'server' : role;
  const localIp = String(identity?.localIp || '').trim();
  const lang = identity?.lang || 'fr';
  const t = React.useMemo(() => createT(lang), [lang]);
  const syncScopeOptions = React.useMemo(
    () => (isRenderMode ? { scope: 'render_auto', direction: 'auto' } : null),
    [isRenderMode]
  );

  const { readCachedRoot, writeCachedRoot } = useSyncClientRootCache();
  const { message, setMessage, scheduleMessageClear } = useTransientMessage();
  const {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  } = usePromiseConfirmDialog();

  const [hosts, setHosts] = React.useState([]);
  const [hostsLoading, setHostsLoading] = React.useState(false);
  const [hostsError, setHostsError] = React.useState('');

  const {
    clientRoot,
    setClientRoot,
    clientSyncEnabled,
    setClientSyncEnabled,
    handleTestClient,
    handleBrowseClient,
  } = useSyncClientFlow({
    role: effectiveRole,
    hosts,
    localIp,
    t,
    syncScopeOptions,
    readCachedRoot,
    writeCachedRoot,
    setMessage,
    scheduleMessageClear,
  });
  const { hasHosts, localHostClient, localHostIp, localHostName } = useSyncClientViewModel({
    hosts,
    localIp,
    t,
  });

  const [activeName, setActiveName] = React.useState('');
  const [projectsData, setProjectsData] = React.useState(null);
  const loadingProjects = !projectsData;
  const {
    sourceDir,
    sourceProjectName,
    displayProjectName,
    clientHosts,
    hasClientHosts,
    groupedHosts,
  } = useSyncServerViewModel({
    hosts,
    localIp,
    projectsData,
    loadingProjects,
    activeName,
    isRenderMode,
    t,
  });

  const editActiveProject = React.useCallback(() => {
    const pid = String(projectsData?.activeId || '').trim();
    if (!pid) return;
    if (window.goToProjectDetail) {
      window.goToProjectDetail(pid);
    }
  }, [projectsData]);

  const [quietMode, setQuietMode] = React.useState(false);
  const {
    syncStatus,
    syncDetails,
    syncCopyProjects,
    syncDiffs,
    diffFoldState,
    syncSelection,
    handleCheckHost,
    toggleFileSelection,
    toggleDiffSection,
    bulkSelectDiff,
    handleCopyHost,
  } = useSyncServerActions({
    isRenderMode,
    syncScopeOptions,
    t,
    setMessage,
    scheduleMessageClear,
    requestConfirm,
    setHosts,
  });

  const confirmDialogNode = useSyncConfirmDialogNode({
    t,
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
  });

  useSyncBootstrap({
    setHosts,
    setHostsLoading,
    setHostsError,
    setQuietMode,
  });
  useSyncServerPolling({
    role: effectiveRole,
    quietMode,
    setHosts,
    setProjectsData,
    setActiveName,
  });
  const syncAutoCheckKey = React.useMemo(() => {
    const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    return projects.map((project) => [
      String(project?.id || '').trim(),
      String(project?.sourceHostIp || '').trim(),
      String(project?.metaUsageMode || project?.usageMode || '').trim(),
      project?.syncIncluded === true ? '1' : '0',
    ].join(':')).sort().join('|');
  }, [projectsData]);
  useSyncServerAutoCheck({
    role: effectiveRole,
    clientHosts,
    onCheckHost: handleCheckHost,
    refreshKey: syncAutoCheckKey,
  });

  const handleSourceChange = React.useCallback(async (targetIp, projectId, sourceIp) => {
    if (!projectId || !sourceIp) return;
    try {
      const result = await setSyncProjectSource(projectId, sourceIp);
      if (!result || result.ok === false) throw new Error(result?.error || 'source_update_failed');
      window.dispatchEvent(new CustomEvent('ultiunreal:sync-state-changed'));
      const orderedTargets = [
        targetIp,
        ...clientHosts.map((host) => String(host?.ip || host?.address || '').trim()),
      ].filter((ip, index, values) => ip && values.indexOf(ip) === index);
      for (const ip of orderedTargets) {
        await handleCheckHost(ip);
      }
    } catch (error) {
      setMessage({ type: 'error', text: String(error?.message || error) });
      scheduleMessageClear(4000);
    }
  }, [clientHosts, handleCheckHost, scheduleMessageClear, setMessage]);

  const clientPanelProps = {
    t,
    localHostClient,
    hasHosts,
    localHostName,
    localHostIp,
    clientRoot,
    clientSyncEnabled,
    onClientRootChange: setClientRoot,
    onClientSyncEnabledChange: setClientSyncEnabled,
    onBrowseClient: handleBrowseClient,
    onTestClient: handleTestClient,
    message,
    confirmDialogNode,
  };

  const serverScreenProps = {
    t,
    isRenderMode,
    projectsData,
    displayProjectName,
    sourceDir,
    hostsLoading,
    hostsError,
    hasClientHosts,
    onEditActiveProject: editActiveProject,
    groupedHosts,
    sourceProjectName,
    syncStatus,
    syncDetails,
    syncDiffs,
    syncCopyProjects,
    syncSelection,
    diffFoldState,
    onCheckHost: handleCheckHost,
    onCopyHost: handleCopyHost,
    onToggleSection: toggleDiffSection,
    onBulkSelect: bulkSelectDiff,
    onToggleFileSelection: toggleFileSelection,
    onSourceChange: handleSourceChange,
    message,
    confirmDialogNode,
  };

  return {
    role: effectiveRole,
    clientPanelProps,
    serverScreenProps,
  };
}

export { useSynchronisationOrchestrator };
