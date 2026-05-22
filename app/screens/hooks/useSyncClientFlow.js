import React from 'react';

import { postHost, checkSync } from '../../utils/agent';
import { safeStr } from '../synchronisationHelpers';

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
      setMessage({
        type: 'error',
        text: t('sync.client.msg.hostMissingOnServer'),
      });
      scheduleMessageClear(3000);
      return;
    }

    if (clientSyncEnabled && !root) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.missingRoot'),
      });
      scheduleMessageClear(2000);
      return;
    }

    if (!localIp) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.noLocalIp'),
      });
      scheduleMessageClear(3000);
      return;
    }

    try {
      await postHost(localIp, { syncRoot: root });
      writeCachedRoot(root);

      setMessage({
        type: 'ok',
        text: t('sync.client.msg.saved'),
      });
    } catch (e) {
      setMessage({
        type: 'error',
        text: `${t('sync.client.msg.saveErrorPrefix')}${e.message || e}`,
      });
    }

    const delay = clientSyncEnabled && !root ? 4000 : 2000;
    scheduleMessageClear(delay);
  }, [
    clientRoot,
    hosts,
    localIp,
    clientSyncEnabled,
    t,
    scheduleMessageClear,
    writeCachedRoot,
    setMessage,
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
      setMessage({
        type: 'info',
        text: t('sync.client.msg.noLocalHost'),
      });
      scheduleMessageClear(4000);
      return;
    }

    const root = String(clientRoot || '').trim();
    if (!root) {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.mustSetRoot'),
      });
      scheduleMessageClear(4000);
      return;
    }

    try {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.testRunning'),
      });

      const res = await checkSync(localIp, syncScopeOptions || undefined);

      if (res && (res.ok || res.status === 'in_sync' || res.status === 'desync')) {
        const added = Array.isArray(res?.added) ? res.added.length : Number(res?.addedCount ?? 0);
        const modified = Array.isArray(res?.modified)
          ? res.modified.length
          : Number(res?.modifiedCount ?? 0);
        const removed = Array.isArray(res?.removed)
          ? res.removed.length
          : Number(res?.deletedCount ?? 0);

        setMessage({
          type: 'ok',
          text: t('sync.client.msg.testOkCounts')
            .replace('{added}', added)
            .replace('{modified}', modified)
            .replace('{removed}', removed),
        });
      } else {
        setMessage({
          type: 'error',
          text: t('sync.client.msg.testError'),
        });
      }

      scheduleMessageClear(4000);
    } catch (e) {
      setMessage({
        type: 'error',
        text: `${t('sync.client.msg.testErrorPrefix')}${e.message || e}`,
      });
      scheduleMessageClear(5000);
    }
  }, [hosts, localIp, clientRoot, t, scheduleMessageClear, setMessage, syncScopeOptions]);

  const handleBrowseClient = React.useCallback(async () => {
    if (!window.electron || typeof window.electron.chooseFolder !== 'function') {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.chooseFolderUnavailable'),
      });
      scheduleMessageClear(2500);
      return;
    }

    try {
      const folder = await window.electron.chooseFolder();
      if (!folder) return;

      setClientRoot(folder);
      writeCachedRoot(folder);
      setClientSyncEnabled(true);
    } catch {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.chooseFolderError'),
      });
      scheduleMessageClear(2500);
    }
  }, [t, scheduleMessageClear, setMessage, writeCachedRoot]);

  return {
    clientRoot,
    setClientRoot,
    handleTestClient,
    handleBrowseClient,
  };
}

export { useSyncClientFlow };
