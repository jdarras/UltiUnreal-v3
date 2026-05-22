import React from 'react';
import {
  getCommon,
  getHosts,
  getProjects,
  postHost,
  setProjectAssociation,
} from '../../utils/agent';
import {
  buildEditorsSignature,
  extractEditorsForHost,
  extractVersionsFromHosts,
} from '../setupHelpers';

function useSetupClientLifecycle({
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
}) {
  React.useEffect(() => {
    if (role !== 'client') return;
    let stopped = false;

    (async () => {
      try {
        const [common, hosts] = await Promise.all([
          getCommon().catch(() => ({})),
          getHosts().catch(() => []),
        ]);
        if (stopped) return;

        const cachedEditorKeys = Object.keys(clientEditors || {}).filter(Boolean);
        const cachedVers = readCachedVersions();
        const versFromCommon =
          Array.isArray(common?.unrealVersions) && common.unrealVersions.length
            ? common.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
            : [];

        if (versFromCommon.length) {
          setClientVersions(versFromCommon);
          writeCachedVersions(versFromCommon);
        }

        const versFromHosts = extractVersionsFromHosts(hosts);
        const versionSet = new Set([
          ...versFromCommon,
          ...versFromHosts,
          ...cachedEditorKeys,
          ...cachedVers,
        ]);

        const localHost =
          hosts.find(
            (h) =>
              h &&
              String(h.ip || h.address || '').trim().toLowerCase() ===
                String(localIp || '').trim().toLowerCase()
          ) ||
          (hosts.length === 1 ? hosts[0] : null);

        setClientHostExists(!!localHost);

        if (localHost) {
          const editors = extractEditorsForHost(localHost);
          setClientEditors(editors);
          writeCachedEditors(editors);
          const editorKeys = Object.keys(editors).filter(Boolean);
          editorKeys.forEach((v) => versionSet.add(v));
          const enabled =
            typeof localHost.syncEnabled === 'boolean'
              ? localHost.syncEnabled
              : !!localHost.syncRoot;
          setClientSyncState(enabled);
          writeCachedSync(enabled);
        } else {
          const cached = readCachedEditors();
          if (Object.keys(cached).length > 0) {
            setClientEditors(cached);
            Object.keys(cached).forEach((v) => versionSet.add(v));
          }
          const cachedSync = readCachedSync();
          if (cachedSync !== null) {
            setClientSyncState(cachedSync);
          }
        }

        const finalVers = Array.from(versionSet).filter(Boolean);
        if (finalVers.length) {
          setClientVersions(finalVers);
          writeCachedVersions(finalVers);
        } else if (versFromCommon.length) {
          setClientVersions(versFromCommon);
          writeCachedVersions(versFromCommon);
        }
      } catch {
        const cachedEditors = readCachedEditors();
        if (Object.keys(cachedEditors).length) {
          setClientEditors(cachedEditors);
          setClientVersions(Object.keys(cachedEditors).filter(Boolean));
        }
        const cachedVers = readCachedVersions();
        if (cachedVers.length) setClientVersions(cachedVers);
        const cachedSync = readCachedSync();
        if (cachedSync !== null) {
          setClientSyncState(cachedSync);
        }
      } finally {
        if (!stopped) setVersionsLoaded(true);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [
    role,
    localIp,
    onClientSyncChange,
    clientEditors,
    readCachedEditors,
    readCachedSync,
    readCachedVersions,
    setClientHostExists,
    setClientEditors,
    setClientSyncState,
    setClientVersions,
    setVersionsLoaded,
    writeCachedEditors,
    writeCachedSync,
    writeCachedVersions,
  ]);

  const saveClientEditors = React.useCallback(
    async (editorsOverride = null) => {
      if (!localIp) {
        showClientTransientMessage(t('setup.client.msg.localIpMissing'), 'error', 2500);
        return;
      }

      const sourceEditors =
        editorsOverride && typeof editorsOverride === 'object'
          ? editorsOverride
          : clientEditors;

      const payload = { unrealEditors: {}, syncEnabled: !!clientSyncState };
      const versionsForSave = clientVersions.length
        ? clientVersions
        : Object.keys(sourceEditors || {}).filter(Boolean);
      versionsForSave.forEach((ver) => {
        const v = String(ver || '').trim();
        if (v) {
          payload.unrealEditors[v] = String(sourceEditors[v] || '').trim();
        }
      });

      const payloadSig = (() => {
        const entries = Object.entries(payload.unrealEditors)
          .map(([k, v]) => `${String(k || '').trim()}:${String(v || '').trim()}`)
          .sort((a, b) =>
            String(a || '').localeCompare(String(b || ''), undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          );
        return `${payload.syncEnabled ? '1' : '0'}|${entries.join('|')}`;
      })();

      if (payloadSig === lastClientSaveSigRef.current) return;

      writeCachedEditors(payload.unrealEditors);
      writeCachedSync(payload.syncEnabled);

      if (!clientHostExists) {
        showClientTransientMessage(t('setup.client.msg.hostMissingOnServer'), 'error', 2500);
        return;
      }

      try {
        const result = await postHost(localIp, payload);
        const ok = result && result.ok !== false;
        if (ok) {
          lastClientSaveSigRef.current = payloadSig;
        }

        showClientTransientMessage(
          ok ? t('setup.client.msg.saveOk') : t('setup.client.msg.saveError'),
          ok ? 'ok' : 'error',
          2500
        );

        if (!ok) return;

        try {
          const hosts = await getHosts().catch(() => []);
          const localHost = (hosts || []).find(
            (h) =>
              h &&
              String(h.ip || h.address || '').trim().toLowerCase() ===
                String(localIp || '').trim().toLowerCase()
          );
          if (!localHost) return;

          const editors = extractEditorsForHost(localHost);
          setClientEditors((prev) => {
            const prevSig = buildEditorsSignature(prev);
            const nextSig = buildEditorsSignature(editors);
            return prevSig === nextSig ? prev : editors;
          });
          writeCachedEditors(editors);
        } catch {}
      } catch {
        showClientTransientMessage(t('setup.client.msg.saveError'), 'error', 2500);
      }
    },
    [
      localIp,
      t,
      clientEditors,
      clientVersions,
      clientSyncState,
      clientHostExists,
      lastClientSaveSigRef,
      writeCachedEditors,
      writeCachedSync,
      showClientTransientMessage,
      setClientEditors,
    ]
  );

  const handleClientToggleSync = React.useCallback(
    async (event) => {
      const enabled = !!event?.target?.checked;
      setClientSyncState(enabled);
      writeCachedSync(enabled);

      if (typeof onClientSyncChange === 'function') {
        onClientSyncChange(enabled);
      }

      if (!localIp) {
        showClientTransientMessage(t('setup.client.msg.localIpMissing'), 'error', 2500);
        return;
      }

      if (!clientHostExists) {
        showClientTransientMessage(t('setup.client.msg.hostMissingOnServer'), 'error', 2500);
        return;
      }

      try {
        const assocPath = !enabled ? readCachedAssoc() : '';
        const result = await postHost(localIp, {
          syncEnabled: enabled,
          ...(assocPath ? { uproject: assocPath } : {}),
        });
        const ok = result && result.ok !== false;

        if (ok && !enabled && assocPath) {
          try {
            const projectData = await getProjects().catch(() => ({}));
            const activeId = String(projectData?.activeId || '').trim();
            const activeName = String(projectData?.activeName || '').trim();
            const projectKey = activeId || activeName;
            if (projectKey) {
              await setProjectAssociation(localIp, projectKey, assocPath);
            }
          } catch (error) {
            console.warn('sync disable: setProjectAssociation failed', error);
          }
        }

        showClientTransientMessage(
          ok
            ? enabled
              ? t('setup.client.msg.syncEnabled')
              : t('setup.client.msg.syncDisabled')
            : t('setup.client.msg.syncUpdateError'),
          ok ? 'ok' : 'error',
          2500
        );
      } catch {
        showClientTransientMessage(t('setup.client.msg.syncUpdateError'), 'error', 2500);
      }
    },
    [
      localIp,
      t,
      clientHostExists,
      onClientSyncChange,
      readCachedAssoc,
      setClientSyncState,
      showClientTransientMessage,
      writeCachedSync,
    ]
  );

  return {
    saveClientEditors,
    handleClientToggleSync,
  };
}

export { useSetupClientLifecycle };
