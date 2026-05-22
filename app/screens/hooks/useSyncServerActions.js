import React from 'react';

import {
  checkSync,
  copySync,
  updateSyncIgnore,
  getSyncIgnoreForHost,
  getHosts,
} from '../../utils/agent';
import {
  safeStr,
  normalizeRel,
  normalizeKey,
  normalizeRenderScopeProjects,
  normalizeRenderCopyProjects,
} from '../synchronisationHelpers';

function useSyncServerActions({
  isRenderMode,
  syncScopeOptions,
  t,
  setMessage,
  scheduleMessageClear,
  requestConfirm,
  setHosts,
}) {
  const [syncStatus, setSyncStatus] = React.useState({});
  const [syncDetails, setSyncDetails] = React.useState({});
  const [syncCopyProjects, setSyncCopyProjects] = React.useState({});
  const [syncDiffs, setSyncDiffs] = React.useState({});
  const [diffFoldState, setDiffFoldState] = React.useState({});
  const [selectionState, setSelectionState] = React.useState({});

  const handleCheckHost = React.useCallback(
    async (ip) => {
      if (!ip) return;

      setSyncStatus((prev) => ({ ...prev, [ip]: 'checking' }));
      setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
      setSyncDiffs((prev) => ({
        ...prev,
        [ip]: { added: [], modified: [], removed: [], renderProjects: [] },
      }));
      setSelectionState((prev) => ({
        ...prev,
        [ip]: { added: {}, modified: {}, removed: {} },
      }));

      try {
        const checkPromise = isRenderMode
          ? checkSync(ip, syncScopeOptions || undefined)
          : checkSync(ip);
        const [res, ignoredList] = await Promise.all([
          checkPromise,
          isRenderMode ? Promise.resolve([]) : getSyncIgnoreForHost(ip).catch(() => []),
        ]);

        const status = res && (res.status || res.state);
        const diffEffective =
          typeof res?.effectiveDiffCount === 'number'
            ? res.effectiveDiffCount
            : typeof res?.diffCount === 'number'
            ? res.diffCount
            : null;
        const diffRaw =
          typeof res?.rawDiffCount === 'number'
            ? res.rawDiffCount
            : typeof res?.diffCount === 'number'
            ? res.diffCount
            : null;

        const renderProjects = isRenderMode ? normalizeRenderScopeProjects(res) : [];
        const added = isRenderMode ? [] : Array.isArray(res?.added) ? res.added : [];
        const modified = isRenderMode ? [] : Array.isArray(res?.modified) ? res.modified : [];
        const removed = isRenderMode ? [] : Array.isArray(res?.removed) ? res.removed : [];

        setSyncDiffs((prev) => ({
          ...prev,
          [ip]: { added, modified, removed, renderProjects },
        }));

        const ignoreSet = new Set((ignoredList || []).map((s) => normalizeKey(s)).filter(Boolean));

        const makeSelectionMap = (list) =>
          list.reduce(
            (m, rel) => ({
              ...m,
              [rel]: isRenderMode ? true : ignoreSet.has(normalizeKey(rel)) ? false : true,
            }),
            {}
          );

        setSelectionState((prev) => ({
          ...prev,
          [ip]: {
            added: makeSelectionMap(added),
            modified: makeSelectionMap(modified),
            removed: makeSelectionMap(removed),
          },
        }));

        if (status === 'in_sync') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'in_sync' }));
          const displayDiff = diffRaw;
          const diffText =
            displayDiff === 0
              ? t('sync.server.msg.checkNoDiff')
              : displayDiff != null
              ? t('sync.server.msg.checkWithDiff').replace('{diff}', String(displayDiff))
              : t('sync.server.msg.checkResult');
          setSyncDetails((prev) => ({
            ...prev,
            [ip]:
              isRenderMode && Number(res?.projectCount || 0) > 0
                ? `${diffText} (${Number(res?.projectCount || 0)} projet(s))`
                : diffText,
          }));
        } else if (status === 'desync') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'desync' }));
          const displayDiff = diffEffective != null ? diffEffective : diffRaw;
          const diffText =
            displayDiff != null
              ? t('sync.server.msg.checkDesyncWithDiff').replace('{diff}', String(displayDiff))
              : t('sync.server.msg.checkDesyncGeneric');
          setSyncDetails((prev) => ({
            ...prev,
            [ip]:
              isRenderMode && Number(res?.projectCount || 0) > 0
                ? `${diffText} (${Number(res?.projectCount || 0)} projet(s))`
                : diffText,
          }));
        } else if (status === 'no_root') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'no_root' }));
          setSyncDetails((prev) => ({
            ...prev,
            [ip]: res?.message || t('sync.server.msg.checkNoRoot'),
          }));
        } else if (status === 'no_projects') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'in_sync' }));
          setSyncDetails((prev) => ({
            ...prev,
            [ip]: res?.message || 'Aucun projet en rendu automatique.',
          }));
        } else if (status === 'no_source') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'desync' }));
          setSyncDetails((prev) => ({
            ...prev,
            [ip]: res?.message || 'Source de verite absente pour au moins un projet.',
          }));
        } else if (status === 'error') {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
          setSyncDetails((prev) => ({
            ...prev,
            [ip]: res?.message || t('sync.server.msg.checkErrorGeneric'),
          }));
        } else {
          setSyncStatus((prev) => ({ ...prev, [ip]: 'unknown' }));
          setSyncDetails((prev) => ({
            ...prev,
            [ip]: res?.message || t('sync.server.msg.checkUnknown'),
          }));
        }
      } catch (e) {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: e?.message || t('sync.server.msg.checkErrorGeneric'),
        }));
        setSyncDiffs((prev) => ({
          ...prev,
          [ip]: { added: [], modified: [], removed: [], renderProjects: [] },
        }));
        setSelectionState((prev) => ({
          ...prev,
          [ip]: { added: {}, modified: {}, removed: {} },
        }));
      }
    },
    [isRenderMode, syncScopeOptions, t]
  );

  const toggleFileSelection = React.useCallback(
    async (ip, type, rel) => {
      if (isRenderMode) return;
      if (!ip || !type || !rel) return;

      const current = selectionState[ip] || { added: {}, modified: {}, removed: {} };
      const original = {
        added: { ...(current.added || {}) },
        modified: { ...(current.modified || {}) },
        removed: { ...(current.removed || {}) },
      };

      const next = {
        added: { ...original.added },
        modified: { ...original.modified },
        removed: { ...original.removed },
      };

      const map = next[type] || {};
      const prevVal = map[rel] !== undefined ? map[rel] : true;
      const nextVal = !prevVal;
      map[rel] = nextVal;

      const norm = normalizeRel(rel);
      const addList = nextVal === false ? [norm] : [];
      const removeList = nextVal === false ? [] : [norm];

      setSelectionState((prev) => ({
        ...prev,
        [ip]: {
          ...next,
          [type]: map,
        },
      }));

      if (addList.length || removeList.length) {
        console.debug('[sync] toggle selection -> updateSyncIgnore', ip, { addList, removeList });
        try {
          const resp = await updateSyncIgnore(ip, addList, removeList);
          if (resp && resp.ok === false) {
            throw new Error(resp.message || 'updateSyncIgnore failed');
          }
        } catch (e) {
          console.warn('updateSyncIgnore toggleFileSelection failed', e);
          setSelectionState((prev) => ({ ...prev, [ip]: original }));
          setMessage({
            type: 'error',
            text: `${t('sync.server.msg.checkErrorGeneric')} (${e?.message || e})`,
          });
          scheduleMessageClear(2000);
        }
      }
    },
    [isRenderMode, selectionState, setMessage, scheduleMessageClear, t]
  );

  const toggleDiffSection = React.useCallback((ip, type) => {
    if (!ip || !type) return;

    setDiffFoldState((prev) => {
      const current = prev[ip] || { added: true, modified: true, removed: true };
      return {
        ...prev,
        [ip]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  }, []);

  const bulkSelectDiff = React.useCallback(
    async (ip, type, check) => {
      if (isRenderMode) return;
      if (!ip || !type) return;

      const current = selectionState[ip] || { added: {}, modified: {}, removed: {} };
      const original = {
        added: { ...(current.added || {}) },
        modified: { ...(current.modified || {}) },
        removed: { ...(current.removed || {}) },
      };

      const diffs = syncDiffs[ip] || {};
      const list =
        type === 'added'
          ? diffs.added || []
          : type === 'modified'
          ? diffs.modified || []
          : diffs.removed || [];

      const nextType = { ...(current[type] || {}) };
      const addList = [];
      const removeList = [];

      for (const rel of list) {
        const prevVal = nextType[rel] !== undefined ? nextType[rel] : true;
        const nextVal = !!check;
        nextType[rel] = nextVal;
        if (prevVal !== nextVal) {
          const norm = normalizeRel(rel);
          if (nextVal === false) addList.push(norm);
          else removeList.push(norm);
        }
      }

      const nextSelection = {
        added: type === 'added' ? nextType : { ...(current.added || {}) },
        modified: type === 'modified' ? nextType : { ...(current.modified || {}) },
        removed: type === 'removed' ? nextType : { ...(current.removed || {}) },
      };

      setSelectionState((prev) => ({
        ...prev,
        [ip]: nextSelection,
      }));

      if (addList.length || removeList.length) {
        try {
          const resp = await updateSyncIgnore(ip, addList, removeList);
          if (resp && resp.ok === false) {
            throw new Error(resp.message || 'updateSyncIgnore failed');
          }
        } catch (e) {
          console.warn('updateSyncIgnore bulkSelectDiff failed', e);
          setSelectionState((prev) => ({ ...prev, [ip]: original }));
          setMessage({
            type: 'error',
            text: `${t('sync.server.msg.checkErrorGeneric')} (${e?.message || e})`,
          });
          scheduleMessageClear(2000);
        }
      }
    },
    [isRenderMode, selectionState, setMessage, scheduleMessageClear, syncDiffs, t]
  );

  const handleCopyHost = React.useCallback(
    async (ip) => {
      if (!ip) return;

      if (isRenderMode) {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'copying' }));
        setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
        setMessage({
          type: 'info',
          text: t('sync.server.msg.copyStart').replace('{ip}', String(ip)),
        });
        try {
          const res = await copySync(ip, null, syncScopeOptions || undefined);
          if (!res || res.ok === false) {
            const msg = (res && (res.message || res.error)) || t('sync.server.msg.copyError');
            setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
            setSyncDetails((prev) => ({ ...prev, [ip]: msg }));
            setMessage({ type: 'error', text: msg });
            scheduleMessageClear(4000);
            return;
          }

          const copyRows = normalizeRenderCopyProjects(res);
          setSyncCopyProjects((prev) => ({
            ...prev,
            [ip]: {
              at: new Date().toISOString(),
              rows: copyRows,
            },
          }));

          const projectCount = Number(res?.projectCount || 0);
          const summary = `Sync rendu OK: ${projectCount} projet(s), ${Number(res?.addedCount ?? 0)} nouveaux, ${Number(res?.modifiedCount ?? 0)} modifies, ${Number(res?.deletedCount ?? 0)} supprimes.`;
          setMessage({ type: 'ok', text: summary });
          scheduleMessageClear(3500);
          await handleCheckHost(ip);
        } catch (e) {
          const detail = String(e?.message || t('sync.server.msg.copyErrorGeneric'));
          setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
          setSyncDetails((prev) => ({ ...prev, [ip]: detail }));
          setMessage({
            type: 'error',
            text: `${t('sync.server.msg.copyErrorPrefix')}${detail}`,
          });
          scheduleMessageClear(4000);
        }
        return;
      }

      const diffs = syncDiffs[ip] || {};
      const sel = selectionState[ip] || {};

      const added = Array.isArray(diffs.added) ? diffs.added : [];
      const modified = Array.isArray(diffs.modified) ? diffs.modified : [];
      const removed = Array.isArray(diffs.removed) ? diffs.removed : [];

      try {
        const sel2 = selectionState[ip] || {};
        const addList = [];

        const lists = [
          { list: sel2.added || {} },
          { list: sel2.modified || {} },
          { list: sel2.removed || {} },
        ];

        lists.forEach(({ list }) => {
          Object.entries(list).forEach(([rel, state]) => {
            const boolState = state !== false;
            if (boolState === false) addList.push(normalizeRel(rel));
          });
        });

        if (addList.length > 0) {
          console.debug('[sync] updateSyncIgnore (UI) addList', ip, addList);
          const resp = await updateSyncIgnore(ip, addList, []);
          if (resp && resp.ok === false) {
            throw new Error(resp.message || 'updateSyncIgnore failed');
          }
        }
      } catch (err) {
        console.warn('updateSyncIgnore échoué:', err);
        setMessage({
          type: 'error',
          text: `${t('sync.server.msg.checkErrorGeneric')} (${err?.message || err})`,
        });
        scheduleMessageClear(2000);
        return;
      }

      const hasDiffs = added.length > 0 || modified.length > 0 || removed.length > 0;
      let payload = null;

      if (hasDiffs) {
        const selAdded = sel.added || {};
        const selModified = sel.modified || {};
        const selRemoved = sel.removed || {};

        const toAdd = added.filter((rel) => selAdded[rel] !== false);
        const toMod = modified.filter((rel) => selModified[rel] !== false);
        const toRem = removed.filter((rel) => selRemoved[rel] !== false);

        if (toRem.length > 0) {
          const msg =
            toRem.length === 1
              ? `Cette synchronisation va supprimer 1 fichier sur ${ip}. Continuer ?`
              : `Cette synchronisation va supprimer ${toRem.length} fichiers sur ${ip}. Continuer ?`;

          const ok = await requestConfirm(msg);
          if (!ok) return;
        }

        if (toAdd.length === 0 && toMod.length === 0 && toRem.length === 0) {
          setMessage({
            type: 'info',
            text: t('sync.server.noFilesSelected'),
          });
          scheduleMessageClear(3000);
          return;
        }

        payload = {
          added: toAdd,
          modified: toMod,
          removed: toRem,
        };
      }

      setSyncStatus((prev) => ({ ...prev, [ip]: 'copying' }));
      setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
      setMessage({
        type: 'info',
        text: t('sync.server.msg.copyStart').replace('{ip}', String(ip)),
      });

      try {
        const res = await copySync(ip, payload || undefined);

        if (!res || res.ok === false) {
          const msg = (res && (res.message || res.error)) || t('sync.server.msg.copyError');

          setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
          setSyncDetails((prev) => ({ ...prev, [ip]: msg }));
          setMessage({ type: 'error', text: msg });
          scheduleMessageClear(4000);
          return;
        }

        try {
          const refreshed = await getHosts();
          const list = (Array.isArray(refreshed) ? refreshed : []).filter(
            (h) => h && typeof h === 'object' && safeStr(h.ip || h.address, '')
          );
          setHosts(list);
        } catch (e) {
          console.warn('getHosts after copy failed', e);
        }

        const summary =
          t('sync.server.msg.copySummary')
            .replace('{added}', Number(res?.addedCount ?? 0))
            .replace('{modified}', Number(res?.modifiedCount ?? 0))
            .replace('{deleted}', Number(res?.deletedCount ?? 0)) ||
          (res && res.summaryText && String(res.summaryText)) ||
          t('sync.server.msg.copyDone');

        setMessage({
          type: 'ok',
          text: summary,
        });
        scheduleMessageClear(3000);

        await handleCheckHost(ip);
      } catch (e) {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));

        let detail = '';
        if (e && typeof e === 'object') {
          const errCode = e.error || e.code || '';
          if (errCode === 'write_error') {
            detail = t('sync.server.msg.copyWriteError');
          } else if (e.message) {
            detail = String(e.message);
          }
        }
        if (!detail) {
          detail = t('sync.server.msg.copyErrorGeneric');
        }

        setSyncDetails((prev) => ({
          ...prev,
          [ip]: detail,
        }));
        setMessage({
          type: 'error',
          text: `${t('sync.server.msg.copyErrorPrefix')}${detail}`,
        });
        scheduleMessageClear(4000);
      }
    },
    [
      handleCheckHost,
      isRenderMode,
      requestConfirm,
      scheduleMessageClear,
      selectionState,
      setHosts,
      setMessage,
      syncDiffs,
      syncScopeOptions,
      t,
    ]
  );

  return {
    syncStatus,
    syncDetails,
    syncCopyProjects,
    syncDiffs,
    diffFoldState,
    syncSelection: selectionState,
    handleCheckHost,
    toggleFileSelection,
    toggleDiffSection,
    bulkSelectDiff,
    handleCopyHost,
  };
}

export { useSyncServerActions };
