import React from 'react';

import { postHost, checkSync } from '../../utils/agent';
import { safeStr } from '../synchronisationHelpers';
import { useSyncMessagePublisher } from './useSyncMessagePublisher';

function extractDiffCount(listValue, countValue) {
  return Array.isArray(listValue) ? listValue.length : Number(countValue ?? 0);
}

function extractSyncDiffCounts(syncResult) {
  return {
    added: extractDiffCount(syncResult?.added, syncResult?.addedCount),
    modified: extractDiffCount(syncResult?.modified, syncResult?.modifiedCount),
    removed: extractDiffCount(syncResult?.removed, syncResult?.deletedCount),
  };
}

function isSyncCheckSuccessful(syncResult) {
  return !!(
    syncResult &&
    (syncResult.ok || syncResult.status === 'in_sync' || syncResult.status === 'desync')
  );
}

function useSyncClientFlow({
  role,
  hosts,
  localIp,
  t,
  syncScopeOptions,
  readCachedRoot,
  writeCachedRoot,
  setMessage,
  scheduleMessageClear,
}) {
  const [clientRoot, setClientRoot] = React.useState(() => {
    try {
      const raw = localStorage.getItem('uu_client_syncRoot');
      return typeof raw === 'string' ? raw : '';
    } catch {
      return '';
    }
  });
  const [clientSyncEnabled, setClientSyncEnabled] = React.useState(false);
  const [clientInitDone, setClientInitDone] = React.useState(false);
  const clientSaveTimer = React.useRef(null);
  const saveReady = React.useRef(false);
  const showClientMessage = useSyncMessagePublisher({ setMessage, scheduleMessageClear });

  React.useEffect(() => {
    if (role !== 'client') return;
    if (clientInitDone) return;
    if (!hosts || hosts.length === 0) return;

    let preferred = hosts.find(
      (h) => h && String(safeStr(h.ip || h.address, '')).trim() === localIp
    );
    if (!preferred) preferred = hosts[0];

    if (preferred) {
      const root = typeof preferred.syncRoot === 'string' ? preferred.syncRoot : '';
      const enabled =
        typeof preferred.syncEnabled === 'boolean'
          ? preferred.syncEnabled
          : !!preferred.syncRoot;

      setClientRoot(root);
      writeCachedRoot(root);
      setClientSyncEnabled(enabled);
    }

    if (!preferred) {
      const cached = readCachedRoot();
      if (cached) {
        setClientRoot(cached);
      }
    }

    setClientInitDone(true);
  }, [role, hosts, clientInitDone, localIp, readCachedRoot, writeCachedRoot]);

  const handleSaveClient = React.useCallback(async () => {
    const root = String(clientRoot || '').trim();
    const hostExists = (hosts || []).some(
      (h) => h && String(safeStr(h.ip || h.address, '')).trim() === localIp
    );

    if (!hostExists) {
      showClientMessage('error', t('sync.client.msg.hostMissingOnServer'), 3000);
      return;
    }

    if (clientSyncEnabled && !root) {
      showClientMessage('error', t('sync.client.msg.missingRoot'), 2000);
      return;
    }

    if (!localIp) {
      showClientMessage('error', t('sync.client.msg.noLocalIp'), 3000);
      return;
    }

    try {
      await postHost(localIp, { syncRoot: root, syncEnabled: !!clientSyncEnabled });
      writeCachedRoot(root);
      showClientMessage('ok', t('sync.client.msg.saved'), 2000);
    } catch (e) {
      showClientMessage('error', `${t('sync.client.msg.saveErrorPrefix')}${e.message || e}`, 2000);
    }
  }, [
    clientRoot,
    hosts,
    localIp,
    clientSyncEnabled,
    t,
    showClientMessage,
    writeCachedRoot,
  ]);

  React.useEffect(() => {
    if (role !== 'client') return;
    if (!clientInitDone) return;
    if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    if (!saveReady.current) {
      saveReady.current = true;
      return;
    }
    clientSaveTimer.current = setTimeout(() => {
      handleSaveClient();
    }, 600);
    return () => {
      if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    };
  }, [clientRoot, clientSyncEnabled, role, clientInitDone, handleSaveClient]);

  const handleTestClient = React.useCallback(async () => {
    const hasHosts = hosts && hosts.length > 0;

    const localHostClient = hasHosts
      ? hosts.find(
          (h) => h && String(safeStr(h.ip || h.address, '')).trim() === localIp
        ) || hosts[0]
      : null;

    if (!localHostClient || !localIp) {
      showClientMessage('info', t('sync.client.msg.noLocalHost'), 4000);
      return;
    }

    if (!clientSyncEnabled) {
      showClientMessage('info', t('sync.client.msg.mustEnableFirst'), 4000);
      return;
    }

    const root = String(clientRoot || '').trim();
    if (!root) {
      showClientMessage('info', t('sync.client.msg.mustSetRoot'), 4000);
      return;
    }

    try {
      showClientMessage('info', t('sync.client.msg.testRunning'));

      const res = await checkSync(localIp, syncScopeOptions || undefined);

      if (isSyncCheckSuccessful(res)) {
        const { added, modified, removed } = extractSyncDiffCounts(res);

        showClientMessage(
          'ok',
          t('sync.client.msg.testOkCounts')
            .replace('{added}', added)
            .replace('{modified}', modified)
            .replace('{removed}', removed),
          4000
        );
      } else {
        showClientMessage('error', t('sync.client.msg.testError'), 4000);
      }
    } catch (e) {
      showClientMessage('error', `${t('sync.client.msg.testErrorPrefix')}${e.message || e}`, 5000);
    }
  }, [
    hosts,
    localIp,
    clientRoot,
    clientSyncEnabled,
    t,
    syncScopeOptions,
    showClientMessage,
  ]);

  const handleBrowseClient = React.useCallback(async () => {
    if (!window.electron || typeof window.electron.chooseFolder !== 'function') {
      showClientMessage('error', t('sync.client.msg.chooseFolderUnavailable'), 2500);
      return;
    }

    try {
      const folder = await window.electron.chooseFolder();
      if (!folder) return;

      setClientRoot(folder);
      writeCachedRoot(folder);
      setClientSyncEnabled(true);
    } catch {
      showClientMessage('error', t('sync.client.msg.chooseFolderError'), 2500);
    }
  }, [t, showClientMessage, writeCachedRoot]);

  return {
    clientRoot,
    setClientRoot,
    clientSyncEnabled,
    setClientSyncEnabled,
    handleTestClient,
    handleBrowseClient,
  };
}

export { useSyncClientFlow };
