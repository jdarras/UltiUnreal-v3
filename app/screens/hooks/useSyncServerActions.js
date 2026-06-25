import React from 'react';

import {
  checkSync,
  copySync,
  updateSyncIgnore,
  getSyncIgnoreForHost,
  getHosts,
} from '../../utils/agent';
import {
  normalizeRel,
  normalizeKey,
  normalizeRenderScopeProjects,
  normalizeRenderCopyProjects,
} from '../synchronisationHelpers';
import { normalizeSyncHosts } from './syncDataNormalization';
import { useSyncMessagePublisher } from './useSyncMessagePublisher';

const DIFF_TYPES = ['added', 'modified', 'removed'];

function withRenderProjectCount(text, isRenderMode, projectCount, t) {
  if (isRenderMode && Number(projectCount || 0) > 0) {
    return `${text}${t('sync.render.msg.projectCountSuffix', { count: Number(projectCount || 0) })}`;
  }
  return text;
}

function buildSyncCheckOutcome({
  status,
  res,
  diffRaw,
  diffEffective,
  isRenderMode,
  t,
}) {
  if (status === 'in_sync') {
    const displayDiff = diffRaw;
    const diffText =
      displayDiff === 0
        ? t('sync.server.msg.checkNoDiff')
        : displayDiff != null
        ? t('sync.server.msg.checkWithDiff').replace('{diff}', String(displayDiff))
        : t('sync.server.msg.checkResult');
    return {
      status: 'in_sync',
      detail: withRenderProjectCount(diffText, isRenderMode, res?.projectCount, t),
    };
  }

  if (status === 'desync') {
    const displayDiff = diffEffective != null ? diffEffective : diffRaw;
    const diffText =
      displayDiff != null
        ? t('sync.server.msg.checkDesyncWithDiff').replace('{diff}', String(displayDiff))
        : t('sync.server.msg.checkDesyncGeneric');
    return {
      status: 'desync',
      detail: withRenderProjectCount(diffText, isRenderMode, res?.projectCount, t),
    };
  }

  if (status === 'conflict') {
    const displayDiff = diffEffective != null ? diffEffective : diffRaw;
    return {
      status: 'conflict',
      detail: withRenderProjectCount(
        t('sync.server.msg.checkConflict', { diff: displayDiff ?? 0 }),
        isRenderMode,
        res?.projectCount,
        t
      ),
    };
  }

  if (status === 'no_root') {
    return { status: 'no_root', detail: res?.message || t('sync.server.msg.checkNoRoot') };
  }

  if (status === 'no_projects') {
    return { status: 'in_sync', detail: res?.message || t('sync.render.msg.noAutoProjects') };
  }

  if (status === 'no_source') {
    return {
      status: 'no_source',
      detail: res?.message || t('sync.render.msg.noSourceTruth'),
    };
  }

  if (status === 'error') {
    return { status: 'error', detail: res?.message || t('sync.server.msg.checkErrorGeneric') };
  }

  return { status: 'unknown', detail: res?.message || t('sync.server.msg.checkUnknown') };
}

function normalizeHostDiffsFromCheckResult(res, isRenderMode) {
  if (isRenderMode) {
    return {
      renderProjects: normalizeRenderScopeProjects(res),
      added: [],
      modified: [],
      removed: [],
    };
  }
  return {
    renderProjects: [],
    added: Array.isArray(res?.added) ? res.added : [],
    modified: Array.isArray(res?.modified) ? res.modified : [],
    removed: Array.isArray(res?.removed) ? res.removed : [],
  };
}

