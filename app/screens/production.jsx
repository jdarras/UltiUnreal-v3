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
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';
import { useProductionWidgetClipboard } from './hooks/useProductionWidgetClipboard';
import { useProductionLayoutTransfer } from './hooks/useProductionLayoutTransfer';
import { useProductionLayoutsManager } from './hooks/useProductionLayoutsManager';
import { useProductionLayoutMeta } from './hooks/useProductionLayoutMeta';
import { useProductionLayoutRename } from './hooks/useProductionLayoutRename';
import { useProductionLayoutRenameFlow } from './hooks/useProductionLayoutRenameFlow';
import { useTransientInfo } from './hooks/useTransientInfo';
import { useLayoutErrorReporter } from './hooks/useLayoutErrorReporter';
import { useProductionLayoutStateUpdater } from './hooks/useProductionLayoutStateUpdater';
import { useProductionLayoutNormalization } from './hooks/useProductionLayoutNormalization';
import { useProductionBootstrap } from './hooks/useProductionBootstrap';
import { useProductionPresetSync } from './hooks/useProductionPresetSync';
import { useProductionStartLayoutCue } from './hooks/useProductionStartLayoutCue';
import { useProductionLayoutValueSync } from './hooks/useProductionLayoutValueSync';
import { useProductionLayoutAutoSave } from './hooks/useProductionLayoutAutoSave';
import { useProductionLayoutDrag } from './hooks/useProductionLayoutDrag';
import { useProductionWidgetActions } from './hooks/useProductionWidgetActions';
import { useProductionWidgetListOps } from './hooks/useProductionWidgetListOps';
import { useProductionLayoutNaming } from './hooks/useProductionLayoutNaming';
import { useProductionLayoutNameUniqueness } from './hooks/useProductionLayoutNameUniqueness';
import { useProductionWidgetUpdate } from './hooks/useProductionWidgetUpdate';
import { useProductionLayoutUi } from './hooks/useProductionLayoutUi';
import { useProductionWrcStatus } from './hooks/useProductionWrcStatus';
const loadTimelineUtils = () => import('../utils/timeline');

