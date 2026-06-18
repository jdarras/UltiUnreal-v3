import React from 'react';
import {
  getCommon,
  getHosts,
  postCommon,
  postHost,
} from '../utils/agent';
import { useTransientInfo } from './hooks/useTransientInfo';
import {
  EMPTY_COMMON,
  sanitizeExportDestinationId,
  buildExportDestinationId,
  normalizeExportDestinations,
  normalizeProxyResolution,
  normalizeProxyCrf,
  normalizeProjectRoots,
} from './configurationHelpers';
import { toTrimmedString } from '../utils/coerce';

function toSafeNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeIndex(index) {
  const next = Number(index);
  if (!Number.isFinite(next) || next < 0) return -1;
  return Math.trunc(next);
}

function getSectionForField(field, sectionOverride = null) {
  if (sectionOverride) return sectionOverride;
  if (field === 'showUnrealLaunchButtons') return 'versions';
  if (field.startsWith('wrc')) return 'common';
  return 'common';
}

function buildVersionNames(versions) {
  return versions
    .map((v) => toTrimmedString(v?.name))
    .filter(Boolean);
}

function buildCommonBody(currentCfg, versionNames, currentRoots, forceShowFlag = null) {
  const renderOutputDir = toTrimmedString(currentCfg?.renderOutputDir);
  const normalizedDestinations = normalizeExportDestinations(
    currentCfg?.renderExportDestinations,
    []
  );
  return {
    rcHttpPort: toSafeNumber(currentCfg?.rcHttpPort, 0),
    rcWsPort: toSafeNumber(currentCfg?.rcWsPort, 0),
    render_output_dir: renderOutputDir,
    render_output_dirs: renderOutputDir ? [renderOutputDir] : [],
    refreshSec: toSafeNumber(currentCfg?.refreshSec, 0),
    logWarnLines: toSafeNumber(currentCfg?.logWarnLines, 0),
    logHardLimitLines: toSafeNumber(currentCfg?.logHardLimitLines, 0),
    auditWarnLines: toSafeNumber(currentCfg?.auditWarnLines, 0),
    auditHardLimitLines: toSafeNumber(currentCfg?.auditHardLimitLines, 0),
    wrcMaxAttempts: toSafeNumber(currentCfg?.wrcMaxAttempts, 0),
    wrcRetryDelaySec: toSafeNumber(currentCfg?.wrcRetryDelaySec, 0),
    startLayoutSendDelaySec: toSafeNumber(currentCfg?.startLayoutSendDelaySec, 0),
    proxyEnabled: !!currentCfg?.proxyEnabled,
    proxyResolution: normalizeProxyResolution(currentCfg?.proxyResolution, 50),
    proxyCrf: normalizeProxyCrf(currentCfg?.proxyCrf, 23),
    renderExportDestinations: normalizedDestinations,
    render_export_destinations: normalizedDestinations,
    unrealVersions: versionNames,
    project_roots: currentRoots,
    fab_resources_enabled: !!currentCfg?.fabResourcesEnabled,
    show_start_new_ue: forceShowFlag !== null
      ? !!forceShowFlag
      : !!currentCfg?.showUnrealLaunchButtons,
    allowStartDesynced: !!currentCfg?.allowStartDesynced,
  };
}

function buildHostEditorsPayload(versions) {
  const unrealEditors = {};
  for (const version of versions) {
    const name = toTrimmedString(version?.name);
    if (!name) continue;
    unrealEditors[name] = toTrimmedString(version?.path);
  }
  return { unrealEditors };
}

function useInfoFeedbackState() {
  const {
    infoMsg: infoText,
    infoMsgType: infoType,
    showInfo,
    clearInfo,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 2500 });
  const [infoSection, setInfoSection] = React.useState('');

  const showInfoFeedback = React.useCallback((text = '', type = '', section = '', delayMs = 2500) => {
    const msg = toTrimmedString(text);
    if (!msg) {
      clearInfo();
      setInfoSection('');
      return;
    }
    setInfoSection(toTrimmedString(section));
    showInfo(msg, toTrimmedString(type) || 'error', delayMs);
  }, [clearInfo, showInfo]);

  React.useEffect(() => {
    if (!infoText) setInfoSection('');
  }, [infoText]);

  const infoMsg = React.useMemo(() => ({
    text: infoText,
    type: infoType,
    section: infoSection,
  }), [infoSection, infoText, infoType]);

  return {
    infoMsg,
    showInfoFeedback,
  };
}

