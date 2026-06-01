import { useEffect, useMemo, useState } from 'react';
import {
  postLibraryImportRemote,
  postLibraryImportRemotePreview,
} from '../utils/agent';
import { useTransientInfo } from './hooks/useTransientInfo';

function normalizeUid(uid) {
  return String(uid || '').trim().toLowerCase();
}

function normalizeFabPreviewStatus(item) {
  const raw = String(item?.status || item?.state || item?.kind || '').trim().toLowerCase();
  if (raw === 'new' || raw === 'added') return 'new';
  if (raw === 'modified' || raw === 'updated' || raw === 'update') return 'modified';
  if (item?.isNew) return 'new';
  if (item?.isModified) return 'modified';
  return 'modified';
}

function useConfigFabLibrary({ t, refreshCatalogStats, onLibraryImported, onNavigate }) {
  const [fabAuthConnected, setFabAuthConnected] = useState(false);
  const [fabAuthBusy, setFabAuthBusy] = useState(false);
  const {
    infoMsg: fabAuthMsg,
    infoMsgType: fabAuthMsgType,
    showInfo: showFabAuthMsg,
    clearInfo: clearFabAuthMsg,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 3000 });
  const [fabPreviewItems, setFabPreviewItems] = useState([]);
  const [fabSelection, setFabSelection] = useState({});
  const [fabPreviewBusy, setFabPreviewBusy] = useState(false);
  const [fabPreviewToken, setFabPreviewToken] = useState('');
  const [fabImporting, setFabImporting] = useState(false);
  const [fabImportDone, setFabImportDone] = useState(0);
  const [fabImportTotal, setFabImportTotal] = useState(0);
  const {
    infoMsg: fabRemoteImportMsg,
    infoMsgType: fabRemoteImportMsgType,
    showInfo: showFabRemoteImportMsg,
    clearInfo: clearFabRemoteImportMsg,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 3000 });
  const [fabRemoteImportBusy, setFabRemoteImportBusy] = useState(false);

  async function refreshFabAuthStatus() {
    if (typeof window.electron?.fabAuthStatus !== 'function') {
      setFabAuthConnected(false);
      return;
    }
    try {
      const res = await window.electron.fabAuthStatus();
      setFabAuthConnected(!!res?.connected);
    } catch {
      setFabAuthConnected(false);
    }
  }

  useEffect(() => {
    refreshFabAuthStatus();
  }, []);

  async function handleFabLogin() {
    if (fabAuthBusy) return;
    if (typeof window.electron?.fabLogin !== 'function') {
      showFabAuthMsg(t('config.resources.loginUnavailable'), 'error', 2500);
      return;
    }

    setFabAuthBusy(true);
    clearFabAuthMsg();

    try {
      const res = await window.electron.fabLogin();
      const connected = !!res?.connected;
      setFabAuthConnected(connected);
      showFabAuthMsg(
        connected
          ? t('config.resources.loginOk')
          : t('config.resources.loginError'),
        connected ? 'ok' : 'error'
      );
    } catch {
      showFabAuthMsg(t('config.resources.loginError'), 'error');
    } finally {
      setFabAuthBusy(false);
    }
  }

  async function handleFabLogout() {
    if (fabAuthBusy) return;
    if (typeof window.electron?.fabLogout !== 'function') {
      setFabAuthConnected(false);
      return;
    }
    setFabAuthBusy(true);
    try {
      await window.electron.fabLogout();
      setFabAuthConnected(false);
      setFabPreviewItems([]);
      setFabSelection({});
      setFabPreviewToken('');
      setFabImporting(false);
      setFabImportDone(0);
      setFabImportTotal(0);
    } finally {
      setFabAuthBusy(false);
    }
  }

  async function handleFabPreview() {
    if (fabPreviewBusy || fabRemoteImportBusy) return;
    if (!fabAuthConnected) {
      showFabRemoteImportMsg(t('config.resources.loginRequired'), 'error', 2500);
      return;
    }

    setFabPreviewBusy(true);
    clearFabRemoteImportMsg();
    setFabImporting(false);
    setFabImportDone(0);
    setFabImportTotal(0);
    setFabPreviewToken('');

    try {
      const res = await postLibraryImportRemotePreview({
        downloadThumbnails: false,
      });
      const ok = res && res.ok !== false;
      if (!ok) {
        const detail = String(res?.detail || res?.error || res?.status || '').trim();
        const base = t('resources.fabImport.previewError');
        showFabRemoteImportMsg(detail ? `${base} (${detail})` : base, 'error');
        return;
      }

      const list = Array.isArray(res?.items) ? res.items : [];
      const ignored = Array.isArray(res?.ignored) ? res.ignored : [];
      const ignoredSet = new Set(ignored.map((uid) => normalizeUid(uid)).filter(Boolean));
      const selection = {};
      list.forEach((item) => {
        const key = normalizeUid(item?.uid);
        if (!key) return;
        selection[key] = !ignoredSet.has(key);
      });
      setFabPreviewItems(list);
      setFabSelection(selection);
      setFabPreviewToken(String(res?.token || res?.previewToken || res?.cacheToken || ''));

      if (!list.length) {
        showFabRemoteImportMsg(t('resources.fabImport.empty'), 'info');
      } else {
        const selectedCount = Object.values(selection).filter(Boolean).length;
        showFabRemoteImportMsg(
          t('resources.fabImport.selectionCount', {
            selected: selectedCount,
            total: list.length,
          }),
          'ok'
        );
      }
    } catch (e) {
      const detail = String(e?.message || e || '').trim();
      const base = t('resources.fabImport.previewError');
      showFabRemoteImportMsg(detail ? `${base} (${detail})` : base, 'error');
      setFabPreviewToken('');
    } finally {
      setFabPreviewBusy(false);
    }
  }

  async function handleFabRemoteImport() {
    if (fabRemoteImportBusy || fabImporting) return;
    if (!fabAuthConnected) {
      showFabRemoteImportMsg(t('config.resources.loginRequired'), 'error', 2500);
      return;
    }

    const selected = [];
    const ignored = [];
    for (const item of fabPreviewItems) {
      const key = normalizeUid(item?.uid);
      if (!key) continue;
      if (fabSelection[key]) selected.push(key);
      else ignored.push(key);
    }

    if (selected.length === 0) {
      setFabRemoteImportBusy(false);
      showFabRemoteImportMsg(t('resources.fabImport.noSelection'), 'error', 2500);
      return;
    }

    const visibleUids = [...selected, ...ignored];
    let importedTotal = 0;
    let skippedTotal = 0;
    let processed = 0;
    let failed = false;

    setFabRemoteImportBusy(true);
    clearFabRemoteImportMsg();
    setFabImporting(true);
    setFabImportDone(0);
    setFabImportTotal(selected.length);

    try {
      for (const uid of selected) {
        const res = await postLibraryImportRemote({
          selectedUids: [uid],
          ignoredUids: ignored,
          visibleUids,
          previewToken: fabPreviewToken,
          downloadThumbnails: true,
        });
        const ok = res && res.ok !== false;
        if (!ok) {
          const detail = String(res?.detail || res?.error || res?.status || '').trim();
          const base = t('config.resources.remoteImportError');
          showFabRemoteImportMsg(detail ? `${base} (${detail})` : base, 'error');
          failed = true;
          break;
        }

        importedTotal += Number(res?.imported || 0);
        skippedTotal += Number(res?.skipped || 0);
        processed += 1;
        setFabImportDone(processed);
        setFabPreviewItems((prev) =>
          prev.filter((row) => normalizeUid(row?.uid) !== uid)
        );
        setFabSelection((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }

      if (!failed) {
        showFabRemoteImportMsg(
          t('config.resources.remoteImportResult', {
            imported: importedTotal,
            skipped: skippedTotal,
          }),
          'ok'
        );
        refreshCatalogStats?.();
        if (typeof onLibraryImported === 'function' && importedTotal > 0) {
          onLibraryImported();
        }
        await handleFabLogout();
        if (typeof onNavigate === 'function') {
          onNavigate('Ressources', { force: true });
        }
      }
    } catch {
      if (!failed) {
        showFabRemoteImportMsg(t('config.resources.remoteImportError'), 'error');
      }
    } finally {
      setFabRemoteImportBusy(false);
      setFabImporting(false);
    }
  }

  const fabSelectedCount = useMemo(() => {
    if (!fabPreviewItems.length) return 0;
    let count = 0;
    for (const item of fabPreviewItems) {
      const key = normalizeUid(item?.uid);
      if (key && fabSelection[key]) count += 1;
    }
    return count;
  }, [fabPreviewItems, fabSelection]);

  const fabSelectableCount = useMemo(() => {
    if (!fabPreviewItems.length) return 0;
    let count = 0;
    for (const item of fabPreviewItems) {
      if (normalizeUid(item?.uid)) count += 1;
    }
    return count;
  }, [fabPreviewItems]);

  const fabAllSelected = fabSelectableCount > 0 && fabSelectedCount === fabSelectableCount;
  const fabHasPreview = fabPreviewItems.length > 0;
  const fabShowControls = fabHasPreview || fabImporting;
  const fabShowImportProgress = fabImporting;
  const fabRemainingCount = Math.max(fabImportTotal - fabImportDone, 0);
  const fabCountLabel = fabShowImportProgress
    ? t('resources.fabImport.importCount', { imported: fabImportDone, total: fabImportTotal })
    : t('resources.fabImport.selectionCount', { selected: fabSelectedCount, total: fabSelectableCount });
  const fabRemainingLabel = fabShowImportProgress
    ? t('resources.fabImport.remainingCount', { count: fabRemainingCount })
    : '';

  const fabPreviewNewItems = useMemo(
    () => fabPreviewItems.filter((item) => normalizeFabPreviewStatus(item) === 'new'),
    [fabPreviewItems]
  );
  const fabPreviewUpdatedItems = useMemo(
    () => fabPreviewItems.filter((item) => normalizeFabPreviewStatus(item) === 'modified'),
    [fabPreviewItems]
  );

  return {
    fabAuthConnected,
    fabAuthBusy,
    fabAuthMsg,
    fabAuthMsgType,
    fabPreviewItems,
    fabSelection,
    setFabSelection,
    fabPreviewBusy,
    fabImporting,
    fabImportDone,
    fabImportTotal,
    fabRemoteImportMsg,
    fabRemoteImportMsgType,
    fabRemoteImportBusy,
    refreshFabAuthStatus,
    handleFabLogin,
    handleFabLogout,
    handleFabPreview,
    handleFabRemoteImport,
    fabSelectedCount,
    fabSelectableCount,
    fabAllSelected,
    fabHasPreview,
    fabShowControls,
    fabShowImportProgress,
    fabRemainingCount,
    fabCountLabel,
    fabRemainingLabel,
    fabPreviewNewItems,
    fabPreviewUpdatedItems,
    normalizeUid,
  };
}

export { useConfigFabLibrary };