export default function ProductionScreen({ canManageLayouts = true }) {
  const [common, setCommon] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [activeName, setActiveName] = useState('');
  const [activeId, setActiveId] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const { infoMsg, infoMsgType, showInfo } = useTransientInfo({
    defaultType: 'error',
    clearAfterMs: 2500,
  });
  const { wrcStatusMsg, wrcStatusType, setWrcStatus } = useProductionWrcStatus({
    defaultType: 'error',
  });

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
  const {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  } = usePromiseConfirmDialog();
  const lazyFallback = <div className="uu-loading" style={{ padding: '12px' }}>…</div>;
  // Ref pour mémoire de la dernière sauvegarde (sérialisée) par projet
  const lastSavedLayoutRef = useRef({});
  const layoutsRef = useRef([]);
  const widgetsRef = useRef([]);
  const layoutDragRef = useRef(null);
  const layoutNameInputRef = useRef(null);
  const lastStartCueRef = useRef({ layoutId: '', sig: '' });
  const aliveRef = useRef(true);
  const presetSnapshotRef = useRef({ exists: false, hash: '' });

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const id = useMemo(readIdentity, []);
  const lang = String(id.lang || 'fr').trim();
  const t = useMemo(() => createT(lang), [lang]);
  const noticeApi = React.useContext(NoticeContext);
  const showNotice = noticeApi?.showNotice;
  const { reportLayoutError } = useLayoutErrorReporter({
    t,
    showInfo,
    messageKey: 'production.msg.layoutSaveFailed',
    logPrefix: '[Production][layout] save failed',
  });
  const { updateLayoutInState } = useProductionLayoutStateUpdater({
    setLayouts,
    layoutsRef,
  });

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
    if (canManageLayouts !== true) return false;
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

  useEffect(() => {
    if (canManageLayouts !== true && editMode) {
      setEditMode(false);
    }
  }, [canManageLayouts, editMode]);

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
    const proj = byId || byName;
    const wrcNames = Array.isArray(proj?.wrcNames) ? proj.wrcNames : (proj?.wrcName ? [proj.wrcName] : []);
    return String(wrcNames[0] || '').trim();
  }, [projectsList, activeId, activeName]);

  const effectivePresetName = useMemo(() => {
    return String(activeProjectWrcName || '').trim() || 'RemoteControlPreset';
  }, [activeProjectWrcName]);

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

  const { applyLayout, layoutDefaultName, normalizeLayoutName } = useProductionLayoutNaming({
    setWidgets,
    setValues,
    setSelectedId,
    t,
    maxLayoutNameLen,
    normalizeBrowseWidget,
    extractValuesFromLayout,
  });
  const { isDuplicateLayoutName, makeUniqueName } = useProductionLayoutNameUniqueness({
    layouts,
    layoutDefaultName,
  });

  /* ----------- Init + layout ----------- */
  useProductionBootstrap({
    getCommon,
    getHosts,
    getProjects,
    getLayout,
    sortHosts,
    lang,
    maxLayoutNameLen,
    applyLayout,
    buildLayoutWithValues,
    hosts,
    effectivePresetName,
    normalizePreset,
    presetSnapshotRef,
    lastSavedLayoutRef,
    setCommon,
    setHosts,
    setActiveName,
    setActiveId,
    setProjectsList,
    setLayouts,
    setActiveLayoutId,
    setPresetData,
    setErr,
    setLayoutReady,
    setLoading,
  });

  /* ----------- Preset UE ----------- */
  const { loadPreset } = useProductionPresetSync({
    loading,
    layoutReady,
    editMode,
    wrcReady,
    presetData,
    presetReloadNeeded,
    commonRefreshSec: common?.refreshSec,
    target,
    activeId,
    activeName,
    t,
    showInfo,
    normalizePreset,
    reconcileWidgetsWithPreset,
    isTargetUnrealRunning,
    wrcGetPreset,
    savePresetSnapshot,
    presetSnapshotRef,
    widgetsRef,
    aliveRef,
    setPresetData,
    setPresetReloadNeeded,
    setWrcReady,
    setWrcStatus,
    setErr,
    setWidgets,
  });

  /* ----------- Palette / Layout ----------- */
  const { createWidgetId, addWidget, duplicateWidget } = useProductionWidgetActions({
    hosts,
    widgets,
    values,
    t,
    editMode,
    snap,
    setWidgets,
    setValues,
    setSelectedId,
    setLeftPanelMode,
  });

  const { onDragStart, onDrop } = useProductionWidgetListOps({
    widgets,
    hosts,
    setWidgets,
  });

  const { normalizeLayoutList, resolveActiveLayoutId } = useProductionLayoutNormalization({
    normalizeLayoutName,
    layoutDefaultName,
  });

  const { handleUpdateLayoutMeta } = useProductionLayoutMeta({
    activeLayoutId,
    activeId,
    activeName,
    activeLayout,
    widgets,
    values,
    hosts,
    layouts,
    layoutSaveTimeoutMs,
    t,
    requestConfirm,
    showInfo,
    setWidgets,
    setLayouts,
    setStartLayoutToggleBusy,
    saveLayout,
    lastSavedLayoutRef,
    reportLayoutError,
    buildLayoutWithValues,
    normalizeLayoutName,
    layoutDefaultName,
    normalizeLayoutColor,
    isDuplicateLayoutName,
  });

  const { handleExportLayout, handleImportLayout } = useProductionLayoutTransfer({
    activeLayoutId,
    activeId,
    activeName,
    activeLayout,
    widgets,
    values,
    hosts,
    normalizeLayoutColor,
    normalizeLayoutName,
    layoutDefaultName,
    makeUniqueName,
    requestConfirm,
    showInfo,
    t,
    setWidgets,
    setValues,
    setSelectedId,
    setLayouts,
    setExportImportBusy,
    normalizeBrowseWidget,
    extractValuesFromLayout,
    buildLayoutWithValues,
    layoutSaveTimeoutMs,
    saveLayout,
    lastSavedLayoutRef,
    updateLayoutInState,
    reportLayoutError,
  });

  const {
    handleSelectLayout,
    handleAddLayout,
    handleDuplicateLayout,
    handleDeleteLayout,
    handleReorderLayouts,
  } = useProductionLayoutsManager({
    editMode,
    maxLayouts,
    activeId,
    activeName,
    activeLayoutId,
    layouts,
    layoutsRef,
    widgets,
    values,
    hosts,
    layoutSaveTimeoutMs,
    t,
    showInfo,
    saveLayout,
    lastSavedLayoutRef,
    setLayouts,
    setActiveLayoutId,
    buildLayoutWithValues,
    updateLayoutInState,
    reportLayoutError,
    applyLayout,
    normalizeLayoutList,
    resolveActiveLayoutId,
    layoutDefaultName,
    makeUniqueName,
  });

  const { handleRenameLayout } = useProductionLayoutRename({
    activeId,
    activeName,
    t,
    showInfo,
    saveLayout,
    reportLayoutError,
    normalizeLayoutName,
    isDuplicateLayoutName,
    setLayouts,
    setEditingLayoutId,
    setLayoutNameDraft,
  });
  const { beginLayoutRename, cancelLayoutRename, commitLayoutRename } = useProductionLayoutRenameFlow({
    editMode,
    handleRenameLayout,
    setEditingLayoutId,
    setLayoutNameDraft,
  });

  const { updateSelected, updateBinding, updateWidgetById } = useProductionWidgetUpdate({
    selectedId,
    setWidgets,
  });
  const { removeWidget } = useProductionLayoutUi({
    editingLayoutId,
    layoutNameInputRef,
    setWidgets,
    setSelectedId,
  });

  useProductionStartLayoutCue({
    activeLayout,
    editMode,
    layoutReady,
    widgets,
    hosts,
    commonForProject,
    wrcReady,
    target,
    aliveRef,
    lastStartCueRef,
    wrcGetPreset,
    setWrcReady,
    loadTimelineUtils,
  });

  useProductionWidgetClipboard({
    editMode,
    selectedId,
    widgets,
    values,
    hosts,
    layoutWidgets,
    activeLayoutIsStart: !!activeLayout?.isStart,
    createWidgetId,
    normalizeBrowseWidget,
    setWidgets,
    setValues,
    setSelectedId,
    setLeftPanelMode,
    showInfo,
    t,
  });

  const { handleLayoutMouseMove, handleLayoutDrop, finalizeDrag } = useProductionLayoutDrag({
    editMode,
    dragState,
    setDragState,
    setWidgets,
    addWidget,
    deriveLayoutGeometry,
    layoutMinHeight,
    widgetSizes,
    zoneHeaderHeights,
    snap,
    zoneHeaderHeightDefault: ZONE_HEADER_HEIGHT,
    zonePadding: ZONE_PADDING,
  });

  const selected = useMemo(
    () => widgets.find((w) => w.id === selectedId) || null,
    [widgets, selectedId]
  );

  useProductionLayoutValueSync({
    activeId,
    activeName,
    activeLayoutId,
    layoutReady,
    commonRefreshSec: common?.refreshSec,
    aliveRef,
    widgetsRef,
    getLayout,
    extractValuesFromLayout,
    isEqualWidgetValue,
    setValues,
  });

  useProductionLayoutAutoSave({
    activeId,
    activeName,
    activeLayoutId,
    widgets,
    values,
    hosts,
    layoutReady,
    layoutSaveTimeoutMs,
    buildLayoutWithValues,
    saveLayout,
    lastSavedLayoutRef,
    updateLayoutInState,
    reportLayoutError,
  });

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
                  disabled={canManageLayouts !== true}
                  onClick={() => {
                    if (canManageLayouts !== true) return;
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
