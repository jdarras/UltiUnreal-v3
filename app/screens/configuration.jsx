import React from 'react';
import { readIdentity } from '../utils/identity';
import {
  getCommon,
  getLibraryMeta,
  getProjects,
  postCommon,
  getHosts,
  postHost,
  postLaunch,
  postprodRegenerateAllProxies,
} from '../utils/agent';
import { createT, preloadI18n } from '../i18n';
import { NoticeContext } from '../NoticeContext';
import {
  EMPTY_COMMON,
  APP_MODE_POSTPROD,
  sanitizeExportDestinationId,
  buildExportDestinationId,
  normalizeExportDestinations,
  normalizeProxyResolution,
  normalizeProxyCrf,
  normalizeInterfaceLanguage,
  formatLicenseDate,
  formatDateTime,
  getDaysLeft,
  normalizePathKey,
  normalizeProjectRoots,
  parseNotificationPrefsObject,
  resolveShowFabResourcesPreference,
} from './configurationHelpers';
import { useConfigFabLibrary } from './useConfigFabLibrary';
import { useConfigProjectScan } from './useConfigProjectScan';

const SECTION_HEADER_ROW_STYLE = { flexWrap: 'wrap' };
const TITLE_NO_MARGIN_STYLE = { margin: 0 };
const CARD_ROW_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const BASELINE_WRAP_ROW_STYLE = { alignItems: 'baseline', flexWrap: 'wrap' };
const INLINE_FIELD_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: '10px' };
const INLINE_FIELD_LABEL_STYLE = { width: '170px', minWidth: '170px', margin: 0 };
const FLEX_ONE_STYLE = { flex: 1 };
const COMMON_COLUMNS_STYLE = { alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' };
const COMMON_COLUMN_LEFT_STYLE = { flex: '1 1 340px', minWidth: '300px' };
const COMMON_COLUMN_RIGHT_STYLE = { flex: '1 1 320px', minWidth: '280px' };
const GRID_ONE_AUTO_STYLE = { gridTemplateColumns: '1fr auto' };
const PROXY_OPTIONS_ROW_STYLE = { alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' };
const PROXY_OPTION_FIELD_STYLE = { minWidth: '250px', maxWidth: '340px' };
const VERSION_ROW_GRID_STYLE = { gridTemplateColumns: '140px 1fr', gap: '8px' };
const VERSION_ACTIONS_ROW_STYLE = { gridColumn: '1 / -1', flexWrap: 'nowrap' };
const GRID_ONE_AUTO_AUTO_STYLE = { gridTemplateColumns: '1fr auto auto' };
const CHECK_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const SCAN_ITEM_CONTENT_STYLE = { gap: '4px' };

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

  const [cfg, setCfg] = React.useState(EMPTY_COMMON);
  const [infoMsg, setInfoMsg] = React.useState({ text: '', type: '', section: '' });
  const [proxyRegenBusy, setProxyRegenBusy] = React.useState(false);
  const [proxyRegenResult, setProxyRegenResult] = React.useState('');
  const [detectedScanBusy, setDetectedScanBusy] = React.useState(false);
  const [versions, setVersions] = React.useState([]);
  const [projectRoots, setProjectRoots] = React.useState([]);
  const [catalogStats, setCatalogStats] = React.useState({
    resourcesCount: 0,
    resourcesLastImport: '',
    projectsCount: 0,
    projectsLastImport: '',
  });
  const [showFabResourcesForUser, setShowFabResourcesForUser] = React.useState(
    () => resolveShowFabResourcesPreference(notificationPrefs)
  );
  const [interfaceLanguageForUser, setInterfaceLanguageForUser] = React.useState(initialInterfaceLanguage);
  const [userPrefsSaving, setUserPrefsSaving] = React.useState(false);
  const [userPrefsMsg, setUserPrefsMsg] = React.useState({ text: '', type: '' });
  const [loaded, setLoaded] = React.useState(false);
  const saveTimer = React.useRef(null);
  const infoMsgTimer = React.useRef(null);
  const userPrefsMsgTimer = React.useRef(null);
  const cfgRef = React.useRef(EMPTY_COMMON);
  const versionsRef = React.useRef([]);
  const projectRootsRef = React.useRef([]);

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
  // chargement des options communes
  React.useEffect(() => {
    (async () => {
      let hostList = [];
      try {
        hostList = await getHosts();
      } catch {}

      try {
        const c = await getCommon();
        setCfg(prev => ({
          ...prev,
          rcHttpPort: c?.rcHttpPort ?? prev.rcHttpPort,
          rcWsPort: c?.rcWsPort ?? prev.rcWsPort,
          renderOutputDir: String(
            c?.render_output_dir ??
            c?.renderOutputDir ??
            (
              (Array.isArray(c?.render_output_dirs) ? c.render_output_dirs : (
                Array.isArray(c?.renderOutputDirs) ? c.renderOutputDirs : []
              ))
                .map((entry) => String(entry || '').trim())
                .find(Boolean)
            ) ??
            prev.renderOutputDir ??
            ''
          ).trim(),
          proxyEnabled: typeof c?.proxyEnabled === 'boolean'
            ? c.proxyEnabled
            : (
              typeof c?.proxy_enabled === 'boolean'
                ? c.proxy_enabled
                : !!prev.proxyEnabled
            ),
          proxyResolution: normalizeProxyResolution(
            c?.proxyResolution ?? c?.proxy_resolution,
            prev.proxyResolution
          ),
          proxyCrf: normalizeProxyCrf(
            c?.proxyCrf ?? c?.proxy_crf,
            prev.proxyCrf
          ),
          renderExportDestinations: normalizeExportDestinations(
            c?.renderExportDestinations ?? c?.render_export_destinations,
            prev.renderExportDestinations
          ),
          refreshSec: c?.refreshSec ?? prev.refreshSec,
          logWarnLines: c?.logWarnLines ?? prev.logWarnLines,
          logHardLimitLines: c?.logHardLimitLines ?? prev.logHardLimitLines,
          auditWarnLines: c?.auditWarnLines ?? prev.auditWarnLines,
          auditHardLimitLines: c?.auditHardLimitLines ?? prev.auditHardLimitLines,
          wrcMaxAttempts: c?.wrcMaxAttempts ?? prev.wrcMaxAttempts ?? 10,
          wrcRetryDelaySec: c?.wrcRetryDelaySec ?? prev.wrcRetryDelaySec ?? 3,
          startLayoutSendDelaySec: c?.startLayoutSendDelaySec ?? prev.startLayoutSendDelaySec ?? 3,
          fabResourcesEnabled: typeof c?.fab_resources_enabled === 'boolean'
            ? c.fab_resources_enabled
            : (typeof c?.fabResourcesEnabled === 'boolean'
              ? c.fabResourcesEnabled
              : prev.fabResourcesEnabled),
          showUnrealLaunchButtons:
            typeof c?.show_start_new_ue === 'boolean'
              ? c.show_start_new_ue
              : prev.showUnrealLaunchButtons,
          allowStartDesynced:
            typeof c?.allowStartDesynced === 'boolean'
              ? c.allowStartDesynced
              : prev.allowStartDesynced,
        }));

        const vers =
          Array.isArray(c?.unrealVersions) && c.unrealVersions.length
            ? c.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
            : [];

        const host =
          hostList.find(
            (h) =>
              h &&
              String(h.ip || '').trim().toLowerCase() ===
                String(localIp || '').trim().toLowerCase()
          ) || hostList[0];

        const editorMap =
          host && host.unrealEditors && typeof host.unrealEditors === 'object'
            ? host.unrealEditors
            : {};

        const roots = Array.isArray(c?.project_roots)
          ? c.project_roots.map((v) => String(v || '').trim()).filter(Boolean)
          : [];
        setProjectRoots(roots);

        setVersions(
          vers.map((name) => ({
            name,
            path: editorMap[name] || '',
          }))
        );
        setLoaded(true);
      } catch {
        // on garde les valeurs par défaut
        setLoaded(true);
      }
    })();
  }, [localIp]);

  const scheduleSave = React.useCallback((section = 'common') => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      handleSave(section);
    }, 700);
  }, [loaded]);

  const clearInfoFeedback = React.useCallback(() => {
    setInfoMsg({ text: '', type: '', section: '' });
  }, []);

  const scheduleInfoFeedbackClear = React.useCallback((delayMs = 2500) => {
    if (infoMsgTimer.current) {
      clearTimeout(infoMsgTimer.current);
      infoMsgTimer.current = null;
    }
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    infoMsgTimer.current = setTimeout(() => {
      infoMsgTimer.current = null;
      clearInfoFeedback();
    }, timeoutMs);
  }, [clearInfoFeedback]);

  const showInfoFeedback = React.useCallback((text = '', type = '', section = '', delayMs = 2500) => {
    const msg = String(text || '').trim();
    const msgType = String(type || '').trim();
    const msgSection = String(section || '').trim();
    if (!msg) {
      clearInfoFeedback();
      return;
    }
    setInfoMsg({
      text: msg,
      type: msgType,
      section: msgSection,
    });
    scheduleInfoFeedbackClear(delayMs);
  }, [clearInfoFeedback, scheduleInfoFeedbackClear]);

  React.useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (infoMsgTimer.current) clearTimeout(infoMsgTimer.current);
      if (userPrefsMsgTimer.current) clearTimeout(userPrefsMsgTimer.current);
    };
  }, []);

  React.useEffect(() => {
    setShowFabResourcesForUser(resolveShowFabResourcesPreference(notificationPrefs));
  }, [notificationPrefs]);

  React.useEffect(() => {
    if (!loaded) return;
    refreshCatalogStats();
  }, [loaded, refreshCatalogStats]);

  React.useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  React.useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  React.useEffect(() => {
    projectRootsRef.current = projectRoots;
  }, [projectRoots]);

  React.useEffect(() => {
    if (!noticeApi || !licenseWarn) return;
    if (!licenseLine) return;
    noticeApi.showNotice?.(licenseLine, 'error');
  }, [noticeApi, licenseWarn, licenseLine]);

  function updateField(field, value, sectionOverride = null) {
    const section =
      sectionOverride ||
      (field === 'showUnrealLaunchButtons' ? 'versions' :
        field.startsWith('wrc') ? 'common' :
        field === 'refreshSec' ||
        field === 'rcHttpPort' || field === 'rcWsPort' ||
        field === 'logWarnLines' || field === 'logHardLimitLines' ||
        field === 'auditWarnLines' || field === 'auditHardLimitLines'
          ? 'common'
          : 'common');
    setCfg(prev => {
      const next = { ...prev, [field]: value };
      cfgRef.current = next;
      return next;
    });
    if (field === 'showUnrealLaunchButtons') {
      handleSave(section, value); // sauvegarde immédiate en forçant la valeur
    } else if (field === 'allowStartDesynced') {
      handleSave(section); // sauvegarde immédiate du choix utilisateur
    } else {
      scheduleSave(section);
    }
  }

  function showUserPrefsFeedback(text = '', type = '') {
    setUserPrefsMsg({ text: String(text || ''), type: String(type || '') });
    if (userPrefsMsgTimer.current) clearTimeout(userPrefsMsgTimer.current);
    userPrefsMsgTimer.current = setTimeout(() => {
      setUserPrefsMsg({ text: '', type: '' });
    }, 2500);
  }

  async function handleToggleFabResourcesForUser(nextValue) {
    const checked = !!nextValue;
    setShowFabResourcesForUser(checked);
    if (typeof onUpdateMe !== 'function') {
      showUserPrefsFeedback(t('config.userPreferences.authRequired'), 'warn');
      return;
    }
    setUserPrefsSaving(true);
    const currentPrefs = parseNotificationPrefsObject(notificationPrefs);
    const nextPrefs = {
      ...currentPrefs,
      showFabResources: checked,
    };
    let ok = false;
    try {
      const result = await Promise.resolve(onUpdateMe({
        notificationPrefsJson: JSON.stringify(nextPrefs),
      }));
      ok = result !== false;
    } catch {
      ok = false;
    } finally {
      setUserPrefsSaving(false);
    }
    if (ok) {
      showUserPrefsFeedback(t('config.userPreferences.saved'), 'ok');
    } else {
      setShowFabResourcesForUser(resolveShowFabResourcesPreference(notificationPrefs));
      showUserPrefsFeedback(t('config.userPreferences.saveError'), 'error');
    }
  }

  async function handleChangeInterfaceLanguageForUser(nextValue) {
    const normalized = normalizeInterfaceLanguage(nextValue);
    const previous = normalizeInterfaceLanguage(interfaceLanguageForUser);
    if (normalized === previous) return;
    setInterfaceLanguageForUser(normalized);
    if (typeof onUpdateMe !== 'function') {
      showUserPrefsFeedback(t('config.userPreferences.authRequired'), 'warn');
      setInterfaceLanguageForUser(previous);
      return;
    }
    setUserPrefsSaving(true);
    let ok = false;
    try {
      const result = await Promise.resolve(onUpdateMe({
        language: normalized,
      }));
      ok = result !== false;
    } catch {
      ok = false;
    } finally {
      setUserPrefsSaving(false);
    }
    if (ok) {
      await preloadI18n(normalized);
      setLang(normalized);
      showUserPrefsFeedback(t('config.userPreferences.saved'), 'ok');
    } else {
      setInterfaceLanguageForUser(previous);
      showUserPrefsFeedback(t('config.userPreferences.saveError'), 'error');
    }
  }

  function updateExportDestination(index, patch = {}) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setCfg((prev) => {
      const current = normalizeExportDestinations(prev.renderExportDestinations, [], { keepEmpty: true });
      if (safeIndex >= current.length) return prev;
      const next = current.map((entry, entryIndex) => {
        if (entryIndex !== safeIndex) return entry;
        const merged = {
          ...entry,
          ...(patch && typeof patch === 'object' ? patch : {}),
        };
        const safePath = String(merged.path || '').trim();
        const safeName = String(merged.name || '').trim();
        const safeId = sanitizeExportDestinationId(
          merged.id || buildExportDestinationId(safeName, safePath, entryIndex)
        );
        return {
          id: safeId || buildExportDestinationId(safeName, safePath, entryIndex),
          name: safeName,
          path: safePath,
          isActive: merged.isActive !== false,
        };
      });
      const normalized = normalizeExportDestinations(next, [], { keepEmpty: true });
      const updated = { ...prev, renderExportDestinations: normalized };
      cfgRef.current = updated;
      return updated;
    });
    scheduleSave('common');
  }

  function addExportDestination() {
    setCfg((prev) => {
      const current = normalizeExportDestinations(prev.renderExportDestinations, [], { keepEmpty: true });
      const nextIndex = current.length;
      const nextEntry = {
        id: buildExportDestinationId('', '', nextIndex),
        name: '',
        path: '',
        isActive: true,
      };
      const updated = {
        ...prev,
        renderExportDestinations: [...current, nextEntry],
      };
      cfgRef.current = updated;
      return updated;
    });
    scheduleSave('common');
  }

  function removeExportDestination(index) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setCfg((prev) => {
      const current = normalizeExportDestinations(prev.renderExportDestinations, [], { keepEmpty: true });
      const next = current.filter((_, entryIndex) => entryIndex !== safeIndex);
      const updated = { ...prev, renderExportDestinations: next };
      cfgRef.current = updated;
      return updated;
    });
    scheduleSave('common');
  }

  async function pickFolderPath() {
    if (!window.electron?.chooseFolder) return '';
    let folder = '';
    try {
      folder = await window.electron.chooseFolder();
    } catch {}
    return String(folder || '').trim();
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

  function addVersionEntry() {
    setVersions((prev) => [...prev, { name: '', path: '' }]);
    scheduleSave('versions');
  }

  function updateVersionEntry(index, patch = {}) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setVersions((prev) => {
      if (safeIndex >= prev.length) return prev;
      const next = [...prev];
      next[safeIndex] = {
        ...next[safeIndex],
        ...(patch && typeof patch === 'object' ? patch : {}),
      };
      return next;
    });
    scheduleSave('versions');
  }

  function removeVersionEntry(index) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setVersions((prev) => prev.filter((_, i) => i !== safeIndex));
    scheduleSave('versions');
  }

  function addProjectRootEntry() {
    setProjectRoots((prev) => [...prev, '']);
    scheduleSave('projects');
  }

  function updateProjectRootEntry(index, value) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    const nextValue = String(value || '');
    setProjectRoots((prev) => {
      if (safeIndex >= prev.length) return prev;
      const next = [...prev];
      next[safeIndex] = nextValue;
      return next;
    });
    scheduleSave('projects');
  }

  function removeProjectRootEntry(index) {
    const safeIndex = Number(index);
    if (!Number.isFinite(safeIndex) || safeIndex < 0) return;
    setProjectRoots((prev) => prev.filter((_, i) => i !== safeIndex));
    scheduleSave('projects');
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

  async function handleSave(section = 'common', forceShowFlag = null) {
    if (!loaded) return;
    const currentCfg = cfgRef.current || {};
    const currentVersions = Array.isArray(versionsRef.current) ? versionsRef.current : [];
    const currentRoots = normalizeProjectRoots(projectRootsRef.current);

    const versionNames = currentVersions
      .map((v) => String(v.name || '').trim())
      .filter(Boolean);

    const body = {
      rcHttpPort: Number(currentCfg.rcHttpPort || 0),
      rcWsPort: Number(currentCfg.rcWsPort || 0),
      render_output_dir: String(currentCfg.renderOutputDir || '').trim(),
      render_output_dirs: String(currentCfg.renderOutputDir || '').trim()
        ? [String(currentCfg.renderOutputDir || '').trim()]
        : [],
      refreshSec: Number(currentCfg.refreshSec || 0),
      logWarnLines: Number(currentCfg.logWarnLines || 0),
      logHardLimitLines: Number(currentCfg.logHardLimitLines || 0),
      auditWarnLines: Number(currentCfg.auditWarnLines || 0),
      auditHardLimitLines: Number(currentCfg.auditHardLimitLines || 0),
      wrcMaxAttempts: Number(currentCfg.wrcMaxAttempts || 0),
      wrcRetryDelaySec: Number(currentCfg.wrcRetryDelaySec || 0),
      startLayoutSendDelaySec: Number(currentCfg.startLayoutSendDelaySec || 0),
      proxyEnabled: !!currentCfg.proxyEnabled,
      proxyResolution: normalizeProxyResolution(currentCfg.proxyResolution, 50),
      proxyCrf: normalizeProxyCrf(currentCfg.proxyCrf, 23),
      renderExportDestinations: normalizeExportDestinations(currentCfg.renderExportDestinations, []),
      render_export_destinations: normalizeExportDestinations(currentCfg.renderExportDestinations, []),
      unrealVersions: versionNames,
      project_roots: currentRoots,
      fab_resources_enabled: !!currentCfg.fabResourcesEnabled,
      // flag pour les boutons de lancement UE dans Launch Control
      show_start_new_ue: forceShowFlag !== null
        ? !!forceShowFlag
        : !!currentCfg.showUnrealLaunchButtons,
      // autorise le Start en cas de désynchronisation effective
      allowStartDesynced: !!currentCfg.allowStartDesynced,
    };

    try {
      const r = await postCommon(body);
      const ok = r && r.ok !== false;
      showInfoFeedback(
        ok
          ? (t('setup.server.msg.commonSaved') )
          : (t('setup.server.msg.commonError')),
        ok ? 'ok' : 'error',
        section,
        2500
      );

      if (ok && typeof onCommonUpdated === 'function') {
        onCommonUpdated(r?.common || body);
      }

      // Sauvegarde des chemins UE pour la machine locale
      if (localIp && versionNames.length > 0) {
        const payload = { unrealEditors: {} };
        currentVersions.forEach((v) => {
          const name = String(v.name || '').trim();
          const path = String(v.path || '').trim();
          if (name) {
            payload.unrealEditors[name] = path;
          }
        });
        try {
          await postHost(localIp, payload);
        } catch {
          // ignore error here; user feedback already given by msg
        }
      }
    } catch {
      showInfoFeedback(
        t('setup.server.msg.commonError'),
        'error',
        section,
        2500
      );
    }
  }

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
  const importableProjectScanCount = React.useMemo(
    () => projectScanResults.reduce(
      (count, item) => (item?.selected && !item?.exists ? count + 1 : count),
      0
    ),
    [projectScanResults]
  );
  const hasImportableProjectSelection = importableProjectScanCount > 0;
  const showAdminConfiguration = canManageConfiguration === true;

  const renderFabPreviewList = (list) => (
    <div className="uu-list mt-8">
      {list.map((item, idx) => {
        const key = normalizeUid(item?.uid);
        const title = String(item?.title || item?.uid || '').trim() || '—';
        const seller = String(item?.seller || '').trim();
        const listingType = String(item?.listingType || '').trim();
        const metaParts = [seller, listingType].filter(Boolean);
        const meta = metaParts.join(' · ');
        return (
          <div key={key || `fab-${idx}`} className="uu-card uu-row" style={CARD_ROW_ALIGN_CENTER_STYLE}>
            <input
              type="checkbox"
              checked={!!(key && fabSelection[key])}
              disabled={!key || fabRemoteImportBusy || fabImporting}
              onChange={(e) => {
                if (!key) return;
                const checked = !!e.target.checked;
                setFabSelection((prev) => ({ ...prev, [key]: checked }));
              }}
            />
            <div className="uu-row uu-row-gap4" style={BASELINE_WRAP_ROW_STYLE}>
              <div className="uu-item-title">{title}</div>
              {meta ? <div className="uu-muted">{meta}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="uu-page">
      <div className="uu-section">
        <div className="uu-config-stack">
          <ConfigSectionTitle noMargin>{t('config.userPreferences.title')}</ConfigSectionTitle>
          <div className="uu-grid-field uu-maxw-420 mt-12" style={INLINE_FIELD_ROW_STYLE}>
            <label className="uu-label" style={INLINE_FIELD_LABEL_STYLE}>
              {t('config.lang.label')}
            </label>
            <select
              className="uu-input"
              style={FLEX_ONE_STYLE}
              value={interfaceLanguageForUser}
              disabled={userPrefsSaving}
              onChange={(e) => {
                void handleChangeInterfaceLanguageForUser(e.target.value);
              }}
            >
              <option value="fr">{t('common.lang.fr')}</option>
              <option value="en">{t('common.lang.en')}</option>
            </select>
          </div>
          <label className="uu-check">
            <input
              type="checkbox"
              checked={!!showFabResourcesForUser}
              disabled={userPrefsSaving}
              onChange={(e) => {
                void handleToggleFabResourcesForUser(e.target.checked);
              }}
            />
            {t('config.userPreferences.showFabResources')}
          </label>
        </div>
      </div>
      {showAdminConfiguration ? (
      <>
      <div className="uu-section mt-16">
        <ConfigSectionTitle>{t('config.commonTitle')}</ConfigSectionTitle>

        <div className="uu-row" style={COMMON_COLUMNS_STYLE}>
          <div style={COMMON_COLUMN_LEFT_STYLE}>
            {/* Rafraîchissement */}
            <div className="uu-grid-field uu-maxw-420">
              <label className="uu-label">
                {t('setup.server.refreshSec')}
              </label>
              <input
                type="number"
                className="uu-input w-100"
                value={cfg.refreshSec}
                onChange={(e) => updateField('refreshSec', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.logs.warnLimit')}
              </label>
              <input
                type="number"
                min={100}
                className="uu-input w-160"
                value={cfg.logWarnLines}
                onChange={(e) => updateField('logWarnLines', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.logs.hardLimit')}
              </label>
              <input
                type="number"
                min={200}
                className="uu-input w-160"
                value={cfg.logHardLimitLines}
                onChange={(e) => updateField('logHardLimitLines', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.audit.warnLimit')}
              </label>
              <input
                type="number"
                min={100}
                className="uu-input w-160"
                value={cfg.auditWarnLines}
                onChange={(e) => updateField('auditWarnLines', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.audit.hardLimit')}
              </label>
              <input
                type="number"
                min={200}
                className="uu-input w-160"
                value={cfg.auditHardLimitLines}
                onChange={(e) => updateField('auditHardLimitLines', e.target.value)}
              />
            </div>

            {/* Port RC HTTP */}
            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.rcHttpPort')}
              </label>
              <input
                type="number"
                className="uu-input w-160"
                value={cfg.rcHttpPort}
                onChange={(e) => updateField('rcHttpPort', e.target.value)}
              />
            </div>


          </div>

          <div style={COMMON_COLUMN_RIGHT_STYLE}>
            {/* Start Layout / WRC retries */}
            <div className="uu-grid-field uu-maxw-420">
              <label className="uu-label">
                {t('config.wrc.attempts')}
              </label>
              <input
                type="number"
                className="uu-input w-100"
                value={cfg.wrcMaxAttempts}
                onChange={(e) => updateField('wrcMaxAttempts', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.wrc.retryDelay')}
              </label>
              <input
                type="number"
                className="uu-input w-100"
                value={cfg.wrcRetryDelaySec}
                onChange={(e) => updateField('wrcRetryDelaySec', e.target.value)}
              />
            </div>

            <div className="uu-grid-field uu-maxw-420 mt-12">
              <label className="uu-label">
                {t('config.wrc.startLayoutDelay')}
              </label>
              <input
                type="number"
                className="uu-input w-100"
                value={cfg.startLayoutSendDelaySec}
                onChange={(e) => updateField('startLayoutSendDelaySec', e.target.value)}
              />
            </div>

            <label className="uu-check mt-16">
              <input
                type="checkbox"
                checked={!!cfg.allowStartDesynced}
                onChange={(e) => updateField('allowStartDesynced', !!e.target.checked)}
              />
              {t('config.unreal.allowStartDesynced')}
            </label>
          </div>
        </div>

      </div>
      <div className="uu-section mt-16">
        <ConfigSectionTitle>{t('config.postprod.sectionTitle')}</ConfigSectionTitle>
        <div className="uu-grid-field uu-maxw-720 mt-12">
          <label className="uu-label">
            {t('config.renders.outputDir')}
          </label>
          <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
            <input
              className="uu-input"
              value={cfg.renderOutputDir}
              onChange={(e) => updateField('renderOutputDir', e.target.value)}
              placeholder={t('config.renders.outputDirPlaceholder')}
            />
            <button
              type="button"
              className="uu-btn"
              onClick={async () => {
                const picked = await pickFolderPath();
                if (!picked) return;
                updateField('renderOutputDir', picked);
              }}
            >
              {t('common.browse')}
            </button>
          </div>
        </div>
        {isPostprodMode ? (
          <div className="uu-row mt-12">
            <button
              type="button"
              className="uu-btn-ghost"
              disabled={detectedScanBusy || typeof onScanDetectedRenders !== 'function'}
              onClick={() => { void handleScanDetectedRenders(); }}
            >
              {detectedScanBusy
                ? t('common.loading')
                : t('postprod.renders.detectedScan.button')}
            </button>
          </div>
        ) : null}

        <div className="uu-grid-field uu-maxw-720 mt-16">
          <label className="uu-label">
            {t('config.postprod.proxy.title')}
          </label>

          <label className="uu-check mt-8">
            <input
              type="checkbox"
              checked={!!cfg.proxyEnabled}
              onChange={(e) => updateField('proxyEnabled', !!e.target.checked)}
            />
            {t('config.postprod.proxy.enabled')}
          </label>

          {cfg.proxyEnabled ? (
            <>
              <div className="uu-row mt-12" style={PROXY_OPTIONS_ROW_STYLE}>
                <div className="uu-grid-field" style={PROXY_OPTION_FIELD_STYLE}>
                  <label className="uu-label">{t('config.postprod.proxy.resolution')}</label>
                  <select
                    className="uu-select"
                    value={String(normalizeProxyResolution(cfg.proxyResolution, 50))}
                    onChange={(e) => updateField('proxyResolution', normalizeProxyResolution(e.target.value, 50))}
                  >
                    <option value="75">{t('config.postprod.proxy.resolutionHigh')}</option>
                    <option value="50">{t('config.postprod.proxy.resolutionMedium')}</option>
                    <option value="25">{t('config.postprod.proxy.resolutionLow')}</option>
                  </select>
                </div>

                <div className="uu-grid-field" style={PROXY_OPTION_FIELD_STYLE}>
                  <label className="uu-label">{t('config.postprod.proxy.quality')}</label>
                  <select
                    className="uu-select"
                    value={String(normalizeProxyCrf(cfg.proxyCrf, 23))}
                    onChange={(e) => updateField('proxyCrf', normalizeProxyCrf(e.target.value, 23))}
                  >
                    <option value="18">{t('config.postprod.proxy.qualityHigh')}</option>
                    <option value="23">{t('config.postprod.proxy.qualityMedium')}</option>
                    <option value="28">{t('config.postprod.proxy.qualityLow')}</option>
                  </select>
                </div>

                <div className="uu-grid-field">
                  <button
                    type="button"
                    className="uu-btn"
                    disabled={proxyRegenBusy}
                    onClick={() => { void handleRegenerateAllProxies(); }}
                  >
                    {proxyRegenBusy
                      ? t('config.postprod.proxy.regenerating')
                      : t('config.postprod.proxy.regenerateAll')}
                  </button>
                </div>
              </div>

              {proxyRegenResult ? <div className="uu-msg ok mt-8">{proxyRegenResult}</div> : null}
            </>
          ) : null}
        </div>

      </div>

      <div className="uu-section mt-16">
        <ConfigSectionTitle>{t('config.postprod.destinations.sectionTitle')}</ConfigSectionTitle>

        <div className="uu-grid-field uu-maxw-720 mt-12">
          <label className="uu-label">
            {t('config.postprod.exports.title')}
          </label>

          <div className="uu-row mt-12">
            <button
              type="button"
              className="uu-btn"
              onClick={() => addExportDestination()}
            >
              {t('config.postprod.exports.add')}
            </button>
          </div>

          {exportDestinations.length <= 0 ? (
            <div className="uu-muted mt-8">
              {t('config.postprod.exports.empty')}
            </div>
          ) : null}

          {exportDestinations.map((entry, idx) => (
            <div key={`config-export-destination-${entry.id || idx}`} className="uu-grid-field mt-12">
              <div className="uu-export-destination-grid">
                <div className="uu-grid-field">
                  <label className="uu-label">{t('config.postprod.exports.name')}</label>
                  <div className="uu-export-destination-name-row">
                    <label className="uu-check uu-export-destination-active">
                      <input
                        type="checkbox"
                        checked={entry.isActive !== false}
                        onChange={(e) => updateExportDestination(idx, { isActive: !!e.target.checked })}
                      />
                      {t('config.postprod.exports.active')}
                    </label>
                    <input
                      className="uu-input"
                      value={String(entry.name || '')}
                      onChange={(e) => updateExportDestination(idx, { name: e.target.value })}
                      placeholder={t('config.postprod.exports.namePlaceholder')}
                    />
                  </div>
                </div>
                <div className="uu-grid-field">
                  <label className="uu-label">{t('config.postprod.exports.path')}</label>
                  <div className="uu-export-destination-path-row">
                    <input
                      className="uu-input"
                      value={String(entry.path || '')}
                      onChange={(e) => updateExportDestination(idx, { path: e.target.value })}
                      placeholder="D:\\Livraison\\Rendus"
                    />
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={async () => {
                        const picked = await pickFolderPath();
                        if (!picked) return;
                        updateExportDestination(idx, { path: picked });
                      }}
                    >
                      {t('common.browse')}
                    </button>
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={() => removeExportDestination(idx)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="uu-section mt-16">
        <ConfigSectionTitle>{t('config.unreal.sectionTitle')}</ConfigSectionTitle>

        {canUseEditorLaunch ? (
          <label className="uu-check mt-8">
            <input
              type="checkbox"
              checked={!!cfg.showUnrealLaunchButtons}
              onChange={(e) => updateField('showUnrealLaunchButtons', !!e.target.checked)}
            />
            {t('config.unreal.showLaunchButtons')}
          </label>
        ) : null}

        <div className="uu-row mt-8">
          <button
            type="button"
            className="uu-btn"
            onClick={addVersionEntry}
          >
            {t('config.unreal.addVersion')}
          </button>
        </div>

        {versions.map((v, idx) => (
          <div
            key={idx}
            className="uu-grid-2 uu-maxw-720 mt-12"
            style={VERSION_ROW_GRID_STYLE}
          >
            <div className="uu-grid-field">
              <label className="uu-label">{t('config.unreal.versionLabel')}</label>
              <input
                className="uu-input"
                value={v.name}
                onChange={(e) => {
                  updateVersionEntry(idx, { name: e.target.value });
                }}
                placeholder="5.7"
              />
            </div>
            <div className="uu-grid-field">
              <label className="uu-label">{t('config.unreal.pathLabel')}</label>
              <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
                <input
                  className="uu-input"
                  value={v.path}
                  onChange={(e) => {
                    updateVersionEntry(idx, { path: e.target.value });
                  }}
                placeholder="C:\\Program Files\\Epic Games\\UE_5.7\\Engine\\Binaries\\Win64\\UnrealEditor.exe"
              />
                <button
                type="button"
                  className="uu-btn"
                  onClick={async () => {
                    const picked = await pickExecutablePath(v?.path);
                    if (!picked) return;
                    updateVersionEntry(idx, { path: picked });
                  }}
              >
                {t('common.browse')}
              </button>
            </div>
            </div>
            <div className="uu-row uu-gap-8" style={VERSION_ACTIONS_ROW_STYLE}>
              {canUseEditorLaunch ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => handleLaunchUnrealVersion(v?.name)}
                >
                  {t('config.unreal.launchVersion')}
                </button>
              ) : null}
              <button
                type="button"
                className="uu-btn"
                onClick={() => removeVersionEntry(idx)}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}

      </div>

      {canManageProjects ? (
      <div className="uu-section mt-16">
        <div className="uu-config-stack">
        <ConfigSectionTitle>{t('setup.server.projectRoots.title')}</ConfigSectionTitle>
        <div className="uu-muted">
          {t('config.catalog.projectsSummary', {
            count: catalogStats.projectsCount,
            date: catalogStats.projectsLastImport || '—',
          })}
        </div>

        <div className="uu-row uu-gap-8">
          <button
            type="button"
            className="uu-btn"
            onClick={addProjectRootEntry}
          >
            {t('setup.server.projectRoots.add')}
          </button>
          <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
            <input
              type="checkbox"
              checked={!!projectScanRecursive}
              onChange={(e) => setProjectScanRecursive(!!e.target.checked)}
            />
            {t('setup.server.projectRoots.recursive')}
          </label>
          <button
            type="button"
            className="uu-btn"
            onClick={handleProjectScan}
            disabled={projectScanBusy || projectImportBusy || cleanedProjectRoots.length === 0}
          >
            {projectScanBusy
              ? t('common.loading')
              : t('setup.server.projectRoots.scanButton')}
          </button>
          {hasImportableProjectSelection ? (
            <button
              type="button"
              className="uu-btn"
              onClick={handleProjectImport}
              disabled={projectImportBusy || projectScanBusy}
            >
              {projectImportBusy
                ? t('common.loading')
                : t('setup.server.projectRoots.importButton')}
            </button>
          ) : null}
          {hasProjectScanResults ? (
            <button
              type="button"
              className="uu-btn"
              onClick={() => {
                setProjectScanResults([]);
              }}
            >
              {t('setup.server.projectRoots.hideList')}
            </button>
          ) : null}
        </div>

        {projectRoots.length === 0 ? (
          <div className="uu-muted">
            {t('setup.server.projectRoots.empty')}
          </div>
        ) : (
          projectRoots.map((root, idx) => (
            <div key={`project-root-${idx}`} className="uu-grid-field">
              <label className="uu-label w-160">
                {t('setup.server.projectRoots.pathLabel')}
              </label>
              <div className="uu-grid-2" style={GRID_ONE_AUTO_AUTO_STYLE}>
                <input
                  className="uu-input"
                  value={root}
                  onChange={(e) => {
                    updateProjectRootEntry(idx, e.target.value);
                  }}
                  placeholder="D:\\Unreal_Projects"
                />
                <button
                  type="button"
                  className="uu-btn"
                  onClick={async () => {
                    const picked = await pickFolderPath();
                    if (!picked) return;
                    updateProjectRootEntry(idx, picked);
                  }}
                >
                  {t('common.browse')}
                </button>
                <button
                  type="button"
                className="uu-btn"
                onClick={() => removeProjectRootEntry(idx)}
              >
                {t('common.delete')}
              </button>
              </div>
            </div>
          ))
        )}

        {hasProjectScanResults ? (
          <>
            <div className="uu-row uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                disabled={selectableScanCount === 0}
                onClick={() => {
                  setProjectScanResults((prev) =>
                    prev.map((row) =>
                      row.exists
                        ? row
                        : { ...row, selected: !allSelectableSelected }
                    )
                  );
                }}
              >
                {allSelectableSelected
                  ? (t('setup.server.projectRoots.unselectAll'))
                  : (t('setup.server.projectRoots.selectAll'))}
              </button>
              <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
                <input
                  type="checkbox"
                  checked={!!hideImportedProjects}
                  onChange={(e) => setHideImportedProjects(!!e.target.checked)}
                />
                {t('setup.server.projectRoots.hideImported')}
              </label>
            </div>
            <div className="uu-list">
              {visibleScanResults.map((it, idx) => {
                const key = normalizePathKey(it.uprojectPath || it.name || String(idx));
                return (
                  <div key={key} className="uu-card uu-row" style={CARD_ROW_ALIGN_CENTER_STYLE}>
                    <input
                      type="checkbox"
                      checked={!!it.selected}
                      disabled={!!it.exists}
                      onChange={(e) => {
                        const checked = !!e.target.checked;
                        setProjectScanResults((prev) =>
                          prev.map((row, rowIdx) =>
                            rowIdx === idx ? { ...row, selected: checked } : row
                          )
                        );
                      }}
                    />
                    <div className="uu-col" style={SCAN_ITEM_CONTENT_STYLE}>
                      <div className="uu-item-title">{it.name || '—'}</div>
                      <div className="uu-muted">{it.uprojectPath}</div>
                    </div>
                    {it.exists ? (
                      <div className="uu-row uu-row-gap4 ml-auto" title={t('setup.server.projectRoots.alreadyImported')}>
                        <span className="uu-dot ok" />
                        <span className="uu-muted">{t('setup.server.projectRoots.alreadyImported')}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
        </div>
      </div>
      ) : null}

      {canViewResources ? (
      <div className="uu-section mt-16">
        <div className="uu-config-stack">
        <ConfigSectionTitle noMargin>{t('config.resources.title')}</ConfigSectionTitle>
        <div className="uu-muted">
          {t('config.catalog.resourcesSummary', {
            count: catalogStats.resourcesCount,
            date: catalogStats.resourcesLastImport || '—',
          })}
        </div>

        <label className="uu-check">
          <input
            type="checkbox"
            checked={!!cfg.fabResourcesEnabled}
            onChange={(e) => updateField('fabResourcesEnabled', !!e.target.checked)}
          />
          {t('config.resources.enabled')}
        </label>

        <div className="uu-row">
          {!fabAuthConnected ? (
            <button
              type="button"
              className="uu-btn"
              onClick={handleFabLogin}
              disabled={fabAuthBusy}
            >
              {fabAuthBusy
                ? t('common.loading')
                : (t('config.resources.loginButton'))}
            </button>
          ) : null}
          <div className="uu-row uu-row-gap4">
            <span className={`uu-dot ${fabAuthConnected ? 'ok' : 'fail'}`} />
            <span className="uu-muted">
              {fabAuthConnected
                ? (t('config.resources.loginConnected'))
                : (t('config.resources.loginDisconnected'))}
            </span>
          </div>
          {fabAuthConnected ? (
            <button
              type="button"
              className="uu-btn"
              onClick={handleFabLogout}
              disabled={fabAuthBusy}
            >
              {t('config.resources.logoutButton')}
            </button>
          ) : null}
        </div>

        {fabShowControls ? (
          <div className="uu-row uu-row-nowrap">
            {!fabRemoteImportBusy && !fabImporting ? (
              <button
                type="button"
                className="uu-btn"
                disabled={fabSelectableCount === 0}
                onClick={() => {
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
                }}
              >
                {fabAllSelected
                  ? (t('resources.fabImport.unselectAll'))
                  : (t('resources.fabImport.selectAll'))}
              </button>
            ) : null}
            <button
              type="button"
              className="uu-btn"
              onClick={handleFabRemoteImport}
              disabled={fabRemoteImportBusy || fabImporting || !fabAuthConnected || fabSelectedCount === 0}
            >
              {fabRemoteImportBusy
                ? t('common.loading')
                : t('config.resources.remoteImportButton')}
            </button>
            <div className="uu-muted">
              {fabCountLabel}
              {fabShowImportProgress && fabRemainingCount > 0 ? (
                <span> · {fabRemainingLabel}</span>
              ) : null}
            </div>
          </div>
        ) : fabAuthConnected ? (
          <div className="uu-row">
            <button
              type="button"
              className="uu-btn"
              onClick={handleFabPreview}
              disabled={fabPreviewBusy || fabRemoteImportBusy}
            >
              {fabPreviewBusy
                ? t('common.loading')
                : t('resources.fabImport.previewButton')}
            </button>
          </div>
        ) : null}

        {fabHasPreview ? (
          <>
            {fabPreviewNewItems.length > 0 ? (
              <>
                <strong className="uu-block-title">
                  {t('resources.fabImport.newBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewNewItems)}
              </>
            ) : null}
            {fabPreviewUpdatedItems.length > 0 ? (
              <>
                <strong className="uu-block-title">
                  {t('resources.fabImport.updatedBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewUpdatedItems)}
              </>
            ) : null}
          </>
        ) : null}

        {fabRemoteImportMsg ? (
          <div className={`uu-msg ${fabRemoteImportMsgType || 'info'}`}>
            {fabRemoteImportMsg}
          </div>
        ) : null}
        </div>
      </div>
      ) : null}
      </>
      ) : null}
    </div>
  );
}
