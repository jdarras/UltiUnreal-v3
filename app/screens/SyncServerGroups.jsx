import SyncServerHostCard from './SyncServerHostCard';
import SyncServerHostsSection from './SyncServerHostsSection';
import { SyncWarnHostsSection } from './SyncWarnHostsSection';
import { buildSyncServerGroupsMessages } from './syncServerGroupsMessages';

const SYNC_SECTION_TITLE_STYLE = { marginBottom: '12px' };

function SyncServerGroups({
  t,
  isRenderMode,
  syncHosts,
  localProjectHosts,
  excludedHosts,
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
}) {
  const {
    syncHostsTitle,
    localProjectTitle,
    localProjectMessage,
    excludedTitle,
    excludedMessage,
  } = buildSyncServerGroupsMessages({ isRenderMode, t });
  const hostCardProps = {
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
  };

  return (
    <>
      <SyncServerHostsSection
        hosts={syncHosts}
        title={syncHostsTitle}
        sectionTitleStyle={SYNC_SECTION_TITLE_STYLE}
        HostCardComponent={SyncServerHostCard}
        hostCardProps={hostCardProps}
      />

      <SyncWarnHostsSection
        hosts={localProjectHosts}
        title={localProjectTitle}
        messageText={localProjectMessage}
        t={t}
      />
      <SyncWarnHostsSection
        hosts={excludedHosts}
        title={excludedTitle}
        messageText={excludedMessage}
        t={t}
      />
    </>
  );
}

export default SyncServerGroups;
