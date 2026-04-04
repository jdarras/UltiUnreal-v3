import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import {
  getCommon,
  getHosts,
  getProjects,
  getOnlineMap,
  getLayout,
  saveLayout,
  wrcGetPreset,
  savePresetSnapshot
} from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { NoticeContext } from '../NoticeContext';
const ProductionLayoutTabs = lazy(() => import('../components/ProductionLayoutTabs.jsx'));
const ProductionLayoutCanvas = lazy(() => import('../components/ProductionLayoutCanvas.jsx'));
const ProductionSidebar = lazy(() => import('../components/ProductionSidebar.jsx'));
import {
  snap,
  normalizeBrowseWidget,
  extractValuesFromLayout,
  sortHosts,
  normalizePreset,
  deriveLayoutGeometry,
  hasValidBinding,
  buildLayoutWithValues,
  reconcileWidgetsWithPreset,
  ZONE_HEADER_HEIGHT,
  ZONE_PADDING
} from '../components/production-layout';
import { isEqualWidgetValue } from '../utils/widget-value-compare.js';
const loadTimelineUtils = () => import('../utils/timeline');
const PRODUCTION_WIDGET_CLIPBOARD_KEY = '__uu_production_widget_clipboard__';

function cloneClipboardData(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // fallback below
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function isTextEditingTarget(target) {
  if (!target || typeof Element === 'undefined' || !(target instanceof Element)) {
    return false;
  }

  const el = target;
  const tag = String(el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }
  if (el.isContentEditable) return true;
  if (typeof el.closest === 'function') {
    return !!el.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
    );
  }
  return false;
}

function readWidgetClipboard() {
  if (typeof window === 'undefined') return null;
  const payload = window[PRODUCTION_WIDGET_CLIPBOARD_KEY];
  if (!payload || typeof payload !== 'object') return null;
  return cloneClipboardData(payload);
}

function writeWidgetClipboard(payload) {
  if (typeof window === 'undefined') return;
  if (!payload || typeof payload !== 'object') {
    delete window[PRODUCTION_WIDGET_CLIPBOARD_KEY];
    return;
  }
  window[PRODUCTION_WIDGET_CLIPBOARD_KEY] = cloneClipboardData(payload);
}

