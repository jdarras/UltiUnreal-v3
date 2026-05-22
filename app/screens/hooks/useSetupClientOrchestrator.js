import { useSetupClientAutosave } from './useSetupClientAutosave';
import { useSetupClientLifecycle } from './useSetupClientLifecycle';
import { useSetupClientState } from './useSetupClientState';

export function useSetupClientOrchestrator({
  clientSyncEnabled,
  role,
  isClient,
  localIp,
  t,
  onClientSyncChange,
}) {
  const {
    readCachedEditors,
    writeCachedEditors,
    readCachedSync,
    readCachedAssoc,
    writeCachedSync,
    readCachedVersions,
    writeCachedVersions,
    clientVersions,
    setClientVersions,
    clientEditors,
    setClientEditors,
    clientHostExists,
    setClientHostExists,
    clientMsg,
    clientMsgType,
    clientSyncState,
    setClientSyncState,
    versionsLoaded,
    setVersionsLoaded,
    lastClientSaveSigRef,
    showClientTransientMessage,
    markClientAutosaveReady,
    scheduleClientAutosave,
    clearScheduledClientAutosave,
  } = useSetupClientState({ clientSyncEnabled });

  const { saveClientEditors, handleClientToggleSync } = useSetupClientLifecycle({
    role,
    localIp,
    t,
    onClientSyncChange,
    clientEditors,
    clientVersions,
    clientSyncState,
    clientHostExists,
    setClientHostExists,
    setClientEditors,
    setClientVersions,
    setClientSyncState,
    setVersionsLoaded,
    readCachedEditors,
    writeCachedEditors,
    readCachedSync,
    readCachedAssoc,
    writeCachedSync,
    readCachedVersions,
    writeCachedVersions,
    lastClientSaveSigRef,
    showClientTransientMessage,
  });

  useSetupClientAutosave({
    isClient,
    localIp,
    clientEditors,
    clientVersions,
    clientSyncState,
    markClientAutosaveReady,
    scheduleClientAutosave,
    clearScheduledClientAutosave,
    saveClientEditors,
  });

  return {
    clientVersions,
    clientEditors,
    setClientEditors,
    saveClientEditors,
    showClientTransientMessage,
    handleClientToggleSync,
    clientSyncState,
    versionsLoaded,
    clientMsg,
    clientMsgType,
  };
}