function buildDiffSelectionMap(list = [], isRenderMode, ignoreSet) {
  const map = {};
  list.forEach((rel) => {
    map[rel] = isRenderMode ? true : !ignoreSet.has(normalizeKey(rel));
  });
  return map;
}

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
  const checkInFlightRef = React.useRef(new Set());
  const copyInFlightRef = React.useRef(new Set());
  const showSyncMessage = useSyncMessagePublisher({ setMessage, scheduleMessageClear });
  const createEmptyDiffState = React.useCallback(
    () => ({ added: [], modified: [], removed: [], renderProjects: [] }),
    []
  );
  const createEmptySelectionState = React.useCallback(
    () => ({ added: {}, modified: {}, removed: {} }),
    []
  );
  const showCheckErrorMessage = React.useCallback((error, delayMs = 2000) => {
    showSyncMessage(
      'error',
      `${t('sync.server.msg.checkErrorGeneric')} (${error?.message || error})`,
      delayMs
    );
  }, [showSyncMessage, t]);
  const setHostStatusAndDetail = React.useCallback((ip, status, detail = '') => {
    setSyncStatus((prev) => ({ ...prev, [ip]: status }));
    setSyncDetails((prev) => ({ ...prev, [ip]: detail }));
  }, []);
  const reportCopyFailure = React.useCallback((ip, detail, { prefixed = false, delayMs = 4000 } = {}) => {
    const safeDetail = String(detail || t('sync.server.msg.copyErrorGeneric'));
    setHostStatusAndDetail(ip, 'error', safeDetail);
    const message = prefixed
      ? `${t('sync.server.msg.copyErrorPrefix')}${safeDetail}`
      : safeDetail;
    showSyncMessage('error', message, delayMs);
  }, [setHostStatusAndDetail, showSyncMessage, t]);
  const startCopyStatus = React.useCallback((ip) => {
    setHostStatusAndDetail(ip, 'copying', '');
    showSyncMessage('info', t('sync.server.msg.copyStart').replace('{ip}', String(ip)));
  }, [setHostStatusAndDetail, showSyncMessage, t]);
  const resetHostDiffSelection = React.useCallback((ip) => {
    setSyncDiffs((prev) => ({ ...prev, [ip]: createEmptyDiffState() }));
    setSelectionState((prev) => ({ ...prev, [ip]: createEmptySelectionState() }));
  }, [createEmptyDiffState, createEmptySelectionState]);
  const createIgnoreDeltaLists = React.useCallback(() => ({ addList: [], removeList: [] }), []);
  const pushIgnoreDelta = React.useCallback((delta, rel, nextVal) => {
    const norm = normalizeRel(rel);
    if (!norm) return;
    if (nextVal === false) delta.addList.push(norm);
    else delta.removeList.push(norm);
  }, []);
  const collectIgnoredSelectionPaths = React.useCallback((selectionByType = {}) => {
    const addList = [];
    DIFF_TYPES.forEach((type) => {
      const map = selectionByType?.[type] || {};
      Object.entries(map).forEach(([rel, state]) => {
        if (state === false) {
          const norm = normalizeRel(rel);
          if (norm) addList.push(norm);
        }
      });
    });
    return addList;
  }, []);
  const getDiffListByType = React.useCallback((diffs, type) => {
    const list = diffs?.[type];
    return Array.isArray(list) ? list : [];
  }, []);
  const cloneSelectionByType = React.useCallback((selection = {}) => {
    return {
      added: { ...(selection.added || {}) },
      modified: { ...(selection.modified || {}) },
      removed: { ...(selection.removed || {}) },
    };
  }, []);
  const selectDiffFilesBySelection = React.useCallback((list = [], selectionMap = {}) => {
    return list.filter((rel) => selectionMap?.[rel] !== false);
  }, []);
  const updateSyncIgnoreSafely = React.useCallback(async ({
    ip,
    addList = [],
    removeList = [],
    onRollback = null,
    warnContext = 'updateSyncIgnore',
  } = {}) => {
    if (!addList.length && !removeList.length) return true;
    try {
      const resp = await updateSyncIgnore(ip, addList, removeList);
      if (resp && resp.ok === false) {
        throw new Error(resp.message || 'updateSyncIgnore failed');
      }
      return true;
    } catch (error) {
      console.warn(`${warnContext} failed`, error);
      if (typeof onRollback === 'function') onRollback();
      showCheckErrorMessage(error);
      return false;
    }
  }, [showCheckErrorMessage]);
  const ensureSyncIgnoreSelectionUpToDate = React.useCallback(async (ip, selectionByType = {}) => {
    try {
      const addList = collectIgnoredSelectionPaths(selectionByType);
      if (!addList.length) return true;
      return await updateSyncIgnoreSafely({
        ip,
        addList,
        removeList: [],
        warnContext: 'updateSyncIgnore pre-copy',
      });
    } catch (err) {
      console.warn('updateSyncIgnore pre-copy uncaught:', err);
      showCheckErrorMessage(err);
      return false;
    }
  }, [collectIgnoredSelectionPaths, showCheckErrorMessage, updateSyncIgnoreSafely]);
  const buildCopyPayloadFromSelection = React.useCallback(async ({
    ip,
    added = [],
    modified = [],
    removed = [],
    selection = {},
  } = {}) => {
    const hasDiffs = added.length > 0 || modified.length > 0 || removed.length > 0;
    if (!hasDiffs) {
      return { proceed: true, payload: null };
    }

    const selAdded = selection.added || {};
    const selModified = selection.modified || {};
    const selRemoved = selection.removed || {};

    const toAdd = selectDiffFilesBySelection(added, selAdded);
    const toMod = selectDiffFilesBySelection(modified, selModified);
    const toRem = selectDiffFilesBySelection(removed, selRemoved);

    if (toRem.length > 0) {
      const msg =
        toRem.length === 1
          ? t('sync.server.msg.confirmDeleteOne', { ip })
          : t('sync.server.msg.confirmDeleteMany', { count: toRem.length, ip });

      const ok = await requestConfirm(msg);
      if (!ok) return { proceed: false, payload: null };
    }

    if (toAdd.length === 0 && toMod.length === 0 && toRem.length === 0) {
      showSyncMessage('info', t('sync.server.noFilesSelected'), 3000);
      return { proceed: false, payload: null };
    }

    return {
      proceed: true,
      payload: {
        added: toAdd,
        modified: toMod,
        removed: toRem,
      },
    };
  }, [requestConfirm, selectDiffFilesBySelection, showSyncMessage, t]);

  const handleCheckHost = React.useCallback(
    async (ip) => {
      if (!ip) return;
      if (checkInFlightRef.current.has(ip)) return;
      checkInFlightRef.current.add(ip);

      setHostStatusAndDetail(ip, 'checking', '');
      resetHostDiffSelection(ip);

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
        const {
          renderProjects,
          added,
          modified,
          removed,
        } = normalizeHostDiffsFromCheckResult(res, isRenderMode);

        setSyncDiffs((prev) => ({
          ...prev,
          [ip]: { added, modified, removed, renderProjects },
        }));

        const ignoreSet = new Set((ignoredList || []).map((s) => normalizeKey(s)).filter(Boolean));

        setSelectionState((prev) => ({
          ...prev,
          [ip]: {
            added: buildDiffSelectionMap(added, isRenderMode, ignoreSet),
            modified: buildDiffSelectionMap(modified, isRenderMode, ignoreSet),
            removed: buildDiffSelectionMap(removed, isRenderMode, ignoreSet),
          },
        }));

        const outcome = buildSyncCheckOutcome({
          status,
          res,
          diffRaw,
          diffEffective,
          isRenderMode,
          t,
        });
        setHostStatusAndDetail(ip, outcome.status, outcome.detail);
      } catch (e) {
        setHostStatusAndDetail(ip, 'error', e?.message || t('sync.server.msg.checkErrorGeneric'));
        resetHostDiffSelection(ip);
      } finally {
        checkInFlightRef.current.delete(ip);
      }
    },
    [
      isRenderMode,
      resetHostDiffSelection,
      setHostStatusAndDetail,
      syncScopeOptions,
      t,
    ]
  );

  const toggleFileSelection = React.useCallback(
    async (ip, type, rel) => {
      if (isRenderMode) return;
      if (!ip || !type || !rel) return;

      const current = selectionState[ip] || createEmptySelectionState();
      const original = cloneSelectionByType(current);
      const next = cloneSelectionByType(original);

      const map = next[type] || {};
      const prevVal = map[rel] !== undefined ? map[rel] : true;
      const nextVal = !prevVal;
      map[rel] = nextVal;

      const delta = createIgnoreDeltaLists();
      pushIgnoreDelta(delta, rel, nextVal);
      const { addList, removeList } = delta;

      setSelectionState((prev) => ({
        ...prev,
        [ip]: {
          ...next,
          [type]: map,
        },
      }));

      if (addList.length || removeList.length) {
        await updateSyncIgnoreSafely({
          ip,
          addList,
          removeList,
          onRollback: () => setSelectionState((prev) => ({ ...prev, [ip]: original })),
          warnContext: 'updateSyncIgnore toggleFileSelection',
        });
      }
    },
    [
      cloneSelectionByType,
      createEmptySelectionState,
      createIgnoreDeltaLists,
      isRenderMode,
      pushIgnoreDelta,
      selectionState,
      updateSyncIgnoreSafely,
    ]
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

      const current = selectionState[ip] || createEmptySelectionState();
      const original = cloneSelectionByType(current);

      const diffs = syncDiffs[ip] || {};
      const list = getDiffListByType(diffs, type);

      const nextType = { ...(current[type] || {}) };
      const delta = createIgnoreDeltaLists();

      for (const rel of list) {
        const prevVal = nextType[rel] !== undefined ? nextType[rel] : true;
        const nextVal = !!check;
        nextType[rel] = nextVal;
        if (prevVal !== nextVal) {
          pushIgnoreDelta(delta, rel, nextVal);
        }
      }
      const { addList, removeList } = delta;

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
        await updateSyncIgnoreSafely({
          ip,
          addList,
          removeList,
          onRollback: () => setSelectionState((prev) => ({ ...prev, [ip]: original })),
          warnContext: 'updateSyncIgnore bulkSelectDiff',
        });
      }
    },
    [
      cloneSelectionByType,
      createEmptySelectionState,
      createIgnoreDeltaLists,
      getDiffListByType,
      isRenderMode,
      pushIgnoreDelta,
      selectionState,
      syncDiffs,
      updateSyncIgnoreSafely,
    ]
  );

  const handleCopyHost = React.useCallback(
    async (ip) => {
      if (!ip) return;
      if (copyInFlightRef.current.has(ip)) return;
      copyInFlightRef.current.add(ip);

      try {
      if (isRenderMode) {
        const renderRows = Array.isArray(syncDiffs?.[ip]?.renderProjects)
          ? syncDiffs[ip].renderProjects
          : [];
        const removalCount = renderRows.reduce((total, row) => total + Number(row?.removedCount || 0), 0);
        const hasConflict = renderRows.some((row) => String(row?.status || '') === 'conflict');
        if (removalCount > 0 || hasConflict) {
          const confirmation = removalCount > 0
            ? t('sync.render.msg.confirmRemoval', { count: removalCount, ip })
            : t('sync.render.msg.confirmOverwriteNewer', { ip });
          const confirmed = await requestConfirm(confirmation);
          if (!confirmed) return;
        }
        startCopyStatus(ip);
        try {
          const res = await copySync(ip, {
            allowDelete: removalCount > 0,
            allowOverwriteNewer: hasConflict,
          }, syncScopeOptions || undefined);
          const copyRows = normalizeRenderCopyProjects(res);
          if (copyRows.length > 0) {
            setSyncCopyProjects((prev) => ({
              ...prev,
              [ip]: {
                at: new Date().toISOString(),
                rows: copyRows,
              },
            }));
          }
          if (!res || res.ok === false) {
            const msg = (res && (res.message || res.error)) || t('sync.server.msg.copyError');
            reportCopyFailure(ip, msg);
            return;
          }

          const summary = t('sync.render.msg.copySummary', {
            count: Number(res?.projectCount || 0),
            added: Number(res?.addedCount ?? 0),
            modified: Number(res?.modifiedCount ?? 0),
            deleted: Number(res?.deletedCount ?? 0),
          });
          showSyncMessage('ok', summary, 3500);
          window.dispatchEvent(new CustomEvent('ultiunreal:sync-state-changed'));
          await handleCheckHost(ip);
        } catch (e) {
          const detail = String(e?.message || t('sync.server.msg.copyErrorGeneric'));
          reportCopyFailure(ip, detail, { prefixed: true });
        }
        return;
      }

      const diffs = syncDiffs[ip] || {};
      const sel = selectionState[ip] || {};

      const added = getDiffListByType(diffs, 'added');
      const modified = getDiffListByType(diffs, 'modified');
      const removed = getDiffListByType(diffs, 'removed');

      const okSyncIgnore = await ensureSyncIgnoreSelectionUpToDate(ip, sel);
      if (!okSyncIgnore) {
        return;
      }

      const payloadResult = await buildCopyPayloadFromSelection({
        ip,
        added,
        modified,
        removed,
        selection: sel,
      });
      if (!payloadResult.proceed) return;
      const payload = payloadResult.payload;

      startCopyStatus(ip);

      try {
        const res = await copySync(ip, payload || undefined);

        if (!res || res.ok === false) {
          const msg = (res && (res.message || res.error)) || t('sync.server.msg.copyError');
          reportCopyFailure(ip, msg);
          return;
        }

        try {
          const refreshed = await getHosts();
          setHosts(normalizeSyncHosts(refreshed));
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

        showSyncMessage('ok', summary, 3000);

        await handleCheckHost(ip);
      } catch (e) {
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
        reportCopyFailure(ip, detail, { prefixed: true });
      }
      } finally {
        copyInFlightRef.current.delete(ip);
      }
    },
    [
      buildCopyPayloadFromSelection,
      ensureSyncIgnoreSelectionUpToDate,
      handleCheckHost,
      isRenderMode,
      requestConfirm,
      selectionState,
      getDiffListByType,
      setHosts,
      startCopyStatus,
      reportCopyFailure,
      showSyncMessage,
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
