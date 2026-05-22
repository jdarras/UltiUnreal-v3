// app/screens/launchcontrol.jsx
import React from 'react';
import { useLaunchControlViewModel } from './hooks/useLaunchControlViewModel';
import { useLaunchControlStartLayoutFlow } from './hooks/useLaunchControlStartLayoutFlow';
import { useLaunchControlPollingFlow } from './hooks/useLaunchControlPollingFlow';
import { useLaunchControlActions } from './hooks/useLaunchControlActions';
import { useLaunchControlBootstrap } from './hooks/useLaunchControlBootstrap';
import { useLaunchControlResolvers } from './hooks/useLaunchControlResolvers';
import { useLaunchControlFeedback } from './hooks/useLaunchControlFeedback';
import { useLaunchControlLifecycle } from './hooks/useLaunchControlLifecycle';
import { useLaunchControlRefsSync } from './hooks/useLaunchControlRefsSync';
import { useLaunchControlRuntimeState } from './hooks/useLaunchControlRuntimeState';
import { useLaunchControlStartLayoutState } from './hooks/useLaunchControlStartLayoutState';
import { useLaunchControlUiState } from './hooks/useLaunchControlUiState';
import {
  LaunchHostCard,
  LaunchEditorVersionsSection,
  LaunchActiveProjectSummary,
  LaunchToolbarActions,
  renderStatusDot,
} from './launchcontrolSections';