export default function ProductionScreen() {
  const [common, setCommon] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [activeName, setActiveName] = useState('');
  const [activeId, setActiveId] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [infoMsgType, setInfoMsgType] = useState('');
  const [wrcStatusMsg, setWrcStatusMsg] = useState('');
  const [wrcStatusType, setWrcStatusType] = useState('');

  const [presetData, setPresetData] = useState(null);
  const [presetReloadNeeded, setPresetReloadNeeded] = useState(false);

  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [activeLayoutId, setActiveLayoutId] = useState('');
  const [editingLayoutId, setEditingLayoutId] = useState('');
  const [layoutNameDraft, setLayoutNameDraft] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [startLayoutToggleBusy, setStartLayoutToggleBusy] = useState(false);
  const [exportImportBusy, setExportImportBusy] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '' });
  const lazyFallback = <div className="uu-loading" style={{ padding: '12px' }}>…</div>;
  // Ref pour mémoire de la dernière sauvegarde (sérialisée) par projet
  const lastSavedLayoutRef = useRef({});
  const layoutsRef = useRef([]);
  const widgetsRef = useRef([]);
  const layoutDragRef = useRef(null);
  const layoutNameInputRef = useRef(null);
  const layoutRenameCancelRef = useRef(false);
  const lastStartCueRef = useRef({ layoutId: '', sig: '' });
  const aliveRef = useRef(true);
  const presetDataRef = useRef(null);
  const presetSignatureRef = useRef('');
  const presetSnapshotRef = useRef({ exists: false, hash: '' });
  const loadPresetInFlightRef = useRef(false);
  const loadPresetInFlightSinceRef = useRef(0);
  const presetReloadNeededRef = useRef(false);
  const confirmResolveRef = useRef(null);
  const confirmPrevFocusRef = useRef(null);
  const confirmOkBtnRef = useRef(null);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {
          // noop
        }
        confirmResolveRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  useEffect(() => {
    presetDataRef.current = presetData;
    let sig = '';
    if (presetData && typeof presetData === 'object') {
      try {
        sig = JSON.stringify(presetData);
      } catch {
        sig = '';
      }
    }
    presetSignatureRef.current = sig;
  }, [presetData]);

  useEffect(() => {
    presetReloadNeededRef.current = presetReloadNeeded;
  }, [presetReloadNeeded]);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  useEffect(() => {
    if (!editingLayoutId) return;
    const el = layoutNameInputRef.current;
    if (el && typeof el.focus === 'function') {
      el.focus();
      el.select?.();
    }
  }, [editingLayoutId]);

  const id = useMemo(readIdentity, []);
  const lang = String(id.lang || 'fr').trim();
  const t = useMemo(() => createT(lang), [lang]);
  const noticeApi = React.useContext(NoticeContext);
  const showNotice = noticeApi?.showNotice;

  const closeConfirmDialog = useCallback((ok) => {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmDialog((prev) => (prev.open ? { ...prev, open: false } : prev));
    if (resolve) resolve(!!ok);

    setTimeout(() => {
      try {
        window.focus();
      } catch {
        // noop
      }
      const el = confirmPrevFocusRef.current;
      confirmPrevFocusRef.current = null;
      if (
        el &&
        typeof el.focus === 'function' &&
        el.isConnected !== false
      ) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          try {
            el.focus();
          } catch {
            // noop
          }
        }
      }
    }, 0);
  }, []);

  const requestConfirm = useCallback((message) => {
    const msg = String(message || '').trim();
    return new Promise((resolve) => {
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {
          // noop
        }
      }
      const activeEl =
        typeof document !== 'undefined' && document?.activeElement
          ? document.activeElement
          : null;
      confirmPrevFocusRef.current =
        activeEl && typeof activeEl.focus === 'function' ? activeEl : null;
      confirmResolveRef.current = resolve;
      setConfirmDialog({ open: true, message: msg });
    });
  }, []);

  useEffect(() => {
    if (!confirmDialog.open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      confirmOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [confirmDialog.open, closeConfirmDialog]);

  // État interne pour le drag & drop d’un widget
  const [dragState, setDragState] = useState({
    active: false,      // est-ce qu’on est en train de dragger ?
    widgetId: null,     // quel widget est en train d’être draggé ?
    offsetX: 0,         // décalage souris -> widget
    offsetY: 0,
    widgetWidth: 0,     // taille du widget au moment du drag
    widgetHeight: 0
  });

  const [widgetSizes, setWidgetSizes] = useState({});

    const [zoneHeaderHeights, setZoneHeaderHeights] = useState({});
  const activeLayout = useMemo(
    () => layouts.find((l) => l.id === activeLayoutId) || layouts[0] || null,
    [layouts, activeLayoutId]
  );
  const normalizeLayoutColor = (val) => {
    const s = String(val || '').trim();
    return s || '#1F2937';
  };

  useEffect(() => {
    if (!showNotice) return;
    if (err) {
      showNotice(err, 'error');
      return;
    }
    if (infoMsg) {
      showNotice(infoMsg, infoMsgType || '');
      return;
    }
    if (presetReloadNeeded) {
      showNotice(t('production.status.presetNeedsReload'), 'warn', { sticky: true });
      return;
    }
    if (wrcStatusMsg) {
      showNotice(wrcStatusMsg, wrcStatusType || 'error', { sticky: true });
      return;
    }
    // ne pas effacer la notice globale pour conserver l'affichage commun
  }, [
    err,
    infoMsg,
    infoMsgType,
    presetReloadNeeded,
    showNotice,
    t,
    wrcStatusMsg,
    wrcStatusType
  ]);

  const setWrcStatus = useCallback((message, type = 'error') => {
    const msg = String(message || '').trim();
    setWrcStatusMsg(msg);
    setWrcStatusType(msg ? type : '');
  }, []);

  const isDuplicateLayoutName = useCallback(
    (name, ignoreId = '') => {
      const target = String(name || '').trim().toLowerCase();
      if (!target) return false;
      return layouts.some((l) => {
        if (!l) return false;
        if (ignoreId && l.id === ignoreId) return false;
        const n = String(l.name || '').trim().toLowerCase();
        return n === target;
      });
    },
    [layouts]
  );

  function makeUniqueName(base) {
    const raw = String(base || '').trim() || layoutDefaultName(layouts.length + 1);
    if (!isDuplicateLayoutName(raw)) return raw;
    let idx = 2;
    let candidate = `${raw} (${idx})`;
    while (isDuplicateLayoutName(candidate)) {
      idx += 1;
      candidate = `${raw} (${idx})`;
    }
    return candidate;
  }

  const handleZoneHeaderHeightChange = useCallback(
    (zoneId, headerHeight) => {
      if (!zoneId || !Number.isFinite(headerHeight)) return;
      const rounded = Math.round(headerHeight);

      setZoneHeaderHeights((prev) => {
        const prevH = prev[zoneId];
        if (prevH && Math.abs(prevH - rounded) < 1) {
          return prev;
        }
        return {
          ...prev,
          [zoneId]: rounded
        };
      });
    },
    []
  );

  const handleWidgetSizeChange = useCallback((id, width, height) => {
    if (!id || !Number.isFinite(width) || !Number.isFinite(height)) return;

    setWidgetSizes((prev) => {
      const prevSize = prev[id];
      if (
        prevSize &&
        Math.abs(prevSize.width - width) < 1 &&
        Math.abs(prevSize.height - height) < 1
      ) {
        // taille inchangée → on évite un re-render pour rien
        return prev;
      }

      return {
        ...prev,
        [id]: { width, height }
      };
    });
  }, []);

  const [values, setValues] = useState({});

  const EDIT_MODE_STORAGE_KEY = 'uu_production_edit_mode';
  const [editMode, setEditMode] = useState(() => {
    try {
      const raw = localStorage.getItem(EDIT_MODE_STORAGE_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
    } catch {}
    return true; // par défaut : Édition
  });
  const [layoutReady, setLayoutReady] = useState(false);
  const [wrcReady, setWrcReady] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState('palette');
  const editActiveProject = React.useCallback(() => {
    const pid = String(activeId || '').trim();
    if (!pid) return;
    if (window.goToProjectDetail) {
      window.goToProjectDetail(pid);
    }
  }, [activeId]);
  const layoutMinHeight = 320; // hauteur mini du layout (à ajuster si tu veux)
  const maxLayouts = 8;
  const maxLayoutNameLen = 24;
  const layoutSaveTimeoutMs = 5000;

  useEffect(() => {
    try {
      localStorage.setItem(EDIT_MODE_STORAGE_KEY, editMode ? 'true' : 'false');
    } catch {}
  }, [editMode]);

  const activeProjectWrcName = useMemo(() => {
    const id = String(activeId || '').trim();
    const name = String(activeName || '').trim();
    const list = Array.isArray(projectsList) ? projectsList : [];
    const byId = id
      ? list.find((p) => String(p?.id || '').trim() === id)
      : null;
    const byName =
      !byId && name
        ? list.find(
            (p) =>
              String(p?.name || '').trim().toLowerCase() === name.toLowerCase()
          )
        : null;
    return String((byId || byName)?.wrcName || '').trim();
  }, [projectsList, activeId, activeName]);

  const effectivePresetName = useMemo(() => {
    const override = String(activeProjectWrcName || '').trim();
    const fallback = String(common?.webRemoteControlName || '').trim();
    return override || fallback || 'RemoteControlPreset';
  }, [activeProjectWrcName, common]);

  const commonForProject = useMemo(() => {
    if (common && typeof common === 'object') {
      return {
        ...common,
        webRemoteControlName: effectivePresetName,
      };
    }
    return { webRemoteControlName: effectivePresetName };
  }, [common, effectivePresetName]);

  const { layoutWidgets, layoutHeight } = useMemo(
    () =>
      deriveLayoutGeometry(
        widgets,
        layoutMinHeight,
        widgetSizes,
        zoneHeaderHeights
      ),
    [widgets, widgetSizes, layoutMinHeight, zoneHeaderHeights]
  );

  const target = useMemo(() => {
    // Cible par défaut : machine serveur (locale). Fallback sur 127.0.0.1.
    const localIp = String(id?.localIp || '').trim();
    const localHost =
      (hosts || []).find((h) => localIp && h?.ip === localIp) ||
      (hosts || []).find((h) => h?.ip && h.ip === localIp);

    const ip = localHost?.ip || localIp || hosts[0]?.ip || '127.0.0.1';
    const port = Number(common?.rcHttpPort || 30010);
    const preset = effectivePresetName;
    return { ip, port, preset };
  }, [hosts, common, id, effectivePresetName]);

  const isTargetUnrealRunning = useCallback(async () => {
    try {
      const map = await getOnlineMap();
      const targetIp = String(target?.ip || '').trim();
      const localIp = String(id?.localIp || '').trim();
      const candidates = [targetIp, localIp, '127.0.0.1']
        .map((v) => String(v || '').trim())
        .filter(Boolean);

      for (const ip of candidates) {
        const entry = map && typeof map === 'object' ? map[ip] : null;
        if (entry && typeof entry.unrealRunning === 'boolean') {
          return entry.unrealRunning;
        }
      }
    } catch {
      // ignore and fallback below
    }
    return false;
  }, [id?.localIp, target?.ip]);

  // Si la cible WRC change (ip/port/preset), on revalide la connexion
  useEffect(() => {
    setWrcReady(false);
    setPresetReloadNeeded(false);
    presetReloadNeededRef.current = false;
  }, [target.ip, target.port, target.preset]);

  useEffect(() => {
    if (editMode && wrcReady) return;
    if (!presetReloadNeededRef.current) return;
    setPresetReloadNeeded(false);
    presetReloadNeededRef.current = false;
  }, [editMode, wrcReady]);

  /* ----------- Init + layout ----------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, h, p] = await Promise.all([
          getCommon(),
          getHosts(),
          getProjects({ light: true })
        ]);
        if (!alive) return;
        setCommon(c || {});
        setHosts(Array.isArray(h) ? sortHosts(h, lang) : []);
        const projName = String(p?.activeName || '').trim();
        const projId = String(p?.activeId || '').trim();
        const projectKey = projId || projName;
        setActiveName(projName);
        setActiveId(projId);
        setProjectsList(Array.isArray(p?.projects) ? p.projects : []);
        presetSnapshotRef.current = { exists: false, hash: '' };

        if (projectKey) {
          try {
            const data = await getLayout(projectKey);
            if (!alive) return;
            const rawLayouts = Array.isArray(data?.layouts) ? data.layouts : [];
            let normalizedLayouts = rawLayouts.map((l, idx) => {
              const id = String(l?.id || '').trim() || `layout-${idx + 1}`;
              const name = String(l?.name || '').trim().slice(0, maxLayoutNameLen) || `Layout ${idx + 1}`;
              const layout = Array.isArray(l?.layout) ? l.layout : [];
              const color = String(l?.color || '#1F2937').trim() || '#1F2937';
              const isStart = !!l?.isStart;
              return { id, name, layout, color, isStart };
            });

            if (normalizedLayouts.length === 0) {
              const fallback = Array.isArray(data?.layout) ? data.layout : [];
              normalizedLayouts = [{
                id: 'layout-1',
                name: 'Layout 1',
                layout: fallback,
                color: '#1F2937',
                isStart: false,
              }];
            }

            let nextActiveLayoutId = String(data?.activeLayoutId || data?.layoutId || '').trim();
            if (!nextActiveLayoutId || !normalizedLayouts.some((l) => l.id === nextActiveLayoutId)) {
              nextActiveLayoutId = normalizedLayouts[0]?.id || '';
            }

            const activeLayout = normalizedLayouts.find((l) => l.id === nextActiveLayoutId) || normalizedLayouts[0];
            const arr = Array.isArray(activeLayout?.layout) ? activeLayout.layout : [];

            setLayouts(normalizedLayouts);
            setActiveLayoutId(nextActiveLayoutId);

            const initialValues = applyLayout(arr);

            if (projectKey && nextActiveLayoutId) {
              const serialized = JSON.stringify(buildLayoutWithValues(arr, initialValues, hosts));
              lastSavedLayoutRef.current[`${projectKey}::${nextActiveLayoutId}`] = serialized;
            }

            const savedPreset = data?.preset && typeof data.preset === 'object'
              ? data.preset
              : null;
            presetSnapshotRef.current = {
              exists: !!savedPreset,
              hash: String(savedPreset?.presetHash || '').trim(),
            };

            if (savedPreset?.data) {
              try {
                const snapPreset =
                  savedPreset.data.Preset || savedPreset.data.preset || null;
                if (snapPreset) {
                  setPresetData(normalizePreset(snapPreset));
                }
              } catch {
                /* ignore snapshot error */
              }
            }
          } catch {
            /* pas de layout → ok */
          }
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (!alive) return;
        setLayoutReady(true);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ----------- Preset UE ----------- */
  const loadPreset = useCallback(async () => {
    const now = Date.now();
    if (loadPresetInFlightRef.current) {
      const since = Number(loadPresetInFlightSinceRef.current || 0);
      // Filet de sécurité: si un run précédent est bloqué, on débloque
      // le rechargement manuel après 15s.
      if (!since || now - since < 15000) return;
      loadPresetInFlightRef.current = false;
    }
    if (!target.ip || !target.port || !target.preset) {
      setWrcReady(false);
      setWrcStatus(t('production.error.missingWrcConfig'), 'error');
      return;
    }

    loadPresetInFlightRef.current = true;
    loadPresetInFlightSinceRef.current = now;
    const previous = presetDataRef.current;
    try {
      setErr('');
      const r = await wrcGetPreset(target.ip, target.port, target.preset);
      if (!aliveRef.current) return;
      if (!r.ok) {
        const rawError = String(r.error || '');
        const lower = rawError.toLowerCase();
        const isTimeout =
          lower.includes('timeout') ||
          lower.includes('abort') ||
          lower.includes('network request failed') ||
          lower.includes('fetch failed') ||
          lower.includes('failed to fetch');
        const isUnreachable = lower.includes('econnrefused') || isTimeout;
        const isPresetNotFound =
          lower.includes('404') ||
          lower.includes('not found') ||
          lower.includes('preset');

        if (isUnreachable) {
          const running = await isTargetUnrealRunning();
          if (running) {
            setWrcStatus(t('production.error.noPresetFieldRunning'), 'error');
            setPresetData(previous || null);
            setWrcReady(false);
            return;
          }
          const hasSnapshot = !!previous || !!presetSnapshotRef.current.exists;
          setWrcStatus(
            hasSnapshot
              ? t('production.error.wrcUnreachableUsingSnapshot')
              : t('production.error.wrcUnreachableNoSnapshot'),
            'error'
          );
          setPresetData(previous || null);
          setWrcReady(false);
          return;
        }

        if (isPresetNotFound) {
          const running = await isTargetUnrealRunning();
          setWrcStatus(
            running
              ? t('production.error.noPresetFieldRunning')
              : t('production.error.noPresetField'),
            'error'
          );
          setPresetData(previous || null);
          setWrcReady(false);
          return;
        }

        setErr(rawError || `HTTP ${r.status}`);
        setPresetData(previous || null);
        setWrcReady(false);
        return;
      }

      const j = typeof r.data === 'object' ? r.data : JSON.parse(r.text || '{}');
      const preset = j?.Preset || j?.preset || null;
      if (!preset) {
        const running = await isTargetUnrealRunning();
        setWrcStatus(
          running
            ? t('production.error.noPresetFieldRunning')
            : t('production.error.noPresetField'),
          'error'
        );
        setPresetData(previous || null);
        setWrcReady(false);
        return;
      }

      const norm = normalizePreset(preset);
      setPresetData(norm);
      try {
        presetSignatureRef.current = JSON.stringify(norm);
      } catch {
        presetSignatureRef.current = '';
      }
      setPresetReloadNeeded(false);
      presetReloadNeededRef.current = false;

      const reconciliation = reconcileWidgetsWithPreset(
        widgetsRef.current,
        norm
      );
      if (reconciliation.changed) {
        setWidgets(reconciliation.widgets);
      }
      if (reconciliation.invalidatedCount > 0) {
        showInfo(
          t('production.msg.wrcBindingsInvalidated', {
            count: reconciliation.invalidatedCount
          }),
          'error'
        );
      }

      setWrcReady(true);

      const previousHash = String(presetSnapshotRef.current.hash || '').trim();
      let nextHash = '';
      const projectKey = String(activeId || activeName || '').trim();
      if (projectKey) {
        try {
          const res = await savePresetSnapshot(
            projectKey,
            target.ip,
            target.port,
            target.preset
          );
          nextHash = String(res?.presetHash || '').trim();
          presetSnapshotRef.current = {
            exists: true,
            hash: nextHash || previousHash,
          };
        } catch (e) {
          console.warn('savePresetSnapshot failed', e);
          presetSnapshotRef.current = {
            exists: true,
            hash: previousHash,
          };
        }
      }

      const updatedByHash = !!nextHash && nextHash !== previousHash;
      const updatedByValue =
        !previous || JSON.stringify(previous) !== JSON.stringify(norm);
      const updated = updatedByHash || (!nextHash && updatedByValue);

      setWrcStatus(
        updated
          ? t('production.status.presetFoundUpdated')
          : t('production.status.presetFound'),
        'ok'
      );
    } catch {
      if (!aliveRef.current) return;
      const running = await isTargetUnrealRunning();
      setWrcStatus(
        running
          ? t('production.error.noPresetFieldRunning')
          : t('production.error.noPresetField'),
        'error'
      );
      setPresetData(previous || null);
      setWrcReady(false);
    } finally {
      loadPresetInFlightRef.current = false;
      loadPresetInFlightSinceRef.current = 0;
    }
  }, [activeId, activeName, isTargetUnrealRunning, setWrcStatus, t, target.ip, target.port, target.preset]);

  useEffect(() => {
    if (loading || !layoutReady) return;
    loadPreset();
  }, [loading, layoutReady, loadPreset]);

  // Retry automatique du preset WRC tant que non prêt (utile si on arrive sur
  // Production pendant que Launch vient juste de démarrer Unreal/WRC).
  useEffect(() => {
    if (loading || !layoutReady) return undefined;
    if (wrcReady) return undefined;

    let cancelled = false;
    let timer = null;
    const retryMs = Math.max(1000, Number(common?.refreshSec || 3) * 1000);

    const schedule = () => {
      if (cancelled || !aliveRef.current || wrcReady) return;
      timer = setTimeout(async () => {
        if (cancelled || !aliveRef.current || wrcReady) return;
        await loadPreset();
        schedule();
      }, retryMs);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, layoutReady, wrcReady, loadPreset, common?.refreshSec]);

  // En mode Édition, on surveille si le preset distant a changé pour
  // signaler un rechargement manuel (sans auto-reload).
  useEffect(() => {
    if (loading || !layoutReady || !editMode || !wrcReady) return undefined;
    if (!target.ip || !target.port || !target.preset) return undefined;

    let cancelled = false;
    let timer = null;
    const checkMs = Math.max(1000, Number(common?.refreshSec || 3) * 1000);

    const checkReloadNeeded = async () => {
      if (cancelled || !aliveRef.current || !editMode || !wrcReady) return;
      if (loadPresetInFlightRef.current) return;

      const localSig = String(presetSignatureRef.current || '').trim();
      if (!localSig) return;

      try {
        const r = await wrcGetPreset(target.ip, target.port, target.preset);
        if (cancelled || !aliveRef.current || !editMode || !wrcReady) return;
        if (!r?.ok) return;

        const payload =
          typeof r.data === 'object' && r.data !== null
            ? r.data
            : JSON.parse(String(r.text || '{}'));
        const preset = payload?.Preset || payload?.preset || null;
        if (!preset) return;

        let remoteSig = '';
        try {
          remoteSig = JSON.stringify(normalizePreset(preset));
        } catch {
          remoteSig = '';
        }
        if (!remoteSig) return;

        const needsReload = remoteSig !== localSig;
        if (needsReload === presetReloadNeededRef.current) return;

        presetReloadNeededRef.current = needsReload;
        setPresetReloadNeeded(needsReload);

      } catch {
        // ignore reload-check errors
      }
    };

    const schedule = () => {
      if (cancelled || !aliveRef.current) return;
      timer = setTimeout(async () => {
        await checkReloadNeeded();
        schedule();
      }, checkMs);
    };

    checkReloadNeeded();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    loading,
    layoutReady,
    editMode,
    wrcReady,
    target.ip,
    target.port,
    target.preset,
    common?.refreshSec
  ]);

  /* ----------- Palette / Layout ----------- */
  function createWidgetId() {
    return (
      (crypto?.randomUUID && crypto.randomUUID()) ||
      String(Date.now()) + Math.random().toString(16).slice(2)
    );
  }

  function addWidget(type, initialPos) {
    const id = createWidgetId();

    const baseTargets = {};
    (hosts || []).forEach((m) => {
      if (m?.ip) baseTargets[m.ip] = false;
    });

        const defaults = {
          button: {
            label: t('production.widgets.buttonLabel'),
            binding: {
              kind: 'function',
              displayName: '',
              argValues: {},
              argDefaults: {}
            },
            ui: {
              showArguments: false
            }
          },
          text: {
            label: t('production.widgets.textLabel'),
            binding: { kind: 'property', path: '', valueType: 'text' },
            defaultValue: ''
          },
          slider: {
            label: t('production.widgets.sliderLabel'),
            binding: { kind: 'property', path: '', valueType: 'float' },
            ui: { min: -10, max: 10, step: 0.1 }
          },
          vector: {
            label: t('production.widgets.vectorLabel'),
            binding: { kind: 'property', path: '', valueType: 'vector' },
            ui: {}
          },
          transform: {
            label: t('production.widgets.transformLabel'),
            binding: { kind: 'property', path: '', valueType: 'transform' },
            ui: {}
          },
          joystick: {
            label: t('production.widgets.joystickLabel'),
            // en pratique on vise une propriété Vector (XY)
            binding: { kind: 'property', path: '', valueType: 'vector' },
            ui: {
              linkType: 'vector2d',
              minX: -10,
              maxX: 10,
              minY: -10,
              maxY: 10
            },
            joystickBindings: {
              x: { kind: 'property', path: '', valueType: 'float' },
              y: { kind: 'property', path: '', valueType: 'float' }
            }
          },

          toggle: {
            label: t('production.widgets.toggleLabel'),
            binding: { kind: 'property', path: '', valueType: 'bool' },
            defaultValue: false
          },
          color: {
            label: t('production.widgets.colorLabel'),
            binding: { kind: 'property', path: '', valueType: 'color' },
            defaultValue: '#ff0000|1.000'
          },
          dropdown: {
            label: t('production.widgets.dropdownLabel'),
            binding: { kind: 'property', path: '', valueType: 'text' },
            ui: {
              options: [
                { label: 'Option 1', value: 'Option 1' },
                { label: 'Option 2', value: 'Option 2' }
              ]
            }
          },
          enum: {
            label: t('production.widgets.enumLabel'),
            // On reste sur une propriété texte côté WRC
            binding: { kind: 'property', path: '', valueType: 'text' },
            ui: {
              options: [
                { label: 'Option 1', value: 'Option1' },
                { label: 'Option 2', value: 'Option2' }
              ]
            }
          },
          browse: {
            label: t('production.widgets.browseLabel'),
            binding: { kind: 'property', path: '', valueType: 'text' },
            mediaPath: '',
            mediaType: '',
            browseLastDir: '',
            browsePreferType: '',
            defaultValue: ''
          },

          timeline: {
            label: t('production.widgets.timelineLabel'),
            ui: {
              timeline: {
                mode: 'single',
                tracks: []
              }
            }
          },

          // Nouveau type "zone" : purement organisationnel
          zone: {
            label: t('production.widgets.zoneLabel'),
            note: '',
            ui: {
              // couleur de base (pleine dans le header, avec alpha dans le body plus tard)
              color: '#1F2937'
            }
            // pas de binding WRC
          }
        };

  const base = {
    id,
    type,
    // Par défaut : aucun parent de zone
    zoneId: null,
    targets: baseTargets,
    // Position & taille par défaut (ou position fournie)
    x: snap(initialPos?.x ?? 40),
    y: snap(initialPos?.y ?? 40),
    w: 260,
    h: 160,

    ...(defaults[type] || defaults.text)
  };

    if (type === 'timeline') {
      base.w = 320;
      base.h = 140;
    }

    setWidgets((prev) => [...prev, base]);
    setSelectedId(id);
    if (editMode) setLeftPanelMode('editor');
  }

  function onDragStart(e, id) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function onDrop(e, overId) {
    const dragId = e.dataTransfer.getData('text/plain');
    if (!dragId || dragId === overId) return;

    const from = widgets.findIndex((w) => w.id === dragId);
    const to = widgets.findIndex((w) => w.id === overId);
    if (from < 0 || to < 0) return;

    const next = widgets.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setWidgets(next);
  }

  useEffect(() => {
    setWidgets((prev) =>
      prev.map((w) => {
        const nextT = { ...(w.targets || {}) };
        (hosts || []).forEach((m) => {
          if (m?.ip && !(m.ip in nextT)) nextT[m.ip] = false;
        });
        Object.keys(nextT).forEach((ip) => {
          if (!(hosts || []).some((m) => m?.ip === ip)) delete nextT[ip];
        });
        return { ...w, targets: nextT };
      })
    );
  }, [JSON.stringify(hosts)]);

  function applyLayout(layoutArr = []) {
    const normalized = Array.isArray(layoutArr)
      ? layoutArr.map(normalizeBrowseWidget)
      : [];
    setWidgets(normalized);
    const initialValues = extractValuesFromLayout(normalized);
    setValues(initialValues);
    setSelectedId(null);
    return initialValues;
  }

  function layoutDefaultName(index) {
    return (
      t('production.layouts.defaultName', { index })
    );
  }

  function normalizeLayoutName(name, fallback) {
    const trimmed = String(name || '').trim().slice(0, maxLayoutNameLen);
    if (trimmed) return trimmed;
    if (fallback !== undefined) return fallback;
    return layoutDefaultName(1);
  }

  function normalizeLayoutList(raw = []) {
    const list = Array.isArray(raw) ? raw : [];
    return list.map((l, idx) => {
      const id = String(l?.id || '').trim() || `layout-${idx + 1}`;
      const fallbackName = layoutDefaultName(idx + 1);
      const name = normalizeLayoutName(l?.name, fallbackName);
      const layout = Array.isArray(l?.layout) ? l.layout : [];
      const color = String(l?.color || '#1F2937').trim() || '#1F2937';
      const isStart = !!l?.isStart;
      return { id, name, layout, color, isStart };
    });
  }

  function resolveActiveLayoutId(rawId, list) {
    const val = String(rawId || '').trim();
    if (val && list.some((l) => l.id === val)) return val;
    return list[0]?.id || '';
  }

  function showInfo(message, type = 'error') {
    const msg = String(message || '').trim();
    if (!msg) return;
    setInfoMsg(msg);
    setInfoMsgType(type);
    setTimeout(() => {
      setInfoMsg('');
      setInfoMsgType('');
    }, 2500);
  }

  function updateLayoutInState(layoutId, nextLayoutArr) {
    if (!layoutId || !Array.isArray(nextLayoutArr)) return;
    setLayouts((prev) =>
      prev.map((l) => (l.id === layoutId ? { ...l, layout: nextLayoutArr } : l))
    );
    layoutsRef.current = (layoutsRef.current || []).map((l) =>
      l && l.id === layoutId ? { ...l, layout: nextLayoutArr } : l
    );
  }

  function reportLayoutError(context, error) {
    const msg = error?.message || t('production.msg.layoutSaveFailed');
    console.error('[Production][layout] save failed', { context, error });
    showInfo(`${t('production.msg.layoutSaveFailed')}: ${msg}`, 'error');
  }

  function beginLayoutRename(layout) {
    if (!editMode || !layout?.id) return;
    layoutRenameCancelRef.current = false;
    setEditingLayoutId(layout.id);
    setLayoutNameDraft(String(layout.name || ''));
  }

  function cancelLayoutRename() {
    layoutRenameCancelRef.current = true;
    setEditingLayoutId('');
    setLayoutNameDraft('');
  }

  function commitLayoutRename(layoutId, draft) {
    if (layoutRenameCancelRef.current) {
      layoutRenameCancelRef.current = false;
      return;
    }
    handleRenameLayout(layoutId, draft);
  }

  async function handleUpdateLayoutMeta(changes = {}) {
    if (!activeLayoutId) return;
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;

    const isStartRequested = Object.prototype.hasOwnProperty.call(changes, 'isStart')
      ? !!changes.isStart
      : undefined;

    // Si on passe en Start, on doit désactiver le live des widgets
    if (isStartRequested === true) {
      const hasLive = widgets.some((w) => w?.ui?.live === true);
      if (hasLive) {
        const confirmMsg = t('production.startLayout.disableLiveConfirm');
        const ok = await requestConfirm(confirmMsg);
        if (!ok) return;
        const nextWidgets = widgets.map((w) => ({
          ...w,
          ui: { ...(w.ui || {}), live: false }
        }));
        setWidgets(nextWidgets);
        // On force la sauvegarde pour enregistrer l’état non-live
        const snapshot = buildLayoutWithValues(nextWidgets, values, hosts);
        const serialized = JSON.stringify(snapshot || []);
        try {
          console.debug('[Production][layout] save (start toggle -> force non-live)', {
            projectKey,
            layoutId: activeLayoutId,
            timeoutMs: layoutSaveTimeoutMs
          });
          await saveLayout(projectKey, snapshot, { layoutId: activeLayoutId }, layoutSaveTimeoutMs);
          lastSavedLayoutRef.current[`${projectKey}::${activeLayoutId}`] = serialized;
        } catch (e) {
          reportLayoutError('update-meta-live-off', e);
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
      const nextName = normalizeLayoutName(changes.name, activeLayout?.name || layoutDefaultName(1));
      if (isDuplicateLayoutName(nextName, activeLayoutId)) {
        showInfo(t('production.layouts.duplicateName'), 'error');
        return;
      }
    }

    const nextLayouts = layouts.map((l) => {
      if (l.id !== activeLayoutId) {
        if (isStartRequested === true) return { ...l, isStart: false };
        return l;
      }
      return {
        ...l,
        name: Object.prototype.hasOwnProperty.call(changes, 'name') ? changes.name : l.name,
        color: Object.prototype.hasOwnProperty.call(changes, 'color') ? normalizeLayoutColor(changes.color) : l.color,
        isStart: Object.prototype.hasOwnProperty.call(changes, 'isStart') ? !!changes.isStart : l.isStart,
      };
    });
    setLayouts(nextLayouts);

    const hasStartChange = Object.prototype.hasOwnProperty.call(changes, 'isStart');
    const isStartValue = hasStartChange ? !!changes.isStart : undefined;
    const otherStartLayouts =
      hasStartChange && isStartValue
        ? layouts.filter((l) => l?.isStart && l.id !== activeLayoutId).map((l) => l.id)
        : [];

    // Si on touche au Start, on renvoie le layout courant pour forcer l'écriture immédiate
    const layoutPayload = hasStartChange
      ? buildLayoutWithValues(widgets, values, hosts)
      : null;

    const payload = {
      layoutId: activeLayoutId,
      action: 'update-meta'
    };
    if (Object.prototype.hasOwnProperty.call(changes, 'name')) payload.name = String(changes.name || '');
    if (Object.prototype.hasOwnProperty.call(changes, 'color')) payload.color = normalizeLayoutColor(changes.color);
    if (hasStartChange) payload.isStart = isStartValue;

    setStartLayoutToggleBusy(true);
    try {
      await saveLayout(projectKey, layoutPayload, payload);

      // Si on vient d'activer un Start, on désactive les autres existants côté agent.
      if (otherStartLayouts.length) {
        await Promise.all(
          otherStartLayouts.map((id) =>
            saveLayout(projectKey, null, { layoutId: id, action: 'update-meta', isStart: false }).catch(() => {})
          )
        );
      }
    } finally {
      setStartLayoutToggleBusy(false);
    }
  }

  function slugifyFilename(name = '') {
    const base = String(name || 'layout')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return base || 'layout';
  }

  function decodeDataUrlToText(dataUrl = '') {
    const parts = String(dataUrl || '').split(',');
    if (parts.length < 2) return '';
    const base64 = parts.slice(1).join(',');
    try {
      return atob(base64);
    } catch {
      return '';
    }
  }

  async function handleExportLayout() {
    if (!activeLayoutId) return;
    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const payload = {
      name: activeLayout?.name || '',
      color: normalizeLayoutColor(activeLayout?.color),
      isStart: !!activeLayout?.isStart,
      layout: snapshot || [],
    };
    const content = JSON.stringify(payload, null, 2);
    const defaultName = `${slugifyFilename(activeLayout?.name)}.json`;

    if (window.electron?.exportFile) {
      await window.electron.exportFile({
        defaultName,
        content,
        filters: [{ name: 'Layout JSON', extensions: ['json'] }],
      });
      return;
    }

    // Fallback navigateur
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportLayout() {
    if (!activeLayoutId) return;
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;

    if (typeof window.electron?.chooseFile !== 'function') {
      showInfo(t('production.layout.importError'), 'error');
      return;
    }

    const filePath = await window.electron.chooseFile({
      title: t('production.layout.importTitle'),
      filters: [{ name: 'Layout JSON', extensions: ['json'] }],
    });
    if (!filePath) return;

    let text = '';
    if (typeof window.electron?.readFileText === 'function') {
      text = (await window.electron.readFileText(filePath)) || '';
    }
    if (!text && typeof window.electron?.readFileAsDataUrl === 'function') {
      try {
        const dataUrl = await window.electron.readFileAsDataUrl(filePath);
        text = decodeDataUrlToText(dataUrl);
      } catch {
        /* ignore; fallback below */
      }
    }
    if (!text) {
      showInfo(t('production.layout.importError'), 'error');
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showInfo(t('production.layout.importErrorParse'), 'error');
      return;
    }

    if (!Array.isArray(data?.layout)) {
      showInfo(t('production.layout.importErrorFormat'), 'error');
      return;
    }

    const confirmMsg = t('production.layout.importConfirm');
    if (!(await requestConfirm(confirmMsg))) return;

    const nextLayoutArr = data.layout.map(normalizeBrowseWidget);
    const nextValues = extractValuesFromLayout(nextLayoutArr);

    const nextName = normalizeLayoutName(data.name, activeLayout?.name || layoutDefaultName(1));
    const uniqueName = makeUniqueName(nextName);
    const nextColor = normalizeLayoutColor(data.color);

    setWidgets(nextLayoutArr);
    setValues(nextValues);
    setSelectedId(null);

    setLayouts((prev) =>
      prev.map((l) =>
        l.id === activeLayoutId
          ? {
              ...l,
              name: uniqueName,
              color: nextColor,
              isStart: false,
              layout: nextLayoutArr,
            }
          : l
      )
    );

    // Sauvegarde serveur
    const snapshot = buildLayoutWithValues(nextLayoutArr, nextValues, hosts);
    const serialized = JSON.stringify(snapshot || []);
    setExportImportBusy(true);
    try {
      console.debug('[Production][layout] save (import)', {
        projectKey,
        layoutId: activeLayoutId,
        timeoutMs: layoutSaveTimeoutMs
      });
      await saveLayout(projectKey, snapshot, {
        layoutId: activeLayoutId,
        name: uniqueName,
        color: nextColor,
        isStart: false,
      }, layoutSaveTimeoutMs);
      lastSavedLayoutRef.current[`${projectKey}::${activeLayoutId}`] = serialized;
      updateLayoutInState(activeLayoutId, snapshot);
    } catch (e) {
      reportLayoutError('import-layout', e);
    } finally {
      setExportImportBusy(false);
    }
  }

  async function flushActiveLayout() {
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey || !activeLayoutId) return;
    const layoutMeta =
      layoutsRef.current?.find((l) => l?.id === activeLayoutId) ||
      layouts.find((l) => l?.id === activeLayoutId) ||
      null;
    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(snapshot || []);
    const key = `${projectKey}::${activeLayoutId}`;
    if (lastSavedLayoutRef.current[key] === serialized) return;
    try {
      console.debug('[Production][layout] save (flush)', {
        projectKey,
        layoutId: activeLayoutId,
        timeoutMs: layoutSaveTimeoutMs
      });
      await saveLayout(
        projectKey,
        snapshot,
        { layoutId: activeLayoutId, isStart: !!layoutMeta?.isStart },
        layoutSaveTimeoutMs
      );
      lastSavedLayoutRef.current[key] = serialized;
      updateLayoutInState(activeLayoutId, snapshot);
    } catch (e) {
      reportLayoutError('flush-active-layout', e);
    }
  }

  function applyLayoutResponse(data, projectKeyOverride = '') {
    const projectKey = String(projectKeyOverride || activeId || activeName || '').trim();
    const normalizedLayouts = normalizeLayoutList(data?.layouts || []);
    if (normalizedLayouts.length === 0) return;
    const nextActiveId = resolveActiveLayoutId(
      data?.activeLayoutId || data?.layoutId,
      normalizedLayouts
    );
    const activeLayout =
      normalizedLayouts.find((l) => l.id === nextActiveId) ||
      normalizedLayouts[0];

    setLayouts(normalizedLayouts);
    setActiveLayoutId(nextActiveId);

    const initialValues = applyLayout(activeLayout?.layout || []);

    if (projectKey && nextActiveId) {
      const serialized = JSON.stringify(
        buildLayoutWithValues(activeLayout?.layout || [], initialValues, hosts)
      );
      lastSavedLayoutRef.current[`${projectKey}::${nextActiveId}`] = serialized;
    }
  }

  async function handleSelectLayout(nextId) {
    const projectKey = String(activeId || activeName || '').trim();
    if (!nextId || nextId === activeLayoutId) return;
    const prevId = activeLayoutId;
    const prevLayoutMeta =
      layoutsRef.current?.find((l) => l?.id === prevId) ||
      layouts.find((l) => l?.id === prevId) ||
      null;
    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(snapshot || []);
    const prevKey = `${projectKey}::${prevId}`;
    if (projectKey && prevId) {
      // Sauvegarde uniquement si le contenu a changé
      if (lastSavedLayoutRef.current[prevKey] !== serialized) {
        lastSavedLayoutRef.current[prevKey] = serialized;
        updateLayoutInState(prevId, snapshot);
        saveLayout(projectKey, snapshot, {
          layoutId: prevId,
          isStart: !!prevLayoutMeta?.isStart
        }).catch((e) => {
          const msg = e?.message || t('production.msg.layoutSaveFailed');
          showInfo(`${t('production.msg.layoutSaveFailed')}: ${msg}`);
        });
      }
    }

    const list = layoutsRef.current || [];
    const nextLayout = list.find((l) => l.id === nextId);
    if (!nextLayout) return;

    setActiveLayoutId(nextId);
    const initialValues = applyLayout(nextLayout.layout || []);

    if (projectKey) {
      const nextSerialized = JSON.stringify(
        buildLayoutWithValues(nextLayout.layout || [], initialValues, hosts)
      );
      lastSavedLayoutRef.current[`${projectKey}::${nextId}`] = nextSerialized;
      saveLayout(projectKey, null, { action: 'set-active', layoutId: nextId }).catch((e) => {
        const msg = e?.message || t('production.msg.layoutSaveFailed');
        showInfo(`${t('production.msg.layoutSaveFailed')}: ${msg}`);
      });
    }
  }

  async function handleAddLayout() {
    if (!editMode) return;
    if (layoutsRef.current.length >= maxLayouts) {
      showInfo(t('production.layouts.maxReached', { max: maxLayouts }));
      return;
    }
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;
    await flushActiveLayout();
    const baseName = layoutDefaultName(layoutsRef.current.length + 1);
    const name = makeUniqueName(baseName);
    try {
      const res = await saveLayout(projectKey, null, { action: 'add', name });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (e) {
      showInfo(e?.message || t('production.msg.layoutSaveFailed'));
    }
  }

  async function handleDuplicateLayout(layoutId) {
    if (!editMode || !layoutId) return;
    if (layoutsRef.current.length >= maxLayouts) {
      showInfo(t('production.layouts.maxReached', { max: maxLayouts }));
      return;
    }
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;
    await flushActiveLayout();
    try {
      const src = layoutsRef.current.find((l) => l.id === layoutId);
      const cloneName = src ? makeUniqueName(src.name || layoutDefaultName(layoutsRef.current.length + 1)) : undefined;
      const res = await saveLayout(projectKey, null, { action: 'duplicate', layoutId, name: cloneName });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (e) {
      showInfo(e?.message || t('production.msg.layoutSaveFailed'));
    }
  }

  async function handleDeleteLayout(layoutId) {
    if (!editMode || !layoutId) return;
    if (layoutsRef.current.length <= 1) {
      showInfo(t('production.layouts.minRequired'));
      return;
    }
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;
    await flushActiveLayout();
    try {
      const res = await saveLayout(projectKey, null, { action: 'delete', layoutId });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (e) {
      reportLayoutError('delete-layout', e);
    }
  }

  async function handleRenameLayout(layoutId, name) {
    if (!layoutId) return;
    const nextName = normalizeLayoutName(name, '');
    if (!nextName) {
      setEditingLayoutId('');
      setLayoutNameDraft('');
      return;
    }
    if (isDuplicateLayoutName(nextName, layoutId)) {
      showInfo(t('production.layouts.duplicateName'), 'error');
      return;
    }
    setLayouts((prev) =>
      prev.map((l) => (l.id === layoutId ? { ...l, name: nextName } : l))
    );
    setEditingLayoutId('');
    setLayoutNameDraft('');
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;
    try {
      await saveLayout(projectKey, null, { action: 'rename', layoutId, name: nextName });
    } catch (e) {
      reportLayoutError('rename-layout', e);
    }
  }

  async function handleReorderLayouts(fromIdx, toIdx) {
    if (!editMode) return;
    const list = layoutsRef.current || [];
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const next = list.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLayouts(next);
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey) return;
    try {
      await saveLayout(projectKey, null, { action: 'reorder', order: next.map((l) => l.id) });
    } catch (e) {
      reportLayoutError('reorder-layouts', e);
    }
  }

  function updateSelected(updates) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === selectedId ? { ...w, ...updates } : w))
    );
  }

  function updateBinding(updates) {
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === selectedId
          ? (() => {
              const nextBinding = { ...(w.binding || {}), ...updates };
              const hasDisplayNamePatch =
                updates &&
                typeof updates === 'object' &&
                Object.prototype.hasOwnProperty.call(updates, 'displayName');
              if (
                w.type === 'button' &&
                hasDisplayNamePatch
              ) {
                nextBinding.argDefaults = {};
                nextBinding.argValues = {};
              }
              return { ...w, binding: nextBinding };
            })()
          : w
      )
    );
  }

  function updateWidgetById(id, updates) {
    if (!id) return;
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  }

  const cueStartLayout = useCallback(async () => {
    if (!activeLayout?.isStart || editMode || !layoutReady) return;

    const timelines = widgets.filter((w) => w.type === 'timeline');
    if (!timelines.length) return;

    const sig = JSON.stringify(
      timelines.map((w) => ({
        id: w.id,
        timeline: w.ui?.timeline
      }))
    );
    if (
      lastStartCueRef.current.layoutId === activeLayout.id &&
      lastStartCueRef.current.sig === sig
    ) {
      return;
    }

    try {
      const { resolveTimelineFps, normalizeTimeline, createTimelinePlayer } = await loadTimelineUtils();
      const { fps } = resolveTimelineFps(hosts);

      timelines.forEach((tw) => {
        const timeline = normalizeTimeline(tw.ui?.timeline);
        const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
        if (!innerWidgets.length) return;
        try {
          const player = createTimelinePlayer({
            timeline,
            widgets: innerWidgets,
            hosts,
            common: commonForProject,
            fps,
            startFrame: 0,
            onError: () => {}
          });
          player.seek(0, { triggerEvents: true });
        } catch (e) {
          console.warn('[Timeline][StartLayout] cue failed', e);
        }
      });
    } catch {
      // ignore timeline preload errors
    }

    lastStartCueRef.current = { layoutId: activeLayout.id, sig };
  }, [activeLayout?.id, activeLayout?.isStart, editMode, layoutReady, widgets, hosts, commonForProject]);

  // Start Layout : appliqué seulement quand WRC est accessible (scène vraiment lancée).
  useEffect(() => {
    if (!activeLayout?.isStart) return;
    if (editMode) return;
    if (!layoutReady) return;

    let cancelled = false;

    const ensureWrcThenCue = async (attempt = 0) => {
      if (cancelled || !aliveRef.current) return;

      // Si on sait déjà que le WRC est prêt, on cue tout de suite
      if (wrcReady) {
        cueStartLayout();
        return;
      }

      try {
        const res = await wrcGetPreset(target.ip, target.port, target.preset);
        if (cancelled || !aliveRef.current) return;
        if (res?.ok) {
          setWrcReady(true);
          cueStartLayout();
          return;
        }
      } catch {
        /* retry below */
      }

      if (attempt < 5) {
        setTimeout(() => ensureWrcThenCue(attempt + 1), 800);
      }
    };

    ensureWrcThenCue();

    return () => {
      cancelled = true;
    };
  }, [
    activeLayout?.id,
    activeLayout?.isStart,
    editMode,
    layoutReady,
    wrcReady,
    cueStartLayout,
    target.ip,
    target.port,
    target.preset
  ]);

  function removeWidget(id) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateWidget(widgetId) {
    const source = (widgets || []).find((w) => w.id === widgetId);
    if (!source) return;

    const offset = 20;
    const nextWidgets = (widgets || []).slice();
    const nextValues = { ...(values || {}) };

    if (source.type === 'zone') {
      const newZoneId = createWidgetId();
      const zoneX = Number(source.x ?? 40);
      const zoneY = Number(source.y ?? 40);
      const zoneClone = {
        ...source,
        id: newZoneId,
        zoneId: null,
        x: snap(zoneX + offset),
        y: snap(zoneY + offset)
      };
      nextWidgets.push(zoneClone);
      if (values?.[source.id] !== undefined) {
        nextValues[newZoneId] = values[source.id];
      }

      const children = (widgets || []).filter((w) => w.zoneId === source.id);
      children.forEach((child) => {
        const newChildId = createWidgetId();
        const childClone = {
          ...child,
          id: newChildId,
          zoneId: newZoneId
        };
        nextWidgets.push(childClone);
        if (values?.[child.id] !== undefined) {
          nextValues[newChildId] = values[child.id];
        }
      });

      setWidgets(nextWidgets);
      setValues(nextValues);
      setSelectedId(newZoneId);
      if (editMode) setLeftPanelMode('editor');
      return;
    }

    const newId = createWidgetId();
    const inZone = Boolean(source.zoneId);
    const baseX = Number(source.x ?? 40);
    const baseY = Number(source.y ?? 40);
    const nextX = inZone
      ? Math.max(0, snap(baseX + offset))
      : snap(baseX + offset);
    const nextY = inZone
      ? Math.max(0, snap(baseY + offset))
      : snap(baseY + offset);
    const clone = {
      ...source,
      id: newId,
      x: nextX,
      y: nextY
    };
    nextWidgets.push(clone);
    if (values?.[source.id] !== undefined) {
      nextValues[newId] = values[source.id];
    }

    setWidgets(nextWidgets);
    setValues(nextValues);
    setSelectedId(newId);
    if (editMode) setLeftPanelMode('editor');
  }

  function collectSelectionBundle(widgetId, sourceWidgets = widgets) {
    const source = (sourceWidgets || []).find((w) => w.id === widgetId);
    if (!source) return null;

    if (source.type === 'zone') {
      const children = (sourceWidgets || []).filter((w) => w.zoneId === source.id);
      return {
        rootId: source.id,
        items: [source, ...children]
      };
    }

    return {
      rootId: source.id,
      items: [source]
    };
  }

  function buildClipboardPayload(widgetId, mode = 'copy') {
    const bundle = collectSelectionBundle(widgetId, widgets);
    if (!bundle?.items?.length) return null;

    const payloadValues = {};
    const payloadGlobalPos = {};
    bundle.items.forEach((item) => {
      if (!item?.id) return;
      if (values?.[item.id] !== undefined) {
        payloadValues[item.id] = values[item.id];
      }
      const display = (layoutWidgets || []).find((w) => w.id === item.id);
      if (display) {
        payloadGlobalPos[item.id] = {
          x: Number(display.x ?? item.x ?? 40),
          y: Number(display.y ?? item.y ?? 40)
        };
      }
    });

    return {
      version: 1,
      mode,
      rootId: bundle.rootId,
      items: cloneClipboardData(bundle.items),
      values: cloneClipboardData(payloadValues),
      globalPos: cloneClipboardData(payloadGlobalPos),
      createdAt: Date.now()
    };
  }

  function normalizeTargetsForPaste(targetsMap, hostList = hosts) {
    const hostIps = (hostList || [])
      .map((h) => String(h?.ip || '').trim())
      .filter(Boolean);
    if (!hostIps.length) return {};

    const src = targetsMap && typeof targetsMap === 'object' ? targetsMap : {};
    const hasLegacyA = Object.prototype.hasOwnProperty.call(src, 'A');
    const hasLegacyB = Object.prototype.hasOwnProperty.call(src, 'B');

    const out = {};
    hostIps.forEach((ip, idx) => {
      let enabled = false;
      if (Object.prototype.hasOwnProperty.call(src, ip)) {
        enabled = !!src[ip];
      } else if (idx === 0 && hasLegacyA) {
        enabled = !!src.A;
      } else if (idx === 1 && hasLegacyB) {
        enabled = !!src.B;
      }
      out[ip] = enabled;
    });
    return out;
  }

  function materializeClipboardPayload(payload, options = {}) {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return null;
    }
    const forceLiveOff = !!options.forceLiveOff;
    let liveDisabledCount = 0;

    const idMap = {};
    payload.items.forEach((item) => {
      const oldId = String(item?.id || '').trim();
      if (!oldId) return;
      if (!idMap[oldId]) idMap[oldId] = createWidgetId();
    });

    const payloadGlobalPos =
      payload.globalPos && typeof payload.globalPos === 'object'
        ? payload.globalPos
        : {};

    const nextItems = payload.items
      .map((rawItem) => {
        if (!rawItem) return null;
        const oldId = String(rawItem.id || '').trim();
        const nextId = idMap[oldId] || createWidgetId();
        const oldZoneId = String(rawItem.zoneId || '').trim();
        const mappedZoneId = oldZoneId && idMap[oldZoneId] ? idMap[oldZoneId] : null;
        const sameLayoutZoneExists =
          !mappedZoneId &&
          oldZoneId &&
          (widgets || []).some((w) => w.id === oldZoneId && w.type === 'zone');
        const nextZoneId =
          rawItem.type === 'zone'
            ? null
            : mappedZoneId || (sameLayoutZoneExists ? oldZoneId : null);

        let nextX = rawItem.x;
        let nextY = rawItem.y;
        if (rawItem.type !== 'zone' && oldZoneId && !nextZoneId) {
          const globalPos = payloadGlobalPos[oldId];
          const gx = Number(globalPos?.x);
          const gy = Number(globalPos?.y);
          if (Number.isFinite(gx)) nextX = gx;
          if (Number.isFinite(gy)) nextY = gy;
        }

        const rawUi =
          rawItem.ui && typeof rawItem.ui === 'object'
            ? rawItem.ui
            : null;
        if (forceLiveOff && rawUi?.live === true) {
          liveDisabledCount += 1;
        }
        const nextUi =
          forceLiveOff &&
          rawUi &&
          Object.prototype.hasOwnProperty.call(rawUi, 'live')
            ? { ...rawUi, live: false }
            : rawUi || rawItem.ui;

        return normalizeBrowseWidget({
          ...rawItem,
          id: nextId,
          zoneId: nextZoneId,
          x: nextX,
          y: nextY,
          ui: nextUi,
          targets: normalizeTargetsForPaste(rawItem.targets, hosts)
        });
      })
      .filter(Boolean);

    if (!nextItems.length) return null;

    const payloadValues =
      payload.values && typeof payload.values === 'object'
        ? payload.values
        : {};
    const nextValues = {};
    Object.entries(payloadValues).forEach(([oldId, val]) => {
      const mappedId = idMap[String(oldId || '').trim()];
      if (!mappedId) return;
      nextValues[mappedId] = cloneClipboardData(val);
    });

    return {
      items: nextItems,
      values: nextValues,
      selectedId: idMap[String(payload.rootId || '').trim()] || nextItems[0]?.id || null,
      liveDisabledCount
    };
  }

  function copySelectionToClipboard() {
    if (!selectedId) return false;
    const payload = buildClipboardPayload(selectedId, 'copy');
    if (!payload) return false;
    writeWidgetClipboard(payload);
    return true;
  }

  function cutSelectionToClipboard() {
    if (!selectedId) return false;
    const payload = buildClipboardPayload(selectedId, 'cut');
    if (!payload) return false;
    writeWidgetClipboard(payload);

    const removeIds = new Set(
      (payload.items || [])
        .map((item) => String(item?.id || '').trim())
        .filter(Boolean)
    );
    if (!removeIds.size) return false;

    setWidgets((prev) => prev.filter((w) => !removeIds.has(w.id)));
    setValues((prev) => {
      const next = { ...(prev || {}) };
      removeIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setSelectedId((prev) => (prev && removeIds.has(prev) ? null : prev));
    return true;
  }

  function pasteFromClipboard() {
    const payload = readWidgetClipboard();
    if (!payload) return false;

    const materialized = materializeClipboardPayload(payload, {
      forceLiveOff: !!activeLayout?.isStart
    });
    if (!materialized || !Array.isArray(materialized.items) || materialized.items.length === 0) {
      return false;
    }

    setWidgets((prev) => [...prev, ...materialized.items]);
    setValues((prev) => ({ ...(prev || {}), ...(materialized.values || {}) }));
    setSelectedId(materialized.selectedId || null);
    if (activeLayout?.isStart && Number(materialized.liveDisabledCount) > 0) {
      showInfo(
        t('production.msg.pasteLiveDisabledStart', {
          count: Number(materialized.liveDisabledCount)
        }),
        'error'
      );
    }
    if (editMode) setLeftPanelMode('editor');

    if (String(payload.mode || '').toLowerCase() === 'cut') {
      writeWidgetClipboard(null);
    }
    return true;
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!editMode) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (isTextEditingTarget(e.target)) return;

      const key = String(e.key || '').toLowerCase();

      if (key === 'c') {
        if (!copySelectionToClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (key === 'x') {
        if (!cutSelectionToClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (key === 'v') {
        if (!pasteFromClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, selectedId, widgets, values, hosts, layoutWidgets, activeLayout?.isStart]);

  function handleLayoutMouseMove(e) {
    if (!dragState.active || !dragState.widgetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    setWidgets((prev) => {
      const { zoneDisplay: zdMap } = deriveLayoutGeometry(
        prev,
        layoutMinHeight,
        widgetSizes,
        zoneHeaderHeights
      );

      return prev.map((w) => {
        if (w.id !== dragState.widgetId) return w;

        const width = dragState.widgetWidth || w.w || 260;
        const height = dragState.widgetHeight || w.h || 160;

        let x = pointerX - dragState.offsetX;
        let y = pointerY - dragState.offsetY;

        const maxX = rect.width - width;
        const maxY = rect.height - height;

        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        // Drag d'une zone → coordonnées globales
        if (w.type === 'zone') {
          return {
            ...w,
            x: snap(x),
            y: snap(y)
          };
        }

        // Widget enfant d'une zone : coords RELATIVES
        if (w.zoneId && zdMap[w.zoneId]) {
          const zd = zdMap[w.zoneId];
          const headerHeight = zd.headerHeight ?? ZONE_HEADER_HEIGHT;
          const bodyTop = zd.y + headerHeight;

          const localX = snap(x - (zd.x + ZONE_PADDING));
          const localY = snap(y - (bodyTop + ZONE_PADDING));

          return {
            ...w,
            x: Math.max(0, localX),
            y: Math.max(0, localY)
          };
        }

        // Widget hors zone : coords globales
        return {
          ...w,
          zoneId: null,
          x: snap(x),
          y: snap(y)
        };
      });
    });
  }

  function handleLayoutDrop(e) {
    if (!editMode) return;

    const newType = e.dataTransfer.getData('text/uu-widget-type');
    if (!newType) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Création d'un widget du type demandé à la position du drop
    addWidget(newType, { x, y });
  }

  function finalizeDrag() {
    if (!dragState.active || !dragState.widgetId) return;

    setWidgets((prev) => {
      const { layoutWidgets: lw, zoneDisplay: zdMap } = deriveLayoutGeometry(
        prev,
        layoutMinHeight,
        widgetSizes,
        zoneHeaderHeights
      );



      const dragged = lw.find((w) => w.id === dragState.widgetId);
      if (!dragged) return prev;

      // On ne met pas une zone "dans" une autre zone
      if (dragged.type === 'zone') {
        return prev;
      }

      const width = Number(dragged.w || 260);
      const height = Number(dragged.h || 160);
      const centerX = dragged.x + width / 2;
      const centerY = dragged.y + height / 2;

      // Chercher si le centre tombe dans une zone
      let targetZoneId = null;
      for (const [zoneId, zd] of Object.entries(zdMap)) {
        const zx = zd.x;
        const zy = zd.y;
        const zw = zd.width;
        const zh = zd.height;
        if (
          centerX >= zx &&
          centerX <= zx + zw &&
          centerY >= zy &&
          centerY <= zy + zh
        ) {
          targetZoneId = zoneId;
          break;
        }
      }

      return prev.map((w) => {
        if (w.id !== dragState.widgetId) return w;

        if (!targetZoneId) {
          // En dehors de toute zone → coords globales, zoneId nul
          return {
            ...w,
            zoneId: null,
            x: snap(dragged.x),
            y: snap(dragged.y)
          };
        }

        const zd = zdMap[targetZoneId];
        if (!zd) {
          return {
            ...w,
            zoneId: null,
            x: snap(dragged.x),
            y: snap(dragged.y)
          };
        }

        const headerHeight = zd.headerHeight ?? ZONE_HEADER_HEIGHT;
        const bodyTop = zd.y + headerHeight;


        const localX = snap(dragged.x - (zd.x + ZONE_PADDING));
        const localY = snap(dragged.y - (bodyTop + ZONE_PADDING));

        return {
          ...w,
          zoneId: targetZoneId,
          x: Math.max(0, localX),
          y: Math.max(0, localY)
        };
      });
    });

    setDragState({
      active: false,
      widgetId: null,
      offsetX: 0,
      offsetY: 0,
      widgetWidth: 0,
      widgetHeight: 0
    });
  }

  const selected = useMemo(
    () => widgets.find((w) => w.id === selectedId) || null,
    [widgets, selectedId]
  );

  // Synchronisation légère des valeurs courantes depuis le layout serveur.
  // Objectif : refléter dans l'UI les changements déclenchés hors UI locale
  // (ex: Companion / StreamDeck), sans recharger toute la mise en page.
  useEffect(() => {
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey || !activeLayoutId || !layoutReady) return undefined;

    let cancelled = false;
    let timer = null;
    const pollMs = Math.max(1000, Number(common?.refreshSec || 3) * 1000);
    const isDocumentHidden = () =>
      typeof document !== 'undefined' && document.hidden;

    const pickActiveLayoutArray = (payload) => {
      const allLayouts = Array.isArray(payload?.layouts) ? payload.layouts : [];
      if (!allLayouts.length) {
        return Array.isArray(payload?.layout) ? payload.layout : [];
      }

      const desiredId = String(activeLayoutId || '').trim();
      const remoteActiveId = String(payload?.activeLayoutId || payload?.layoutId || '').trim();
      const byDesiredId = allLayouts.find(
        (l) => String(l?.id || '').trim() === desiredId
      );
      const byRemoteActiveId = allLayouts.find(
        (l) => String(l?.id || '').trim() === remoteActiveId
      );
      const selected = byDesiredId || byRemoteActiveId || allLayouts[0];
      return Array.isArray(selected?.layout) ? selected.layout : [];
    };

    const syncValues = async () => {
      if (cancelled || !aliveRef.current) return;
      if (isDocumentHidden()) return;
      try {
        const payload = await getLayout(projectKey);
        if (cancelled || !aliveRef.current) return;

        const remoteLayout = pickActiveLayoutArray(payload);
        const remoteValues = extractValuesFromLayout(remoteLayout);
        const currentWidgets = Array.isArray(widgetsRef.current)
          ? widgetsRef.current
          : [];
        const widgetById = new Map(
          currentWidgets
            .map((w) => [String(w?.id || '').trim(), w])
            .filter(([id]) => !!id)
        );
        const widgetIds = new Set(
          currentWidgets
            .map((w) => String(w?.id || '').trim())
            .filter(Boolean)
        );

        if (!widgetIds.size) return;

        setValues((prev) => {
          const base = prev && typeof prev === 'object' ? prev : {};
          let changed = false;
          const next = { ...base };

          widgetIds.forEach((id) => {
            if (!Object.prototype.hasOwnProperty.call(remoteValues, id)) return;
            const incoming = remoteValues[id];
            const widget = widgetById.get(id) || null;
            if (isEqualWidgetValue(widget, base[id], incoming)) return;
            next[id] = incoming;
            changed = true;
          });

          return changed ? next : base;
        });
      } catch {
        // On ignore les erreurs de polling de valeurs.
      }
    };

    const schedule = () => {
      if (cancelled || !aliveRef.current) return;
      timer = setTimeout(async () => {
        if (!isDocumentHidden()) {
          await syncValues();
        }
        schedule();
      }, pollMs);
    };

    const handleVisibilityChange = () => {
      if (cancelled || !aliveRef.current) return;
      if (!isDocumentHidden()) {
        syncValues();
      }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    syncValues();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined' && document.removeEventListener) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [
    activeId,
    activeName,
    activeLayoutId,
    layoutReady,
    common?.refreshSec
  ]);

  /* ----------- Auto-save layout ----------- */
  useEffect(() => {
    const projectKey = String(activeId || activeName || '').trim();
    if (!projectKey || !activeLayoutId || !layoutReady) return;

    const toSave = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(toSave || []);

    if (!lastSavedLayoutRef.current) lastSavedLayoutRef.current = {};
    const key = `${projectKey}::${activeLayoutId}`;

    if (lastSavedLayoutRef.current[key] === serialized) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          console.debug('[Production][layout] save (auto)', {
            projectKey,
            layoutId: activeLayoutId,
            timeoutMs: layoutSaveTimeoutMs
          });
          await saveLayout(projectKey, toSave, { layoutId: activeLayoutId }, layoutSaveTimeoutMs);
          if (!cancelled) {
            lastSavedLayoutRef.current[key] = serialized;
            updateLayoutInState(activeLayoutId, toSave);
          }
        } catch (e) {
          console.warn('Auto-save layout failed', e);
          reportLayoutError('auto-save', e);
        }
      })();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeName, activeId, activeLayoutId, widgets, values, layoutReady, t]);

  /* ----------- Rendu ----------- */
  return (
    <div className="uu-page uu-page-compact">
        <div className="uu-section uu-section-prod-header">
        <div className="uu-toolbar">
          <div className="uu-kv">
            {activeId ? (
              <button className="uu-btn" onClick={editActiveProject}>
                {t('projects.actions.edit')}
              </button>
            ) : null}
            <span className="uu-k">{t('production.active.label')}</span>
            <span className="uu-v">
              {loading
                ? t('production.active.loading')
                : (activeName || t('production.active.none'))}{' '}
              {activeId ? (
                <span className="uu-id-tag uu-muted">[{activeId}]</span>
              ) : null}
            </span>
          </div>

          <div className="uu-toolbar-actions prod-toolbar-actions">
            {editMode && (
              <button
                className={`uu-btn ${presetReloadNeeded ? 'uu-btn-danger' : ''}`}
                onClick={loadPreset}
                disabled={!target.ip || !target.port || !target.preset}
                title={
                  presetReloadNeeded
                    ? t('production.preset.reloadNeededTooltip')
                    : t('production.preset.loadTooltip')
                }
              >
                {t('production.preset.loadButton')}
              </button>
            )}

            <div
              className="uu-toggle-mode prod-toggle-mode"
              title={t('production.mode.tooltip')}
            >
                <button
                  className={`uu-btn ${editMode ? 'prod-toggle-active' : ''}`}
                  onClick={() => {
                    if (!editMode) {
                      setEditMode(true);
                      loadPreset();
                    }
                  }}
                >
                  {t('production.mode.edit')}
                </button>
                <button
                  className={`uu-btn ${!editMode ? 'prod-toggle-active' : ''}`}
                  onClick={() => {
                    if (editMode) setEditMode(false);
                  }}
                >
                  {t('production.mode.live')}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout pleine largeur (édition + production) */}
      <div className="mt-8">
        <Suspense fallback={lazyFallback}>
          <ProductionLayoutTabs
            layouts={layouts}
            activeLayoutId={activeLayoutId}
            editingLayoutId={editingLayoutId}
            layoutNameDraft={layoutNameDraft}
            editMode={editMode}
            maxLayoutNameLen={maxLayoutNameLen}
            layoutDragRef={layoutDragRef}
            layoutNameInputRef={layoutNameInputRef}
            onSelectLayout={handleSelectLayout}
            onBeginLayoutRename={beginLayoutRename}
            onCommitLayoutRename={commitLayoutRename}
            onCancelLayoutRename={cancelLayoutRename}
            onLayoutNameDraftChange={setLayoutNameDraft}
            onDuplicateLayout={handleDuplicateLayout}
            onDeleteLayout={handleDeleteLayout}
            onReorderLayouts={handleReorderLayouts}
            onAddLayout={handleAddLayout}
            t={t}
          />
        </Suspense>
        <Suspense fallback={lazyFallback}>
          <ProductionLayoutCanvas
            editMode={editMode}
            layoutHeight={layoutHeight}
            layoutWidgets={layoutWidgets}
            widgets={widgets}
            presetData={presetData}
            dragState={dragState}
            setDragState={setDragState}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            leftPanelMode={leftPanelMode}
            setLeftPanelMode={setLeftPanelMode}
            values={values}
            setValues={setValues}
            hosts={hosts}
            common={commonForProject}
            removeWidget={removeWidget}
            updateWidget={updateWidgetById}
            hasValidBinding={hasValidBinding}
            onDuplicateWidget={duplicateWidget}
            onDragStart={onDragStart}
            onDrop={onDrop}
            onSizeChange={handleWidgetSizeChange}
            onZoneHeaderHeightChange={handleZoneHeaderHeightChange}
            onLayoutMouseMove={handleLayoutMouseMove}
            onLayoutMouseUp={finalizeDrag}
            onLayoutMouseLeave={finalizeDrag}
            onLayoutDrop={handleLayoutDrop}
            t={t}
          />
        </Suspense>
        <Suspense fallback={lazyFallback}>
          <ProductionSidebar
            editMode={editMode}
            leftPanelMode={leftPanelMode}
            setLeftPanelMode={setLeftPanelMode}
            addWidget={addWidget}
            selected={selected}
            updateSelected={updateSelected}
            updateBinding={updateBinding}
            updateWidget={updateWidgetById}
            hosts={hosts}
            presetData={presetData}
            setValues={setValues}
            common={commonForProject}
            layoutMeta={activeLayout}
            onLayoutMetaChange={handleUpdateLayoutMeta}
            onExportLayout={handleExportLayout}
            onImportLayout={handleImportLayout}
            startLayoutToggleBusy={startLayoutToggleBusy}
            exportImportBusy={exportImportBusy}
            t={t}
          />
        </Suspense>
      </div>

      {confirmDialog.open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeConfirmDialog(false);
            }
          }}
        >
          <div
            className="uu-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('production.confirm.title')}
            style={{
              width: 'min(460px, calc(100vw - 32px))',
              padding: '16px'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: '10px' }}>
              {t('production.confirm.title')}
            </div>
            <div style={{ marginBottom: '14px', lineHeight: 1.35 }}>
              {confirmDialog.message}
            </div>
            <div className="uu-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="uu-btn"
                onClick={() => closeConfirmDialog(false)}
              >
                {t('production.confirm.cancel')}
              </button>
              <button
                ref={confirmOkBtnRef}
                type="button"
                className="uu-btn prod-toggle-active"
                onClick={() => closeConfirmDialog(true)}
              >
                {t('production.confirm.ok')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