function useCommonPersistence({
  loaded,
  localIp,
  t,
  onCommonUpdated,
  cfgRef,
  versionsRef,
  projectRootsRef,
  showInfoFeedback,
}) {
  const saveTimer = React.useRef(null);

  const handleSave = React.useCallback(async (section = 'common', forceShowFlag = null) => {
    if (!loaded) return;

    const currentCfg = cfgRef.current || {};
    const currentVersions = Array.isArray(versionsRef.current) ? versionsRef.current : [];
    const currentRoots = normalizeProjectRoots(projectRootsRef.current);
    const versionNames = buildVersionNames(currentVersions);
    const body = buildCommonBody(currentCfg, versionNames, currentRoots, forceShowFlag);

    try {
      const response = await postCommon(body);
      const ok = response && response.ok !== false;
      showInfoFeedback(
        ok ? t('setup.server.msg.commonSaved') : t('setup.server.msg.commonError'),
        ok ? 'ok' : 'error',
        section,
        2500
      );

      if (ok && typeof onCommonUpdated === 'function') {
        onCommonUpdated(response?.common || body);
      }

      if (ok && localIp && versionNames.length > 0) {
        try {
          await postHost(localIp, buildHostEditorsPayload(currentVersions));
        } catch {
          // Primary feedback already handled by common save result.
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
  }, [loaded, cfgRef, versionsRef, projectRootsRef, t, onCommonUpdated, showInfoFeedback, localIp]);

  const scheduleSave = React.useCallback((section = 'common') => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void handleSave(section);
    }, 700);
  }, [handleSave, loaded]);

  React.useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  return {
    handleSave,
    scheduleSave,
  };
}

function useCommonCollections({
  setCfg,
  cfgRef,
  setVersions,
  setProjectRoots,
  scheduleSave,
  handleSave,
}) {
  const updateField = React.useCallback((field, value, sectionOverride = null) => {
    const section = getSectionForField(field, sectionOverride);
    setCfg((prev) => {
      const next = { ...prev, [field]: value };
      cfgRef.current = next;
      return next;
    });
    if (field === 'showUnrealLaunchButtons') {
      void handleSave(section, value);
      return;
    }
    if (field === 'allowStartDesynced') {
      void handleSave(section);
      return;
    }
    scheduleSave(section);
  }, [setCfg, cfgRef, handleSave, scheduleSave]);

  const updateExportDestination = React.useCallback((index, patch = {}) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
    setCfg((prev) => {
      const current = normalizeExportDestinations(prev.renderExportDestinations, [], { keepEmpty: true });
      if (safeIndex >= current.length) return prev;
      const next = current.map((entry, entryIndex) => {
        if (entryIndex !== safeIndex) return entry;
        const merged = {
          ...entry,
          ...(patch && typeof patch === 'object' ? patch : {}),
        };
        const safePath = toTrimmedString(merged.path);
        const safeName = toTrimmedString(merged.name);
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
  }, [cfgRef, scheduleSave, setCfg]);

  const addExportDestination = React.useCallback(() => {
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
  }, [cfgRef, scheduleSave, setCfg]);

  const removeExportDestination = React.useCallback((index) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
    setCfg((prev) => {
      const current = normalizeExportDestinations(prev.renderExportDestinations, [], { keepEmpty: true });
      const next = current.filter((_, entryIndex) => entryIndex !== safeIndex);
      const updated = { ...prev, renderExportDestinations: next };
      cfgRef.current = updated;
      return updated;
    });
    scheduleSave('common');
  }, [cfgRef, scheduleSave, setCfg]);

  const addVersionEntry = React.useCallback(() => {
    setVersions((prev) => [...prev, { name: '', path: '' }]);
    scheduleSave('versions');
  }, [scheduleSave, setVersions]);

  const updateVersionEntry = React.useCallback((index, patch = {}) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
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
  }, [scheduleSave, setVersions]);

  const removeVersionEntry = React.useCallback((index) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
    setVersions((prev) => prev.filter((_, i) => i !== safeIndex));
    scheduleSave('versions');
  }, [scheduleSave, setVersions]);

  const addProjectRootEntry = React.useCallback(() => {
    setProjectRoots((prev) => [...prev, '']);
    scheduleSave('projects');
  }, [scheduleSave, setProjectRoots]);

  const updateProjectRootEntry = React.useCallback((index, value) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
    const nextValue = toTrimmedString(value);
    setProjectRoots((prev) => {
      if (safeIndex >= prev.length) return prev;
      const next = [...prev];
      next[safeIndex] = nextValue;
      return next;
    });
    scheduleSave('projects');
  }, [scheduleSave, setProjectRoots]);

  const removeProjectRootEntry = React.useCallback((index) => {
    const safeIndex = normalizeIndex(index);
    if (safeIndex < 0) return;
    setProjectRoots((prev) => prev.filter((_, i) => i !== safeIndex));
    scheduleSave('projects');
  }, [scheduleSave, setProjectRoots]);

  return {
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
  };
}

