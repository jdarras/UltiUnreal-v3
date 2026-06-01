import React from 'react';
import { readIdentity } from '../utils/identity';
import {
  getLibraryMeta,
  getProjects,
  postLaunch,
  postprodRegenerateAllProxies,
} from '../utils/agent';
import { createT } from '../i18n';
import { NoticeContext } from '../NoticeContext';
import {
  APP_MODE_POSTPROD,
  normalizeExportDestinations,
  normalizeProxyResolution,
  normalizeProxyCrf,
  normalizeInterfaceLanguage,
  formatLicenseDate,
  formatDateTime,
  getDaysLeft,
  normalizePathKey,
  normalizeProjectRoots,
} from './configurationHelpers';
import { useConfigFabLibrary } from './useConfigFabLibrary';
import { useConfigProjectScan } from './useConfigProjectScan';
import { useConfigCommonSettings } from './useConfigCommonSettings';
import { useConfigUserPreferences } from './useConfigUserPreferences';
import ConfigCommonSection from '../components/ConfigCommonSection';
import ConfigPostprodDestinationsSection from '../components/ConfigPostprodDestinationsSection';
import ConfigPostprodSection from '../components/ConfigPostprodSection';
import ConfigProjectRootsSection from '../components/ConfigProjectRootsSection';
import ConfigUnrealVersionsSection from '../components/ConfigUnrealVersionsSection';
import ConfigResourcesSection from '../components/ConfigResourcesSection';
import ConfigUserPreferencesSection from '../components/ConfigUserPreferencesSection';

const SECTION_HEADER_ROW_STYLE = { flexWrap: 'wrap' };
const TITLE_NO_MARGIN_STYLE = { margin: 0 };

function ConfigSectionTitle({ children, noMargin = false }) {
  return (
    <div className="uu-row uu-align-center uu-gap-8" style={SECTION_HEADER_ROW_STYLE}>
      <h3 className="uu-h3 uu-block-title" style={noMargin ? TITLE_NO_MARGIN_STYLE : undefined}>
        {children}
      </h3>
    </div>
  );
}

