// app/screens/logs.jsx
import React from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';
import { getLogs, getAllLogs, getCommon, purgeLogs } from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';
import { getLogsPurgeLabel } from './screenI18n';
import { startPostprodAsyncLoop } from '../hooks/postprodAsyncLoop';
import { LogsFiltersBar } from './LogsFiltersBar';
import { LogsToolbarPrimary } from './LogsToolbarPrimary';
import { LogsToolbarSecondary } from './LogsToolbarSecondary';
import { LogsPaginationBar } from './LogsPaginationBar';
import { LogsList } from './LogsList';
import {
  LEVELS,
  BASE_ACTION_FILTERS,
  formatTs,
  addLocalTs,
  buildLogsActionOptions,
  buildItemsWithHaystack,
  filterLogsItems,
} from './logsHelpers';
const ACTION_FILTER_STORAGE_KEY = 'uu.logs.actionFilter';
const AUTO_REFRESH_STORAGE_KEY = 'uu.logs.autoRefresh';

export default function LogsScreen() {
  const id = readIdentity();
  const role = String(id.role || 'server').trim();
  const lang = String(id.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const { cancelLabel: confirmCancelLabel } = React.useMemo(
    () => resolveConfirmDialogLabels(t, {
      cancelAltKey: 'app.quit.confirm.cancel',
    }),
    [t]
  );
  const purgeLabel = getLogsPurgeLabel(t);

  const [items, setItems] = React.useState([]);
  const [limit, setLimit] = React.useState(500);
  const [levelFilter, setLevelFilter] = React.useState(new Set(['success','info','warn','error'])); // "debug" off par défaut
  const [text, setText] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [auto, setAuto] = React.useState(true);
  const [quietMode, setQuietMode] = React.useState(false);
  const [refreshSec, setRefreshSec] = React.useState(5);
  const [logStore, setLogStore] = React.useState(null);
  const [fromAtLocal, setFromAtLocal] = React.useState('');
  const [toAtLocal, setToAtLocal] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [exportBusy, setExportBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState({}); // idx -> bool
  const aliveRef = React.useRef(true);
  const {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  } = usePromiseConfirmDialog();

  React.useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // charge le filtre action depuis le localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(ACTION_FILTER_STORAGE_KEY);
      const baseIds = new Set(BASE_ACTION_FILTERS.map(a => a.id));
      if (stored && baseIds.has(stored)) {
        setActionFilter(stored);
      }
    } catch {}
  }, []);

  // persiste le filtre action au changement
  React.useEffect(() => {
    try {
      localStorage.setItem(ACTION_FILTER_STORAGE_KEY, actionFilter);
    } catch {}
  }, [actionFilter]);

  // auto-refresh depuis le localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      if (stored === 'false') setAuto(false);
      else if (stored === 'true') setAuto(true);
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, auto ? 'true' : 'false');
    } catch {}
  }, [auto]);

  // charge refreshSec depuis /agent/common
  React.useEffect(() => {
    (async () => {
      const c = await getCommon().catch(() => ({}));
      const r = Number(c?.refreshSec || 0);
      if (r && r > 0) setRefreshSec(r);
      if (typeof c?.quietMode === 'boolean') {
        setQuietMode(c.quietMode);
        if (c.quietMode) setAuto(false);
      }
    })();
  }, []);

  const fetchLogs = React.useCallback(async () => {
    setBusy(true);
    try {
      const levels = Array.from(levelFilter);
      const response = role === 'server'
        ? await getAllLogs({ limit, levels })
        : await getLogs({ limit, levels });
      if (!aliveRef.current) return;
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
        ? response.items
        : [];
      setItems(addLocalTs(list));
      setLogStore(
        response && typeof response === 'object' && response.logStore
          ? response.logStore
          : null
      );
    } catch {
      if (!aliveRef.current) return;
      // Évite d'afficher un état saturé obsolète après une purge réussie mais un refresh en erreur.
      setLogStore(null);
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }, [limit, levelFilter, role]);

  const logStoreInfo = React.useMemo(() => {
    const count = Number(logStore?.lineCount || 0);
    const warnAt = Number(logStore?.warnAt || 1500);
    const hardLimit = Number(logStore?.hardLimit || 2000);
    const saturated = !!logStore?.saturated;
    if (!Number.isFinite(count) || count <= 0) return null;
    if (saturated) {
      return {
        type: 'error',
        text: t('logs.storage.saturated', { count, limit: hardLimit }),
      };
    }
    if (count >= warnAt) {
      return {
        type: 'info',
        text: t('logs.storage.warn', { count, warnAt, limit: hardLimit }),
      };
    }
    return null;
  }, [logStore, t]);

  // 1er chargement (et re-fetch si la signature de fetchLogs change)
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // auto refresh uniquement quand l'option est active
  React.useEffect(() => {
    const effectiveAuto = auto && !quietMode;
    if (!effectiveAuto) return;
    const stopLoop = startPostprodAsyncLoop({
      intervalMs: Math.max(2, Number(refreshSec) || 5) * 1000,
      tick: fetchLogs,
    });
    return stopLoop;
  }, [auto, quietMode, refreshSec, fetchLogs]);

  // pré-calcul du haystack de recherche : ne tourne que quand les items changent
  const itemsWithHaystack = React.useMemo(
    () => buildItemsWithHaystack(items),
    [items]
  );

  // filtrage texte + niveaux + type d'action + dates
  const filtered = React.useMemo(
    () =>
      filterLogsItems({
        itemsWithHaystack,
        levelFilter,
        text,
        actionFilter,
        fromAtLocal,
        toAtLocal,
      }),
    [itemsWithHaystack, levelFilter, text, actionFilter, fromAtLocal, toAtLocal]
  );

  // Pagination pour limiter le rendu DOM si beaucoup de logs
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(200);
  const levelFilterKey = Array.from(levelFilter).join(',');
  React.useEffect(() => {
    setPage(0);
  }, [filtered.length, pageSize, text, levelFilterKey, actionFilter, fromAtLocal, toAtLocal]);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const visibleLogs = filtered.slice(pageStart, pageStart + pageSize);
  const canPrevPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;

  function toggleLevel(l) {
    setLevelFilter(prev => {
      const n = new Set(prev);
      if (n.has(l)) n.delete(l); else n.add(l);
      if (n.size === 0) n.add(l); // ne jamais tout vider
      return n;
    });
  }

  function toggleExpand(idx) {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  }

  function handleLimitChange(rawValue) {
    const value = Number(rawValue);
    if (Number.isFinite(value)) {
      const clamped = Math.min(5000, Math.max(50, value));
      setLimit(clamped);
      return;
    }
    setLimit(500);
  }

  function handlePageSizeChange(rawValue) {
    setPageSize(Math.max(50, Number(rawValue) || 200));
  }

  function clearFilters() {
    setFromAtLocal('');
    setToAtLocal('');
    setText('');
    setActionFilter('all');
  }

  async function handlePurge() {
    await purgeLogs({ allHosts: role === 'server' });
    await fetchLogs();
  }

  async function handleConfirmPurge() {
    const ok = await requestConfirm(t('logs.confirm.purge'));
    if (!ok) return;
    await handlePurge();
  }

  async function handleExport(as = 'json') {
    if (!window.electron?.exportFile) return;
    setExportBusy(true);
    try {
      const ext = as === 'txt' ? 'txt' : 'json';
      const defaultName = `logs-${new Date().toISOString().replace(/[:.]/g,'-')}.${ext}`;
      const decorated =
        filtered.map((it) => ({
          ...it,
          tsLocal: it.tsLocal || formatTs(it.ts),
        }));

      const content =
        as === 'txt'
          ? decorated.map((it) => {
              const line = `[${it.tsLocal}] [${it.level || ''}] [${it.action || ''}] ${it.message || ''}`;
              return line.trim();
            }).join('\n')
          : JSON.stringify(decorated, null, 2);

      const res = await window.electron.exportFile({
        defaultName,
        content,
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });

      if (!res || res.ok === false) {
        // rien à faire si cancel ou erreur
      }
    } finally {
      setExportBusy(false);
    }
  }

  const actionOptions = React.useMemo(() => {
    return buildLogsActionOptions({
      items,
      actionFilter,
      t,
      baseActionFilters: BASE_ACTION_FILTERS,
    });
  }, [items, actionFilter, t]);

  return (
    <>
    <div className="uu-page">
      <LogsFiltersBar
        t={t}
        fromAtLocal={fromAtLocal}
        toAtLocal={toAtLocal}
        actionFilter={actionFilter}
        actionOptions={actionOptions}
        text={text}
        onFromAtLocalChange={setFromAtLocal}
        onToAtLocalChange={setToAtLocal}
        onActionFilterChange={setActionFilter}
        onTextChange={setText}
        onClear={clearFilters}
      />

      <LogsToolbarPrimary
        levels={LEVELS}
        levelFilter={levelFilter}
        limit={limit}
        auto={auto}
        busy={busy}
        t={t}
        onToggleLevel={toggleLevel}
        onLimitChange={handleLimitChange}
        onAutoChange={setAuto}
        onRefresh={fetchLogs}
      />

      <LogsToolbarSecondary
        t={t}
        exportBusy={exportBusy}
        onPurge={handleConfirmPurge}
        onExportJson={() => handleExport('json')}
        onExportTxt={() => handleExport('txt')}
      />

      {logStoreInfo?.text ? (
        <div className="mt-8">
          <span className={`uu-top-notice ${logStoreInfo.type || 'info'}`}>
            {logStoreInfo.text}
          </span>
        </div>
      ) : null}

      <LogsPaginationBar
        t={t}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        canPrevPage={canPrevPage}
        canNextPage={canNextPage}
        pageSize={pageSize}
        onPrevPage={() => setPage((prev) => Math.max(0, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
        onPageSizeChange={handlePageSizeChange}
      />

      <LogsList
        t={t}
        busy={busy}
        visibleLogs={visibleLogs}
        pageStart={pageStart}
        expanded={expanded}
        onToggleExpand={toggleExpand}
        formatTs={formatTs}
      />
    </div>

    <ConfirmDialog
      open={confirmDialog.open}
      busy={false}
      title={purgeLabel}
      message={confirmDialog.message}
      cancelLabel={confirmCancelLabel}
      confirmLabel={purgeLabel}
      onCancel={() => closeConfirmDialog(false)}
      onConfirm={() => closeConfirmDialog(true)}
      confirmRef={confirmOkBtnRef}
      overlayZIndex={2000}
    />
    </>
  );
}

