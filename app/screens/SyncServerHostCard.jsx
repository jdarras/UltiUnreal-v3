import { buildSyncServerHostCardModel } from './syncServerHostCardModel';
import SyncDiffsPanel from './SyncDiffsPanel';
import { SyncHostHeader } from './SyncHostHeader';
import SyncRenderProjectsGrid from './SyncRenderProjectsGrid';
import SyncServerHostCardHeader from './SyncServerHostCardHeader';

function SyncServerHostCard({
  host,
  index,
  t,
  isRenderMode,
  displayProjectName,
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
}) {
  const {
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
    selection,
    fold,
  } = buildSyncServerHostCardModel({
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
  });

  return (
    <div className="uu-card">
      <SyncServerHostCardHeader
        headerNode={<SyncHostHeader host={host} index={index} t={t} />}
        destinationNode={destInfo}
        isBusy={isBusy}
        canCopy={canCopy}
        statusLine={statusLine}
        statusToneClass={statusToneClass}
        onCheck={() => onCheckHost(ip)}
        onCopy={() => onCopyHost(ip)}
        t={t}
      />

      {isRenderMode && (
        <SyncRenderProjectsGrid
          renderProjects={renderProjects}
          copyState={copyState}
          targetIp={ip}
          onSourceChange={onSourceChange}
          t={t}
        />
      )}

      <SyncDiffsPanel
        ip={ip}
        isRenderMode={isRenderMode}
        isBusy={isBusy}
        added={added}
        modified={modified}
        removed={removed}
        selection={selection}
        fold={fold}
        onToggleSection={onToggleSection}
        onBulkSelect={onBulkSelect}
        onToggleFileSelection={onToggleFileSelection}
        t={t}
      />
    </div>
  );
}

export default SyncServerHostCard;
