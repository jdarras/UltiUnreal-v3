import React from 'react';

export function useSetupClientAutosave({
  isClient,
  localIp,
  clientEditors,
  clientVersions,
  clientSyncState,
  markClientAutosaveReady,
  scheduleClientAutosave,
  clearScheduledClientAutosave,
  saveClientEditors,
}) {
  React.useEffect(() => {
    if (!isClient) return;
    if (!localIp) return;
    if (!markClientAutosaveReady()) return;
    scheduleClientAutosave(() => {
      saveClientEditors();
    }, 600);
    return clearScheduledClientAutosave;
  }, [
    clientEditors,
    clientVersions,
    clientSyncState,
    isClient,
    localIp,
    markClientAutosaveReady,
    scheduleClientAutosave,
    clearScheduledClientAutosave,
    saveClientEditors,
  ]);
}