function useCommonBootstrap({
  localIp,
  setCfg,
  setVersions,
  setProjectRoots,
  setLoaded,
}) {
  React.useEffect(() => {
    (async () => {
      let hostList = [];
      try {
        hostList = await getHosts();
      } catch {}

      try {
        const common = await getCommon();
        setCfg((prev) => ({
          ...prev,
          rcHttpPort: common?.rcHttpPort ?? prev.rcHttpPort,
          rcWsPort: common?.rcWsPort ?? prev.rcWsPort,
          renderOutputDir: toTrimmedString(
            common?.render_output_dir ??
            common?.renderOutputDir ??
            (
              (Array.isArray(common?.render_output_dirs) ? common.render_output_dirs : (
                Array.isArray(common?.renderOutputDirs) ? common.renderOutputDirs : []
              ))
                .map((entry) => toTrimmedString(entry))
                .find(Boolean)
            ) ??
            prev.renderOutputDir
          ),
          proxyEnabled: typeof common?.proxyEnabled === 'boolean'
            ? common.proxyEnabled
            : (
              typeof common?.proxy_enabled === 'boolean'
                ? common.proxy_enabled
                : !!prev.proxyEnabled
            ),
          proxyResolution: normalizeProxyResolution(
            common?.proxyResolution ?? common?.proxy_resolution,
            prev.proxyResolution
          ),
          proxyCrf: normalizeProxyCrf(
            common?.proxyCrf ?? common?.proxy_crf,
            prev.proxyCrf
          ),
          renderExportDestinations: normalizeExportDestinations(
            common?.renderExportDestinations ?? common?.render_export_destinations,
            prev.renderExportDestinations
          ),
          refreshSec: common?.refreshSec ?? prev.refreshSec,
          logWarnLines: common?.logWarnLines ?? prev.logWarnLines,
          logHardLimitLines: common?.logHardLimitLines ?? prev.logHardLimitLines,
          auditWarnLines: common?.auditWarnLines ?? prev.auditWarnLines,
          auditHardLimitLines: common?.auditHardLimitLines ?? prev.auditHardLimitLines,
          wrcMaxAttempts: common?.wrcMaxAttempts ?? prev.wrcMaxAttempts ?? 10,
          wrcRetryDelaySec: common?.wrcRetryDelaySec ?? prev.wrcRetryDelaySec ?? 3,
          startLayoutSendDelaySec: common?.startLayoutSendDelaySec ?? prev.startLayoutSendDelaySec ?? 3,
          fabResourcesEnabled: typeof common?.fab_resources_enabled === 'boolean'
            ? common.fab_resources_enabled
            : (typeof common?.fabResourcesEnabled === 'boolean'
              ? common.fabResourcesEnabled
              : prev.fabResourcesEnabled),
          showUnrealLaunchButtons:
            typeof common?.show_start_new_ue === 'boolean'
              ? common.show_start_new_ue
              : prev.showUnrealLaunchButtons,
          allowStartDesynced:
            typeof common?.allowStartDesynced === 'boolean'
              ? common.allowStartDesynced
              : prev.allowStartDesynced,
        }));

        const versions = Array.isArray(common?.unrealVersions)
          ? common.unrealVersions.map((v) => toTrimmedString(v)).filter(Boolean)
          : [];

        const host = hostList.find(
          (entry) =>
            entry &&
            toTrimmedString(entry.ip).toLowerCase() === toTrimmedString(localIp).toLowerCase()
        ) || hostList[0];

        const editorMap = host && host.unrealEditors && typeof host.unrealEditors === 'object'
          ? host.unrealEditors
          : {};

        const roots = Array.isArray(common?.project_roots)
          ? common.project_roots.map((v) => toTrimmedString(v)).filter(Boolean)
          : [];

        setProjectRoots(roots);
        setVersions(
          versions.map((name) => ({
            name,
            path: editorMap[name] || '',
          }))
        );
      } catch {
        // keep defaults and continue
      } finally {
        setLoaded(true);
      }
    })();
  }, [localIp, setCfg, setLoaded, setProjectRoots, setVersions]);
}

function useConfigCommonSettings({
  localIp = '',
  t,
  onCommonUpdated = null,
}) {
  const [cfg, setCfg] = React.useState(EMPTY_COMMON);
  const [versions, setVersions] = React.useState([]);
  const [projectRoots, setProjectRoots] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const cfgRef = React.useRef(EMPTY_COMMON);
  const versionsRef = React.useRef([]);
  const projectRootsRef = React.useRef([]);

  const { infoMsg, showInfoFeedback } = useInfoFeedbackState();
  const { handleSave, scheduleSave } = useCommonPersistence({
    loaded,
    localIp,
    t,
    onCommonUpdated,
    cfgRef,
    versionsRef,
    projectRootsRef,
    showInfoFeedback,
  });

  const {
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
  } = useCommonCollections({
    setCfg,
    cfgRef,
    setVersions,
    setProjectRoots,
    scheduleSave,
    handleSave,
  });

  React.useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  React.useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  React.useEffect(() => {
    projectRootsRef.current = projectRoots;
  }, [projectRoots]);

  useCommonBootstrap({
    localIp,
    setCfg,
    setVersions,
    setProjectRoots,
    setLoaded,
  });

  return {
    cfg,
    setCfg,
    cfgRef,
    versions,
    versionsRef,
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
  };
}

export { useConfigCommonSettings };
