import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ConfirmDialog } from '../components/ConfirmDialog';
import ProductionHeaderBar from '../components/ProductionHeaderBar';
import ProductionWorkspace from '../components/ProductionWorkspace';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';
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
import { useProductionEditMode } from './hooks/useProductionEditMode';
import { useProductionProjectTarget } from './hooks/useProductionProjectTarget';
import { useProductionLayoutMetrics } from './hooks/useProductionLayoutMetrics';
import { useProductionNoticeSync } from './hooks/useProductionNoticeSync';
import { useProductionDragState } from './hooks/useProductionDragState';
import { useProductionHeaderActions } from './hooks/useProductionHeaderActions';
import { useProductionLayoutDerivatives } from './hooks/useProductionLayoutDerivatives';
import { buildProductionWorkspaceProps } from './productionWorkspaceProps';
import {
  PRODUCTION_LAYOUT_MIN_HEIGHT,
  PRODUCTION_LAYOUT_SAVE_TIMEOUT_MS,
  PRODUCTION_MAX_LAYOUT_NAME_LEN,
  PRODUCTION_MAX_LAYOUTS,
} from './productionConstants';
const loadTimelineUtils = () => import('../utils/timeline');
const LAZY_FALLBACK_STYLE = { padding: '12px' };

export default function ProductionScreen({ canManageLayouts = true }) {
  const id = useMemo(readIdentity, []);
  const lang = String(id.lang || 'fr').trim();
  const t = useMemo(() => createT(lang), [lang]);
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
  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
    confirmLabel: confirmOkLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  });
  const lazyFallback = <div className="uu-loading" style={LAZY_FALLBACK_STYLE}>…</div>;
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

  const { dragState, setDragState } = useProductionDragState();

  const {
    widgetSizes,
    zoneHeaderHeights,
    handleZoneHeaderHeightChange,
    handleWidgetSizeChange,
  } = useProductionLayoutMetrics();

  const { activeLayout, selected, normalizeLayoutColor } = useProductionLayoutDerivatives({
    layouts,
    activeLayoutId,
    widgets,
    selectedId,
  });

  useProductionNoticeSync({
    showNotice,
    err,
    infoMsg,
    infoMsgType,
    presetReloadNeeded,
    wrcStatusMsg,
    wrcStatusType,
    t,
  });

  const [values, setValues] = useState({});

  const { editMode, setEditMode } = useProductionEditMode({ canManageLayouts });
  const [layoutReady, setLayoutReady] = useState(false);
  const [wrcReady, setWrcReady] = useState(false);
  const [leftPanelMode, setLeftPanelMode] = useState('palette');

  const { effectivePresetName, commonForProject, target, isTargetUnrealRunning } =
    useProductionProjectTarget({
      projectsList,
      activeId,
      activeName,
      common,
      hosts,
      localIp: id?.localIp,
      getOnlineMap,
    });

  const { layoutWidgets, layoutHeight } = useMemo(
    () =>
      deriveLayoutGeometry(
        widgets,
        PRODUCTION_LAYOUT_MIN_HEIGHT,
        widgetSizes,
        zoneHeaderHeights
      ),
    [widgets, widgetSizes, zoneHeaderHeights]
  );

  const { applyLayout, layoutDefaultName, normalizeLayoutName } = useProductionLayoutNaming({
    setWidgets,
    setValues,
    setSelectedId,
    t,
    maxLayoutNameLen: PRODUCTION_MAX_LAYOUT_NAME_LEN,
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
    maxLayoutNameLen: PRODUCTION_MAX_LAYOUT_NAME_LEN,
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
    layoutSaveTimeoutMs: PRODUCTION_LAYOUT_SAVE_TIMEOUT_MS,
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
    layoutSaveTimeoutMs: PRODUCTION_LAYOUT_SAVE_TIMEOUT_MS,
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
    maxLayouts: PRODUCTION_MAX_LAYOUTS,
    activeId,
    activeName,
    activeLayoutId,
    layouts,
    layoutsRef,
    widgets,
    values,
    hosts,
    layoutSaveTimeoutMs: PRODUCTION_LAYOUT_SAVE_TIMEOUT_MS,
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
    layoutMinHeight: PRODUCTION_LAYOUT_MIN_HEIGHT,
    widgetSizes,
    zoneHeaderHeights,
    snap,
    zoneHeaderHeightDefault: ZONE_HEADER_HEIGHT,
    zonePadding: ZONE_PADDING,
  });

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
    layoutSaveTimeoutMs: PRODUCTION_LAYOUT_SAVE_TIMEOUT_MS,
    buildLayoutWithValues,
    saveLayout,
    lastSavedLayoutRef,
    updateLayoutInState,
    reportLayoutError,
  });

  const { editActiveProject, handleEnterEditMode, handleEnterLiveMode } =
    useProductionHeaderActions({
      activeId,
      canManageLayouts,
      editMode,
      setEditMode,
      loadPreset,
    });

  const { layoutTabsProps, layoutCanvasProps, sidebarProps } = buildProductionWorkspaceProps({
    layouts,
    activeLayoutId,
    editingLayoutId,
    layoutNameDraft,
    editMode,
    maxLayoutNameLen: PRODUCTION_MAX_LAYOUT_NAME_LEN,
    layoutDragRef,
    layoutNameInputRef,
    handleSelectLayout,
    beginLayoutRename,
    commitLayoutRename,
    cancelLayoutRename,
    setLayoutNameDraft,
    handleDuplicateLayout,
    handleDeleteLayout,
    handleReorderLayouts,
    handleAddLayout,
    t,
    layoutHeight,
    layoutWidgets,
    widgets,
    presetData,
    dragState,
    setDragState,
    selectedId,
    setSelectedId,
    leftPanelMode,
    setLeftPanelMode,
    values,
    setValues,
    hosts,
    commonForProject,
    removeWidget,
    updateWidgetById,
    hasValidBinding,
    duplicateWidget,
    onDragStart,
    onDrop,
    handleWidgetSizeChange,
    handleZoneHeaderHeightChange,
    handleLayoutMouseMove,
    finalizeDrag,
    handleLayoutDrop,
    addWidget,
    selected,
    updateSelected,
    updateBinding,
    activeLayout,
    handleUpdateLayoutMeta,
    handleExportLayout,
    handleImportLayout,
    startLayoutToggleBusy,
    exportImportBusy,
  });

  /* ----------- Rendu ----------- */
  return (
    <div className="uu-page uu-page-compact">
      <ProductionHeaderBar
        t={t}
        loading={loading}
        activeName={activeName}
        activeId={activeId}
        onEditActiveProject={editActiveProject}
        editMode={editMode}
        canManageLayouts={canManageLayouts}
        presetReloadNeeded={presetReloadNeeded}
        onLoadPreset={loadPreset}
        target={target}
        onEnterEditMode={handleEnterEditMode}
        onEnterLiveMode={handleEnterLiveMode}
      />

      {/* Layout pleine largeur (édition + production) */}
      <ProductionWorkspace
        lazyFallback={lazyFallback}
        layoutTabsProps={layoutTabsProps}
        layoutCanvasProps={layoutCanvasProps}
        sidebarProps={sidebarProps}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        busy={false}
        title={confirmTitle}
        message={confirmDialog.message}
        cancelLabel={confirmCancelLabel}
        confirmLabel={confirmOkLabel}
        onCancel={() => closeConfirmDialog(false)}
        onConfirm={() => closeConfirmDialog(true)}
        confirmRef={confirmOkBtnRef}
        overlayZIndex={2000}
      />
    </div>
  );
}
