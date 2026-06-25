import React from 'react';
import { getHosts, postHost } from '../utils/agent';
import { toTrimmedString } from '../utils/coerce';
import { useTransientInfo } from './hooks/useTransientInfo';
import { findLocalHost } from './configLocalSyncHelpers';

function useConfigLocalSyncSettings({
  localIp = '',
  localName = '',
  t,
  enabled = true,
} = {}) {
  const [syncEnabled, setSyncEnabled] = React.useState(false);
  const [syncRoot, setSyncRoot] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const saveTimerRef = React.useRef(null);
  const saveReadyRef = React.useRef(false);
  const saveQueueRef = React.useRef(Promise.resolve());
  const resolvedHostIpRef = React.useRef('');
  const {
    infoMsg: msgText,
    infoMsgType: msgType,
    showInfo,
    clearInfo,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 2500 });

  const loadLocalSyncSettings = React.useCallback(async () => {
    if (!enabled) {
      setInitialized(false);
      saveReadyRef.current = false;
      return;
    }
    const ip = toTrimmedString(localIp);
    if (!ip && !toTrimmedString(localName)) {
      setInitialized(true);
      return;
    }
    setInitialized(false);
    saveReadyRef.current = false;
    setLoading(true);
    try {
      const hosts = await getHosts().catch(() => []);
      const localHost = findLocalHost(hosts, ip, localName);
      resolvedHostIpRef.current = toTrimmedString(localHost?.ip || localHost?.address || ip);
      const root = typeof localHost?.syncRoot === 'string' ? localHost.syncRoot : '';
      const active = typeof localHost?.syncEnabled === 'boolean'
        ? localHost.syncEnabled
        : !!root;
      setSyncRoot(root);
      setSyncEnabled(active);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [enabled, localIp, localName]);

  React.useEffect(() => {
    loadLocalSyncSettings();
  }, [loadLocalSyncSettings]);

  const saveLocalSyncSettings = React.useCallback(async () => {
    const ip = toTrimmedString(resolvedHostIpRef.current || localIp);
    const root = toTrimmedString(syncRoot);
    const active = !!syncEnabled;
    if (!ip) {
      showInfo(t('config.sync.msg.noLocalIp'), 'error', 3000);
      return;
    }
    if (active && !root) {
      showInfo(t('config.sync.msg.missingRoot'), 'error', 2500);
      return;
    }
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const res = await postHost(ip, { syncRoot: root, syncEnabled: active });
        if (!res || res.ok === false) {
          throw new Error(res?.error || 'save_failed');
        }
        showInfo(t('config.sync.msg.saved'), 'ok', 2500);
        window.dispatchEvent(new CustomEvent('ultiunreal:sync-state-changed'));
      })
      .catch((e) => {
        showInfo(`${t('config.sync.msg.saveErrorPrefix')}${e?.message || e}`, 'error', 3500);
      });
    await saveQueueRef.current;
  }, [localIp, showInfo, syncEnabled, syncRoot, t]);

  React.useEffect(() => {
    if (!enabled || !initialized) return undefined;
    if (!saveReadyRef.current) {
      saveReadyRef.current = true;
      return undefined;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveLocalSyncSettings();
    }, 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled, initialized, saveLocalSyncSettings, syncEnabled, syncRoot]);

  const browseSyncRoot = React.useCallback(async () => {
    if (!window.electron || typeof window.electron.chooseFolder !== 'function') {
      showInfo(t('config.sync.msg.chooseFolderUnavailable'), 'error', 2500);
      return;
    }
    try {
      const folder = await window.electron.chooseFolder();
      const picked = toTrimmedString(folder);
      if (!picked) return;
      setSyncRoot(picked);
      setSyncEnabled(true);
      clearInfo();
    } catch {
      showInfo(t('config.sync.msg.chooseFolderError'), 'error', 2500);
    }
  }, [clearInfo, showInfo, t]);

  return {
    syncEnabled,
    setSyncEnabled,
    syncRoot,
    setSyncRoot,
    loading,
    message: msgText ? { text: msgText, type: msgType } : null,
    loadLocalSyncSettings,
    browseSyncRoot,
  };
}

export { useConfigLocalSyncSettings };
