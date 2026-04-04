// app/screens/logs.jsx
import React from 'react';
import { getLogs, getAllLogs, getCommon, purgeLogs } from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';

const LEVELS = ['success','info','warn','error','debug'];
const BASE_ACTION_FILTERS = [
  { id: 'all',          labelKey: 'logs.filters.all' },
  { id: 'widget_press', labelKey: 'logs.filters.widget' },
  { id: 'sync',         labelKey: 'logs.filters.sync' },
  { id: 'wrc',          labelKey: 'logs.filters.wrc' },
];
const ACTION_FILTER_STORAGE_KEY = 'uu.logs.actionFilter';
const AUTO_REFRESH_STORAGE_KEY = 'uu.logs.autoRefresh';

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
  const t = createT(lang);

  const [items, setItems] = React.useState([]);
  const [limit, setLimit] = React.useState(500);
  const [levelFilter, setLevelFilter] = React.useState(new Set(['success','info','warn','error'])); // "debug" off par défaut
  const [text, setText] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [auto, setAuto] = React.useState(true);
  const [quietMode, setQuietMode] = React.useState(false);
  const [refreshSec, setRefreshSec] = React.useState(5);
  const [logStore, setLogStore] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [exportBusy, setExportBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState({}); // idx -> bool
  const aliveRef = React.useRef(true);

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
      if (stored && (baseIds.has(stored) || stored)) {
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
    const t = setInterval(fetchLogs, Math.max(2, Number(refreshSec) || 5) * 1000);
    return () => {
      clearInterval(t);
    };
  }, [auto, quietMode, refreshSec, fetchLogs]);

  // filtrage texte + niveaux + type d'action
  const filtered = React.useMemo(() => {
    const q  = text.trim().toLowerCase();
    const lv = levelFilter;
    const af = actionFilter;

    return items.filter(it => {
      if (!lv.has(String(it.level || 'info'))) return false;

      const act = String(it.action || '');

      // Filtre par type d'action
      if (af === 'widget_press' && act !== 'widget_press') return false;
      if (af === 'sync'         && !act.startsWith('sync_')) return false;
      if (af === 'wrc'          && !act.startsWith('wrc_'))  return false;
      if (af !== 'all' && af !== 'widget_press' && af !== 'sync' && af !== 'wrc') {
        if (act !== af) return false;
      }

      if (!q) return true;

      const hay = [
        it.level, it.src, it.host, it.action, it.message,
        JSON.stringify(it.data || {})
      ].join(' ').toLowerCase();

      return hay.includes(q);
    });
  }, [items, levelFilter, text, actionFilter]);

  // Pagination pour limiter le rendu DOM si beaucoup de logs
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(200);
  React.useEffect(() => {
    setPage(0);
  }, [filtered.length, pageSize, text, Array.from(levelFilter).join(','), actionFilter]);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const visibleLogs = filtered.slice(pageStart, pageStart + pageSize);

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
    await fetchLogs(); // toujours rafraîchir l'affichage après une demande de purge
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
    <div className="uu-page">

      {/* Ligne 1 : filtres + options */}
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
            className="uu-input w-240"
            placeholder={t('logs.toolbar.searchPlaceholder')}
            value={text}
            onChange={(e)=>setText(e.target.value)}
          />

          <select
            className="uu-input w-160"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            {actionOptions.map(a => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

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
          onClick={handlePurge}
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

      <div className="uu-row uu-gap-8 uu-align-center" style={{ marginTop: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div className="uu-muted">
          {`${Math.min(pageStart + 1, totalItems)}-${Math.min(totalItems, pageStart + pageSize)} / ${totalItems} (${t('logs.countLabel')})`}
        </div>
        {totalItems > 0 && (
          <div className="uu-row uu-gap-6 uu-align-center">
            <button
              type="button"
              className="uu-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              ‹
            </button>
            <span className="uu-muted">
              {`Page ${currentPage + 1}/${totalPages}`}
            </span>
            <button
              type="button"
              className="uu-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              ›
            </button>
            <select
              className="uu-select"
              value={pageSize}
              onChange={(e) => setPageSize(Math.max(50, Number(e.target.value) || 200))}
              style={{ width: '90px' }}
              aria-label={t('logs.pageSizeAria')}
            >
              {[100, 200, 400, 800].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
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
  );
}