export default function ConfigurationScreen({
  licenseStatus,
  onCommonUpdated,
  onNavigate,
  onLibraryImported,
  onScanDetectedRenders = null,
  onUpdateMe = null,
  appMode = '',
  canViewResources = true,
  canManageProjects = true,
  canManageConfiguration = true,
  canLaunchUnrealEditor = true,
  notificationPrefs = null,
}) {
  const canUseEditorLaunch = canLaunchUnrealEditor === true;
  // identité + langue courante
  const identity = React.useMemo(readIdentity, []);
  const localIp = String(identity?.localIp || '').trim();
  const initialInterfaceLanguage = normalizeInterfaceLanguage(identity?.lang);
  const [lang, setLang] = React.useState(initialInterfaceLanguage);

  const t = React.useMemo(() => createT(lang), [lang]);
  const isPostprodMode = String(appMode || '').trim().toLowerCase() === APP_MODE_POSTPROD;
  const licenseInfo = licenseStatus && typeof licenseStatus === 'object' ? licenseStatus : {};
  const expDate = formatLicenseDate(licenseInfo.exp, lang);
  const daysLeft = getDaysLeft(licenseInfo.exp);
  const licenseLine = t('config.license.line', {
    date: expDate || '-',
    days: daysLeft ?? '-',
  });
  const licenseWarn = typeof daysLeft === 'number' && daysLeft < 30;

  const noticeApi = React.useContext(NoticeContext);

  const [proxyRegenBusy, setProxyRegenBusy] = React.useState(false);
  const [proxyRegenResult, setProxyRegenResult] = React.useState('');
  const [detectedScanBusy, setDetectedScanBusy] = React.useState(false);
  const [catalogStats, setCatalogStats] = React.useState({
    resourcesCount: 0,
    resourcesLastImport: '',
    projectsCount: 0,
    projectsLastImport: '',
  });

  const refreshCatalogStats = React.useCallback(async () => {
    const [libraryMetaRes, projectsRes] = await Promise.all([
      getLibraryMeta().catch(() => ({})),
      getProjects({ light: 1 }).catch(() => ({})),
    ]);

    const libraryMeta = libraryMetaRes?.meta && typeof libraryMetaRes.meta === 'object'
      ? libraryMetaRes.meta
      : {};
    const resourcesCountRaw = Number(libraryMetaRes?.count);
    const resourcesCount = Number.isFinite(resourcesCountRaw)
      ? Math.max(0, Math.trunc(resourcesCountRaw))
      : 0;
    const resourcesLastImportRaw = String(
      libraryMeta?.lastImportAt ||
      libraryMeta?.lastImportDate ||
      ''
    ).trim();

    const projectsList = Array.isArray(projectsRes?.projects) ? projectsRes.projects : [];
    const projectsCount = projectsList.length;
    let latestProjectImportRaw = '';
    let latestProjectImportMs = -1;
    for (const project of projectsList) {
      const raw = String(project?.createdAt || '').trim();
      if (!raw) continue;
      const ms = Date.parse(raw);
      if (!Number.isFinite(ms)) continue;
      if (ms > latestProjectImportMs) {
        latestProjectImportMs = ms;
        latestProjectImportRaw = raw;
      }
    }

    setCatalogStats({
      resourcesCount,
      resourcesLastImport: formatDateTime(resourcesLastImportRaw, lang),
      projectsCount,
      projectsLastImport: formatDateTime(latestProjectImportRaw, lang),
    });
  }, [lang]);

  const {
    cfg,
    cfgRef,
    versions,
    projectRoots,
    projectRootsRef,
    loaded,
    infoMsg,
    showInfoFeedback,
    updateField,
    updateExportDestination,
    addExportDestination,
    removeExportDestination,
    addVersionEntry,
    updateVersionEntry,
    removeVersionEntry,
    addProjectRootEntry,
    updateProjectRootEntry,
    removeProjectRootEntry,
  } = useConfigCommonSettings({
    localIp,
    t,
    onCommonUpdated,
  });

  const {
    fabAuthConnected, fabAuthBusy, fabAuthMsg, fabAuthMsgType,
    fabPreviewItems, fabSelection, setFabSelection,
    fabPreviewBusy, fabImporting,
    fabRemoteImportMsg, fabRemoteImportMsgType, fabRemoteImportBusy,
    handleFabLogin, handleFabLogout, handleFabPreview, handleFabRemoteImport,
    fabSelectedCount, fabSelectableCount, fabAllSelected,
    fabHasPreview, fabShowControls, fabShowImportProgress,
    fabRemainingCount, fabCountLabel, fabRemainingLabel,
    fabPreviewNewItems, fabPreviewUpdatedItems,
    normalizeUid,
  } = useConfigFabLibrary({ t, refreshCatalogStats, onLibraryImported, onNavigate });

  const {
    projectScanMsg, projectScanMsgType, projectScanBusy,
    projectScanRecursive, setProjectScanRecursive,
    projectScanResults, setProjectScanResults,
    projectImportBusy, hideImportedProjects, setHideImportedProjects,
    handleProjectScan, handleProjectImport,
    selectableScanCount, allSelectableSelected, visibleScanResults,
  } = useConfigProjectScan({ t, projectRootsRef, refreshCatalogStats, onNavigate });

  const {
    showFabResourcesForUser,
    interfaceLanguageForUser,
    userPrefsSaving,
    userPrefsMsg,
    handleToggleFabResourcesForUser,
    handleChangeInterfaceLanguageForUser,
  } = useConfigUserPreferences({
    initialInterfaceLanguage,
    notificationPrefs,
    onUpdateMe,
    t,
    onLanguageChanged: setLang,
  });

  React.useEffect(() => {
    if (!noticeApi) return;
    if (projectScanMsg) {
      noticeApi.showNotice?.(projectScanMsg, projectScanMsgType || '');
      return;
    }
    if (infoMsg?.text) {
      noticeApi.showNotice?.(infoMsg.text, infoMsg.type || '');
      return;
    }
    if (userPrefsMsg?.text) {
      noticeApi.showNotice?.(userPrefsMsg.text, userPrefsMsg.type || '');
      return;
    }
    if (fabAuthMsg) {
      noticeApi.showNotice?.(fabAuthMsg, fabAuthMsgType || '');
      return;
    }
    if (fabRemoteImportMsg) {
      noticeApi.showNotice?.(fabRemoteImportMsg, fabRemoteImportMsgType || '');
    }
  }, [
    projectScanMsg,
    projectScanMsgType,
    infoMsg,
    userPrefsMsg,
    fabAuthMsg,
    fabAuthMsgType,
    fabRemoteImportMsg,
    fabRemoteImportMsgType,
    noticeApi,
  ]);

  React.useEffect(() => {
    if (!loaded) return;
    refreshCatalogStats();
  }, [loaded, refreshCatalogStats]);

  React.useEffect(() => {
    if (!noticeApi || !licenseWarn) return;
    if (!licenseLine) return;
    noticeApi.showNotice?.(licenseLine, 'error');
  }, [noticeApi, licenseWarn, licenseLine]);

  async function pickFolderPath() {
    if (!window.electron?.chooseFolder) return '';
    let folder = '';
    try {
      folder = await window.electron.chooseFolder();
    } catch {}
    return String(folder || '').trim();
  }

  async function handleBrowseExportDestinationPath(index) {
    const picked = await pickFolderPath();
    if (!picked) return;
    updateExportDestination(index, { path: picked });
  }

  async function handleBrowseRenderOutputDir() {
    const picked = await pickFolderPath();
    if (!picked) return;
    updateField('renderOutputDir', picked);
  }

  async function pickExecutablePath(defaultPath = '') {
    if (!window.electron?.openExecutable) return '';
    let path = '';
    try {
      path = await window.electron.openExecutable({
        defaultPath: String(defaultPath || '').trim(),
      });
    } catch {}
    return String(path || '').trim();
  }

  async function handleBrowseUnrealVersionPath(index, defaultPath = '') {
    const picked = await pickExecutablePath(defaultPath);
    if (!picked) return;
    updateVersionEntry(index, { path: picked });
  }

  async function handleBrowseProjectRootPath(index) {
    const picked = await pickFolderPath();
    if (!picked) return;
    updateProjectRootEntry(index, picked);
  }

  const handleLaunchUnrealVersion = React.useCallback(async (versionName = '') => {
    if (!canUseEditorLaunch) return;
    const version = String(versionName || '').trim();
    if (!version) {
      showInfoFeedback(
        t('launch.status.missingExeVersion', { version: '—' }),
        'error',
        'versions',
        2500
      );
      return;
    }

    const targetIp = String(localIp || '').trim();
    if (!targetIp) {
      showInfoFeedback(
        t('config.unreal.launchError', { version }),
        'error',
        'versions',
        2500
      );
      return;
    }

    try {
      const res = await postLaunch(targetIp, {
        editorOnly: true,
        requiredVersion: version,
        uproject: '',
      });
      if (res && res.ok === false) {
        throw new Error(String(res?.message || res?.error || 'launch_failed'));
      }
      showInfoFeedback(
        t('config.unreal.launchSuccess', { version }),
        'ok',
        'versions',
        3000
      );
    } catch (e) {
      const details = String(e?.message || '').trim();
      showInfoFeedback(
        details
          ? `${t('config.unreal.launchError', { version })} (${details})`
          : t('config.unreal.launchError', { version }),
        'error',
        'versions',
        3000
      );
    }
  }, [localIp, t, canUseEditorLaunch, showInfoFeedback]);

  const handleRegenerateAllProxies = React.useCallback(async () => {
    if (proxyRegenBusy) return;
    setProxyRegenBusy(true);
    setProxyRegenResult('');
    try {
      const currentCfg = cfgRef.current || {};
      const res = await postprodRegenerateAllProxies({
        proxyResolution: normalizeProxyResolution(currentCfg.proxyResolution, 50),
        proxyCrf: normalizeProxyCrf(currentCfg.proxyCrf, 23),
      });
      if (!res || res.ok === false) {
        throw new Error(String(res?.error || 'proxy_regenerate_failed'));
      }
      const countRaw = Number(res?.count ?? res?.regenerated ?? 0);
      const count = Number.isFinite(countRaw) ? Math.max(0, Math.trunc(countRaw)) : 0;
      setProxyRegenResult(t('config.postprod.proxy.regenerateDone', { count }));
    } catch (e) {
      showInfoFeedback(
        String(e?.message || 'proxy_regenerate_failed'),
        'error',
        'common',
        3500
      );
    } finally {
      setProxyRegenBusy(false);
    }
  }, [proxyRegenBusy, t, showInfoFeedback]);

  const handleScanDetectedRenders = React.useCallback(async () => {
    if (detectedScanBusy) return;
    if (typeof onScanDetectedRenders !== 'function') return;
    setDetectedScanBusy(true);
    try {
      await onScanDetectedRenders();
    } finally {
      setDetectedScanBusy(false);
    }
  }, [detectedScanBusy, onScanDetectedRenders]);

  const cleanedProjectRoots = normalizeProjectRoots(projectRoots);
  const exportDestinations = React.useMemo(
    () => normalizeExportDestinations(cfg.renderExportDestinations, [], { keepEmpty: true }),
    [cfg.renderExportDestinations]
  );
  const hasProjectScanResults = projectScanResults.length > 0;
  const visibleProjectScanRows = React.useMemo(() => (
    visibleScanResults.map((item, index) => ({
      item: {
        ...item,
        __rowKey: `${normalizePathKey(item?.uprojectPath || item?.name || 'project')}-${index}`,
      },
      index: projectScanResults.indexOf(item),
    }))
  ), [visibleScanResults, projectScanResults]);
  const importableProjectScanCount = React.useMemo(
    () => projectScanResults.reduce(
      (count, item) => (item?.selected && !item?.exists ? count + 1 : count),
      0
    ),
    [projectScanResults]
  );
  const hasImportableProjectSelection = importableProjectScanCount > 0;
  const handleToggleAllProjectScanRows = React.useCallback(() => {
    setProjectScanResults((prev) =>
      prev.map((row) =>
        row.exists
          ? row
          : { ...row, selected: !allSelectableSelected }
      )
    );
  }, [allSelectableSelected, setProjectScanResults]);
  const handleToggleProjectScanRow = React.useCallback((rowIndex, checked) => {
    const safeIndex = Number(rowIndex);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setProjectScanResults((prev) =>
      prev.map((row, idx) => (idx === safeIndex ? { ...row, selected: !!checked } : row))
    );
  }, [setProjectScanResults]);
  const handleToggleAllFabPreviewSelection = React.useCallback(() => {
    const nextValue = !fabAllSelected;
    setFabSelection((prev) => {
      const next = { ...prev };
      for (const item of fabPreviewItems) {
        const key = normalizeUid(item?.uid);
        if (!key) continue;
        next[key] = nextValue;
      }
      return next;
    });
  }, [fabAllSelected, fabPreviewItems, normalizeUid, setFabSelection]);
  const handleToggleFabPreviewSelection = React.useCallback((uid, checked) => {
    const key = String(uid || '').trim();
    if (!key) return;
    setFabSelection((prev) => ({ ...prev, [key]: !!checked }));
  }, [setFabSelection]);
  const showAdminConfiguration = canManageConfiguration === true;

  return (
    <div className="uu-page">
      <ConfigUserPreferencesSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        interfaceLanguageForUser={interfaceLanguageForUser}
        userPrefsSaving={userPrefsSaving}
        onChangeInterfaceLanguage={handleChangeInterfaceLanguageForUser}
        showFabResourcesForUser={showFabResourcesForUser}
        onToggleFabResourcesForUser={handleToggleFabResourcesForUser}
      />
      {showAdminConfiguration ? (
      <>
      <ConfigCommonSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        cfg={cfg}
        onUpdateField={updateField}
      />
      <ConfigPostprodSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        renderOutputDir={cfg.renderOutputDir}
        onChangeRenderOutputDir={(value) => updateField('renderOutputDir', value)}
        onBrowseRenderOutputDir={handleBrowseRenderOutputDir}
        isPostprodMode={isPostprodMode}
        detectedScanBusy={detectedScanBusy}
        canScanDetectedRenders={typeof onScanDetectedRenders === 'function'}
        onScanDetectedRenders={handleScanDetectedRenders}
        proxyEnabled={!!cfg.proxyEnabled}
        onToggleProxyEnabled={(checked) => updateField('proxyEnabled', !!checked)}
        proxyResolution={String(normalizeProxyResolution(cfg.proxyResolution, 50))}
        onChangeProxyResolution={(value) => updateField('proxyResolution', normalizeProxyResolution(value, 50))}
        proxyCrf={String(normalizeProxyCrf(cfg.proxyCrf, 23))}
        onChangeProxyCrf={(value) => updateField('proxyCrf', normalizeProxyCrf(value, 23))}
        proxyRegenBusy={proxyRegenBusy}
        onRegenerateAllProxies={handleRegenerateAllProxies}
        proxyRegenResult={proxyRegenResult}
      />

      <ConfigPostprodDestinationsSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        exportDestinations={exportDestinations}
        onAddDestination={addExportDestination}
        onUpdateDestination={updateExportDestination}
        onRemoveDestination={removeExportDestination}
        onBrowseDestinationPath={handleBrowseExportDestinationPath}
      />

      <ConfigUnrealVersionsSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        canUseEditorLaunch={canUseEditorLaunch}
        showUnrealLaunchButtons={!!cfg.showUnrealLaunchButtons}
        onToggleShowUnrealLaunchButtons={(checked) => updateField('showUnrealLaunchButtons', !!checked)}
        onAddVersionEntry={addVersionEntry}
        versions={versions}
        onUpdateVersionEntry={updateVersionEntry}
        onBrowseVersionPath={handleBrowseUnrealVersionPath}
        onLaunchVersion={handleLaunchUnrealVersion}
        onRemoveVersionEntry={removeVersionEntry}
      />

      {canManageProjects ? (
      <ConfigProjectRootsSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        catalogStats={catalogStats}
        projectRoots={projectRoots}
        projectScanRecursive={projectScanRecursive}
        onSetProjectScanRecursive={setProjectScanRecursive}
        projectScanBusy={projectScanBusy}
        projectImportBusy={projectImportBusy}
        cleanedProjectRootsCount={cleanedProjectRoots.length}
        hasImportableProjectSelection={hasImportableProjectSelection}
        hasProjectScanResults={hasProjectScanResults}
        onAddProjectRootEntry={addProjectRootEntry}
        onProjectScan={handleProjectScan}
        onProjectImport={handleProjectImport}
        onHideScanResults={() => {
          setProjectScanResults([]);
        }}
        onUpdateProjectRootEntry={updateProjectRootEntry}
        onBrowseProjectRootPath={handleBrowseProjectRootPath}
        onRemoveProjectRootEntry={removeProjectRootEntry}
        selectableScanCount={selectableScanCount}
        allSelectableSelected={allSelectableSelected}
        onToggleAllScanRows={handleToggleAllProjectScanRows}
        hideImportedProjects={hideImportedProjects}
        onSetHideImportedProjects={setHideImportedProjects}
        visibleScanRows={visibleProjectScanRows}
        onToggleScanRowSelection={handleToggleProjectScanRow}
      />
      ) : null}

      {canViewResources ? (
      <ConfigResourcesSection
        t={t}
        SectionTitleComponent={ConfigSectionTitle}
        catalogStats={catalogStats}
        fabResourcesEnabled={!!cfg.fabResourcesEnabled}
        onToggleFabResourcesEnabled={(checked) => updateField('fabResourcesEnabled', !!checked)}
        fabAuthConnected={fabAuthConnected}
        fabAuthBusy={fabAuthBusy}
        onFabLogin={handleFabLogin}
        onFabLogout={handleFabLogout}
        fabShowControls={fabShowControls}
        fabRemoteImportBusy={fabRemoteImportBusy}
        fabImporting={fabImporting}
        fabSelectableCount={fabSelectableCount}
        fabAllSelected={fabAllSelected}
        onToggleAllPreviewSelection={handleToggleAllFabPreviewSelection}
        onFabRemoteImport={handleFabRemoteImport}
        fabSelectedCount={fabSelectedCount}
        fabCountLabel={fabCountLabel}
        fabShowImportProgress={fabShowImportProgress}
        fabRemainingCount={fabRemainingCount}
        fabRemainingLabel={fabRemainingLabel}
        onFabPreview={handleFabPreview}
        fabPreviewBusy={fabPreviewBusy}
        fabHasPreview={fabHasPreview}
        fabPreviewNewItems={fabPreviewNewItems}
        fabPreviewUpdatedItems={fabPreviewUpdatedItems}
        fabSelection={fabSelection}
        onTogglePreviewSelection={handleToggleFabPreviewSelection}
        normalizePreviewUid={normalizeUid}
        fabRemoteImportMsg={fabRemoteImportMsg}
        fabRemoteImportMsgType={fabRemoteImportMsgType}
      />
      ) : null}
      </>
      ) : null}
    </div>
  );
}
