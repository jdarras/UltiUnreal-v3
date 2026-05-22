// app/screens/setup.jsx
import React from 'react';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { useSetupClientOrchestrator } from './hooks/useSetupClientOrchestrator';
import { useSetupServerOrchestrator } from './hooks/useSetupServerOrchestrator';
import { SetupClientSection } from './SetupClientSection';
import { SetupServerSection } from './SetupServerSection';

export default function SetupScreen({ clientSyncEnabled, onClientSyncChange }) {
  const id = React.useMemo(readIdentity, []);
  const role = String(id.role || 'server').trim();
  const isClient = role === 'client';
  const localIp = String(id.localIp || '').trim();
  const lang = String(id.lang || 'fr').trim();
  const appMode = String(id.mode || '').trim().toLowerCase();
  const isRenderMode = appMode === 'postprod';

  const t = React.useMemo(() => createT(lang), [lang]);

  /* ====================== ÉTAT / EFFETS CÔTÉ CLIENT ====================== */
  const {
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
  } = useSetupClientOrchestrator({
    clientSyncEnabled,
    role,
    isClient,
    localIp,
    t,
    onClientSyncChange,
  });

  /* ====================== RÔLE SERVEUR ====================== */
  const {
    addMachine,
    capableList,
    excludedList,
    renderCard,
    unknownDetected,
    addDetectedMachine,
  } = useSetupServerOrchestrator({
    role,
    localIp,
    lang,
    isRenderMode,
    t,
  });

  if (isClient) {
    return (
      <SetupClientSection
        t={t}
        clientVersions={clientVersions}
        clientEditors={clientEditors}
        setClientEditors={setClientEditors}
        saveClientEditors={saveClientEditors}
        showClientTransientMessage={showClientTransientMessage}
        handleClientToggleSync={handleClientToggleSync}
        clientSyncState={clientSyncState}
        versionsLoaded={versionsLoaded}
        clientMsg={clientMsg}
        clientMsgType={clientMsgType}
      />
    );
  }

  return (
    <SetupServerSection
      t={t}
      isRenderMode={isRenderMode}
      addMachine={addMachine}
      capableList={capableList}
      excludedList={excludedList}
      renderCard={renderCard}
      unknownDetected={unknownDetected}
      addDetectedMachine={addDetectedMachine}
    />
  );
}


