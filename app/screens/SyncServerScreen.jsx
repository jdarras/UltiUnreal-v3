import SyncServerGroups from './SyncServerGroups';
import SyncServerHeaderCard from './SyncServerHeaderCard';

function SyncServerScreen({
  t,
  isRenderMode,
  projectsData,
  displayProjectName,
  sourceDir,
  hostsLoading,
  hostsError,
  hasClientHosts,
  onEditActiveProject,
  groupedHosts,
  sourceProjectName,
  syncStatus,
  syncDetails,
  syncDiffs,
  syncCopyProjects,
  syncSelection,
  diffFoldState,
  onCheckHost,
  onCopyHost,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  onSourceChange,
  message,
  confirmDialogNode,
}) {
  const syncHosts = Array.isArray(groupedHosts?.syncHosts) ? groupedHosts.syncHosts : [];
  const localProjectHosts = Array.isArray(groupedHosts?.localProjectHosts)
    ? groupedHosts.localProjectHosts
    : [];
  const excludedHosts = Array.isArray(groupedHosts?.excludedHosts) ? groupedHosts.excludedHosts : [];

  return (
    <div className="uu-page uu-page-compact">
      <SyncServerHeaderCard
        t={t}
        isRenderMode={isRenderMode}
        projectsData={projectsData}
        displayProjectName={displayProjectName}
        sourceDir={sourceDir}
        hostsLoading={hostsLoading}
        hostsError={hostsError}
        hasClientHosts={hasClientHosts}
        onEditActiveProject={onEditActiveProject}
      >
        {!hostsLoading && !hostsError && hasClientHosts && (
          <SyncServerGroups
            t={t}
            isRenderMode={isRenderMode}
            syncHosts={syncHosts}
            localProjectHosts={localProjectHosts}
            excludedHosts={excludedHosts}
            displayProjectName={displayProjectName}
            sourceProjectName={sourceProjectName}
            syncStatus={syncStatus}
            syncDetails={syncDetails}
            syncDiffs={syncDiffs}
            syncCopyProjects={syncCopyProjects}
            syncSelection={syncSelection}
            diffFoldState={diffFoldState}
            onCheckHost={onCheckHost}
            onCopyHost={onCopyHost}
            onToggleSection={onToggleSection}
            onBulkSelect={onBulkSelect}
            onToggleFileSelection={onToggleFileSelection}
            onSourceChange={onSourceChange}
          />
        )}

        {message && <div className={`uu-msg ${message.type || ''}`}>{message.text}</div>}
        {confirmDialogNode}
      </SyncServerHeaderCard>
    </div>
  );
}

export default SyncServerScreen;
