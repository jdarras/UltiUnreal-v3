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

function useSynchronisationOrchestrator() {
  const identity = readIdentity();
  const role = identity?.role || 'server';
  const appMode = String(identity?.mode || '').trim().toLowerCase();
  const isRenderMode = appMode === 'postprod' || appMode === 'render';
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

  const { clientRoot, setClientRoot, handleTestClient, handleBrowseClient } = useSyncClientFlow({
    role,
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
    role,
    quietMode,
    setHosts,
    setProjectsData,
    setActiveName,
  });
  useSyncServerAutoCheck({
    role,
    clientHosts,
    onCheckHost: handleCheckHost,
  });

  const clientPanelProps = {
    t,
    localHostClient,
    hasHosts,
    localHostName,
    localHostIp,
    clientRoot,
    onClientRootChange: setClientRoot,
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
    message,
    confirmDialogNode,
  };

  return {
    role,
    clientPanelProps,
    serverScreenProps,
  };
}

export { useSynchronisationOrchestrator };