export default function LaunchControlScreen({
  isVisible = true,
  canLaunchLiveProjects = true,
  canLaunchEditorProjects = true,
  canEditProjectFields = true,
}) {
  const canUseLiveLaunch = canLaunchLiveProjects === true;
  const canUseEditorLaunch = canLaunchEditorProjects === true;
  const canOpenProjectDetail = canUseEditorLaunch || canEditProjectFields === true;
  const [hosts, setHosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const {
    busy,
    setHostBusy,
    setHostsBusy,
    setQuietModeFlag,
  } = useLaunchControlRuntimeState();
  const [projectsData, setProjectsData] = React.useState({ activeName:'', activeId:'', projects:[], activeByHost:{} });
  const [onlineMap, setOnlineMap] = React.useState({});
  const [syncStatusMap, setSyncStatusMap] = React.useState({});
  const [refreshSec, setRefreshSec] = React.useState(5);
  const [launchMode, setLaunchMode] = React.useState('production'); // 'production' | 'integration'
  const {
    useStartLayout,
    setUseStartLayout,
    hasStartLayout,
    setHasStartLayout,
  } = useLaunchControlStartLayoutState();
  const {
    showUeLaunch,
    setShowUeLaunch,
    allowStartDesynced,
    setAllowStartDesynced,
    ueVersions,
    setUeVersions,
    rcHttpPort,
    setRcHttpPort,
  } = useLaunchControlUiState();
  const {
    setStatusMsg,
    showErrorMessage,
    showWarnMessage,
  } = useLaunchControlFeedback();
  const {
    localIp,
    t,
    sortLocale,
    editActiveProject,
  } = useLaunchControlBootstrap({
    canOpenProjectDetail,
    projectsData,
  });

  const {
    projectsDataRef,
    commonCfgRef,
    rcHttpPortRef,
    refreshSecRef,
    useStartLayoutRef,
    hasStartLayoutRef,
    wrcReadyRef,
    hostsRef,
  } = useLaunchControlRefsSync({
    projectsData,
    rcHttpPort,
    refreshSec,
    useStartLayout,
    hasStartLayout,
    hosts,
  });

  const {
    armProductionStartCycle,
    showStartLayoutStatus,
    refreshHasStartLayout,
  } = useLaunchControlStartLayoutFlow({
    launchMode,
    t,
    onlineMap,
    hostsRef,
    projectsDataRef,
    commonCfgRef,
    rcHttpPortRef,
    useStartLayoutRef,
    hasStartLayoutRef,
    wrcReadyRef,
    setStatusMsg,
    setHasStartLayout,
    setUseStartLayout,
  });

  useLaunchControlLifecycle({
    isVisible,
    projectsData,
    refreshHasStartLayout,
    canUseEditorLaunch,
    launchMode,
    setLaunchMode,
  });

  useLaunchControlPollingFlow({
    canUseEditorLaunch,
    sortLocale,
    localIp,
    t,
    showErrorMessage,
    refreshHasStartLayout,
    setLoading,
    setHosts,
    setProjectsData,
    setRefreshSec,
    setShowUeLaunch,
    setAllowStartDesynced,
    setUeVersions,
    setLaunchMode,
    setUseStartLayout,
    setRcHttpPort,
    setOnlineMap,
    setSyncStatusMap,
    setStatusMsg,
    commonCfgRef,
    projectsDataRef,
    rcHttpPortRef,
    refreshSecRef,
    useStartLayoutRef,
    wrcReadyRef,
  });

  const {
    activeProjectEngineVersion,
    serverHost,
    resolveUprojectFor,
    resolveExeForHost,
    isReadyHost,
  } = useLaunchControlResolvers({
    projectsData,
    hosts,
    localIp,
    syncStatusMap,
    allowStartDesynced,
  });

  const {
    resolveEditorPath,
    onChangeLaunchMode,
    onToggleUseStartLayout,
    onLaunchEditor,
    onStart,
    onStop,
    onStartAll,
    onStopAll,
  } = useLaunchControlActions({
    launchMode,
    canUseLiveLaunch,
    canUseEditorLaunch,
    hosts,
    onlineMap,
    busy,
    activeProjectEngineVersion,
    serverHost,
    t,
    showErrorMessage,
    showWarnMessage,
    setStatusMsg,
    setHostBusy,
    setHostsBusy,
    setQuietModeFlag,
    setLaunchMode,
    setUseStartLayout,
    useStartLayoutRef,
    resolveExeForHost,
    resolveUprojectFor,
    isReadyHost,
    armProductionStartCycle,
    showStartLayoutStatus,
  });

  const {
    hasMachines,
    pathOrND,
    hostRuntimeRows,
    canStartAnyHost,
    canStopAnyHost,
    activeLabel,
  } = useLaunchControlViewModel({
    hosts,
    loading,
    onlineMap,
    launchMode,
    localIp,
    canUseLiveLaunch,
    canUseEditorLaunch,
    busy,
    t,
    syncStatusMap,
    activeProjectEngineVersion,
    projectsData,
    resolveExeForHost,
    resolveUprojectFor,
    isReadyHost,
  });

  return (
    <div className="uu-page uu-page-compact launch-page">
        <div className="uu-section">
        <div className="uu-toolbar">
          <LaunchActiveProjectSummary
            canOpenProjectDetail={canOpenProjectDetail}
            activeProjectId={projectsData.activeId}
            activeLabel={activeLabel}
            onEditProject={editActiveProject}
            t={t}
          />
          <LaunchToolbarActions
            t={t}
            launchMode={launchMode}
            hasStartLayout={hasStartLayout}
            useStartLayout={useStartLayout}
            onToggleUseStartLayout={onToggleUseStartLayout}
            onChangeLaunchMode={onChangeLaunchMode}
            canUseEditorLaunch={canUseEditorLaunch}
            canStartAnyHost={canStartAnyHost}
            canStopAnyHost={canStopAnyHost}
            onStartAll={onStartAll}
            onStopAll={onStopAll}
          />
        </div>
      </div>

      {loading && (
        <div className="uu-muted">{t('launch.loading')}</div>
      )}

      {!loading && !hasMachines && (
        <div className="uu-muted">{t('launch.noMachines')}</div>
      )}

      {!loading && hasMachines && (
        <div className="uu-list">
          {hostRuntimeRows.map((row) => {
            return (
              <LaunchHostCard
                key={row.host.ip}
                row={row}
                t={t}
                activeProjectEngineVersion={activeProjectEngineVersion}
                pathOrND={pathOrND}
                renderStatusDot={renderStatusDot}
                onStart={onStart}
                onStop={onStop}
                busy={busy}
              />
            );
          })}
        </div>
      )}

      {/* Bloc de lancement Unreal Editor (boutons plein format) en dessous des machines */}
      {showUeLaunch ? (
        <LaunchEditorVersionsSection
          t={t}
          serverHost={serverHost}
          ueVersions={ueVersions}
          resolveEditorPath={resolveEditorPath}
          onlineMap={onlineMap}
          onLaunchEditor={onLaunchEditor}
        />
      ) : null}
    </div>
  );
}

