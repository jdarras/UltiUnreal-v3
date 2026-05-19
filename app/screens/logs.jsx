// app/screens/logs.jsx
import React from 'react';
import DateTimeConfirmPicker from '../components/DateTimeConfirmPicker';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';
import { getLogs, getAllLogs, getCommon, purgeLogs } from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';
import { getLogsPurgeLabel } from './screenI18n';

const LEVELS = ['success','info','warn','error','debug'];
const BASE_ACTION_FILTERS = [
  { id: 'all',          labelKey: 'logs.filters.all' },
  { id: 'widget_press', labelKey: 'logs.filters.widget' },
  { id: 'sync',         labelKey: 'logs.filters.sync' },
  { id: 'wrc',          labelKey: 'logs.filters.wrc' },
];
const ACTION_FILTER_STORAGE_KEY = 'uu.logs.actionFilter';
const AUTO_REFRESH_STORAGE_KEY = 'uu.logs.autoRefresh';
const FILTERS_ROW_STYLE = { gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' };
const FILTER_COL_MIN_200_STYLE = { minWidth: '200px' };
const FILTER_COL_MIN_160_STYLE = { minWidth: '160px' };
const FILTER_COL_SEARCH_STYLE = { minWidth: '220px', flex: 1 };
const HIDDEN_LABEL_STYLE = { visibility: 'hidden' };
const PAGINATION_ROW_STYLE = { marginTop: '8px', marginBottom: '8px', flexWrap: 'wrap' };

function parseTsMs(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 1e12) return Math.trunc(n * 1000);
    return Math.trunc(n);
  }
  const d = new Date(raw);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatTs(ts) {
  try {
    const tsMs = parseTsMs(ts);
    if (tsMs === null) return String(ts || '');
    const d = new Date(tsMs);
    const pad = n => String(n).padStart(2,'0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
  } catch { return ts; }
}

function addLocalTs(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const withMeta = list.map((it, idx) => {
    const tsRaw = it?.ts ?? it?.timestamp ?? it?.time ?? '';
    return {
      ...it,
      tsLocal: formatTs(tsRaw),
      _tsMs: parseTsMs(tsRaw) ?? 0,
      _idx: idx,
    };
  });
  withMeta.sort((a, b) => {
    if (a._tsMs !== b._tsMs) return a._tsMs - b._tsMs;
    return a._idx - b._idx;
  });
  return withMeta.map(({ _tsMs, _idx, ...it }) => it);
}

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
    fetchLogs(); // déclenche immédiatement quand on (re)active l'auto
    const timerId = setInterval(fetchLogs, Math.max(2, Number(refreshSec) || 5) * 1000);
    return () => {
      clearInterval(timerId);
    };
  }, [auto, quietMode, refreshSec, fetchLogs]);

  // pré-calcul du haystack de recherche : ne tourne que quand les items changent
  const itemsWithHaystack = React.useMemo(() =>
    items.map(it => ({
      ...it,
      _haystack: [it.level, it.src, it.host, it.action, it.message, JSON.stringify(it.data || {})].join(' ').toLowerCase(),
    })),
    [items]
  );

  // filtrage texte + niveaux + type d'action + dates
  const filtered = React.useMemo(() => {
    const q  = text.trim().toLowerCase();
    const lv = levelFilter;
    const af = actionFilter;
    const fromMs = fromAtLocal ? new Date(fromAtLocal).getTime() : null;
    const toMs   = toAtLocal   ? new Date(toAtLocal).getTime()   : null;

    return itemsWithHaystack.filter(it => {
      if (!lv.has(String(it.level || 'info'))) return false;
      if (fromMs !== null && (it._tsMs ?? 0) < fromMs) return false;
      if (toMs   !== null && (it._tsMs ?? 0) > toMs)   return false;

      const act = String(it.action || '');

      if (af === 'widget_press' && act !== 'widget_press') return false;
      if (af === 'sync'         && !act.startsWith('sync_')) return false;
      if (af === 'wrc'          && !act.startsWith('wrc_'))  return false;
      if (af !== 'all' && af !== 'widget_press' && af !== 'sync' && af !== 'wrc') {
        if (act !== af) return false;
      }

      if (!q) return true;
      return it._haystack.includes(q);
    });
  }, [itemsWithHaystack, levelFilter, text, actionFilter, fromAtLocal, toAtLocal]);

  // Pagination pour limiter le rendu DOM si beaucoup de logs
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(200);
  React.useEffect(() => {
    setPage(0);
  }, [filtered.length, pageSize, text, Array.from(levelFilter).join(','), actionFilter, fromAtLocal, toAtLocal]);
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

  async function handlePurge() {
    await purgeLogs({ allHosts: role === 'server' });
    await fetchLogs();
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
    const baseIds = new Set(BASE_ACTION_FILTERS.map(a => a.id));
    let hasWidget = false;
    let hasSync = false;
    let hasWrc = false;
    const set = new Set();

    items.forEach(it => {
      const act = String(it?.action || '').trim();
      if (!act) return;
      set.add(act);
      if (act === 'widget_press') hasWidget = true;
      if (act.startsWith('sync_')) hasSync = true;
      if (act.startsWith('wrc_')) hasWrc = true;
    });

    // si une valeur est stockée mais absente des logs chargés, on la conserve
    if (actionFilter && !baseIds.has(actionFilter)) {
      set.add(actionFilter);
    }

    const base = BASE_ACTION_FILTERS
      .filter((a) => {
        if (a.id === 'all') return true;
        if (a.id === actionFilter) return true;
        if (a.id === 'widget_press') return hasWidget;
        if (a.id === 'sync') return hasSync;
        if (a.id === 'wrc') return hasWrc;
        return true;
      })
      .map(a => ({
        id: a.id,
        label: t(a.labelKey),
      }));

    const dyn = Array.from(set)
      .filter(id => !baseIds.has(id))
      .sort((a, b) => a.localeCompare(b))
      .map(id => ({ id, label: id }));

    return [...base, ...dyn];
  }, [items, actionFilter, t]);

  return (
    <>
    <div className="uu-page">

      {/* Barre de filtres dates + recherche */}
      <div className="uu-row mt-8" style={FILTERS_ROW_STYLE}>
        <div className="uu-col" style={FILTER_COL_MIN_200_STYLE}>
          <label className="uu-label">{t('postprod.users.activity.filter.fromAt')}</label>
          <DateTimeConfirmPicker
            value={fromAtLocal}
            onChange={setFromAtLocal}
            placeholder={t('common.datePicker.placeholder')}
            applyLabel={t('common.datePicker.apply')}
            cancelLabel={t('common.datePicker.cancel')}
            clearLabel={t('common.datePicker.clear')}
          />
        </div>
        <div className="uu-col" style={FILTER_COL_MIN_200_STYLE}>
          <label className="uu-label">{t('postprod.users.activity.filter.toAt')}</label>
          <DateTimeConfirmPicker
            value={toAtLocal}
            onChange={setToAtLocal}
            placeholder={t('common.datePicker.placeholder')}
            applyLabel={t('common.datePicker.apply')}
            cancelLabel={t('common.datePicker.cancel')}
            clearLabel={t('common.datePicker.clear')}
          />
        </div>
        <div className="uu-col" style={FILTER_COL_MIN_160_STYLE}>
          <label className="uu-label">{t('logs.filters.actionType')}</label>
          <select
            className="uu-input"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {actionOptions.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className="uu-col" style={FILTER_COL_SEARCH_STYLE}>
          <label className="uu-label">{t('postprod.users.activity.filter.search')}</label>
          <input
            className="uu-input"
            placeholder={t('logs.toolbar.searchPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="uu-col">
          <label className="uu-label" style={HIDDEN_LABEL_STYLE}>_</label>
          <button
            className="uu-btn-ghost"
            type="button"
            onClick={() => { setFromAtLocal(''); setToAtLocal(''); setText(''); setActionFilter('all'); }}
          >
            {t('postprod.users.activity.filter.clear')}
          </button>
        </div>
      </div>

      {/* Ligne 1 : niveau + options */}
      <div className="uu-toolbar">
        <div className="uu-row gap-8">
          <div className="uu-chip-group">
            {LEVELS.map(l => (
              <button
                key={l}
                className={`uu-chip ${levelFilter.has(l) ? 'chip-on' : 'chip-off'} lvl-${l}`}
                onClick={() => toggleLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>

          <input
            className="uu-input w-100"
            type="number"
            min={50}
            max={5000}
            value={limit}
            onChange={(e)=>{
              const val = Number(e.target.value);
              if (Number.isFinite(val)) {
                const clamped = Math.min(5000, Math.max(50, val));
                setLimit(clamped);
              } else {
                setLimit(500);
              }
            }}
            title={t('logs.toolbar.maxLinesTitle')}
          />

          <label className="uu-check">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e)=>setAuto(!!e.target.checked)}
            />
            {t('logs.toolbar.autoRefresh')}
          </label>

          {/* Rafraîchir visible seulement si Auto-refresh OFF */}
          {!auto && (
            <button className="uu-btn" onClick={fetchLogs} disabled={busy}>
              {busy ? '...' : t('logs.toolbar.refresh')}
            </button>
          )}
        </div>
      </div>

      {/* Ligne 2 : actions secondaires */}
      <div className="uu-toolbar-sub">
        <button
          className="uu-btn"
          onClick={async () => {
            const ok = await requestConfirm(t('logs.confirm.purge'));
            if (ok) await handlePurge();
          }}
          title={t('logs.toolbar.purgeTooltip')}
        >
          {t('logs.toolbar.purgeButton')}
        </button>
        <div className="uu-row uu-gap-8">
          <button
            className="uu-btn"
            disabled={exportBusy}
            onClick={() => handleExport('json')}
            title={t('logs.toolbar.exportTooltip')}
          >
            {exportBusy ? '...' : t('logs.toolbar.exportJson')}
          </button>
          <button
            className="uu-btn"
            disabled={exportBusy}
            onClick={() => handleExport('txt')}
            title={t('logs.toolbar.exportTooltip')}
          >
            {exportBusy ? '...' : t('logs.toolbar.exportTxt')}
          </button>
        </div>
      </div>

      {logStoreInfo?.text ? (
        <div className="mt-8">
          <span className={`uu-top-notice ${logStoreInfo.type || 'info'}`}>
            {logStoreInfo.text}
          </span>
        </div>
      ) : null}

      <div className="uu-row uu-gap-8 uu-align-center" style={PAGINATION_ROW_STYLE}>
        {totalItems > 0 && (
          <div className="uu-row uu-gap-6 uu-align-center">
            {canPrevPage ? (
              <button
                type="button"
                className="uu-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ‹
              </button>
            ) : null}
            <span className="uu-muted">
              {`Page ${currentPage + 1}/${totalPages}`}
            </span>
            {canNextPage ? (
              <button
                type="button"
                className="uu-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                ›
              </button>
            ) : null}
            <select
              className="uu-select w-90"
              value={pageSize}
              onChange={(e) => setPageSize(Math.max(50, Number(e.target.value) || 200))}
              aria-label={t('logs.pageSizeAria')}
            >
              {[100, 200, 400, 800].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="uu-muted">{`${totalItems} ${t('logs.countLabel')}`}</span>
          </div>
        )}
      </div>

      <div className="log-list">
        {visibleLogs.length === 0 && (
          <div className="uu-muted mt-12">
            {busy ? t('logs.loading') : t('logs.empty')}
          </div>
        )}

        {visibleLogs.map((it, idx) => {
          const globalIdx = pageStart + idx;
          return (
          <div key={globalIdx} className={`log-row lvl-${String(it.level||'info')}`}>
            <div className="log-meta">
              <span className="log-ts">{it.tsLocal || formatTs(it.ts)}</span>
              {it.src ? <span className={`log-src src-${it.src}`}>{it.src}</span> : null}
              {it.host ? <span className="log-host">{it.host}</span> : null}
              {it.action ? <span className="log-action">{it.action}</span> : null}
            </div>
            <div className="log-msg">{it.message || ''}</div>

            {it.data && Object.keys(it.data).length > 0 && (
              <>
                <button className="uu-btn" onClick={() => toggleExpand(globalIdx)}>
                  {expanded[globalIdx]
                    ? t('logs.details.hide')
                    : t('logs.details.show')}
                </button>
                {expanded[globalIdx] && (
                  <pre className="log-data">{JSON.stringify(it.data, null, 2)}</pre>
                )}
              </>
            )}
          </div>
        )})}
      </div>
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

