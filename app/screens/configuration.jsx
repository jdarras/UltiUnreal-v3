// app/screens/configuration.jsx
import React from 'react';
import { readIdentity, writeIdentity } from '../utils/identity';
import {
  getCommon,
  postCommon,
  getHosts,
  postHost,
  postProjectsScan,
  postProjectsImport,
  postLibraryImportRemote,
  postLibraryImportRemotePreview,
  probePostprodHub,
} from '../utils/agent';
import { createT } from '../i18n';
import { NoticeContext } from '../NoticeContext';

const EMPTY_COMMON = {
  refreshSec: '',
  logWarnLines: 1500,
  logHardLimitLines: 2000,
  webRemoteControlName: '',
  renderOutputDir: '',
  rcHttpPort: '',
  rcWsPort: '',
  wrcMaxAttempts: 10,
  wrcRetryDelaySec: 3,
  startLayoutSendDelaySec: 3,
  fabResourcesEnabled: false,
  showUnrealLaunchButtons: false,
  allowStartDesynced: false,
  useStartLayout: false,
};

const POSTPROD_NET_LAN = 'lan';
const POSTPROD_NET_VPN = 'vpn';
const POSTPROD_NET_BROKER = 'broker';
const APP_MODE_POSTPROD = 'postprod';

function normalizePostprodNetworkMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === POSTPROD_NET_VPN) return POSTPROD_NET_VPN;
  if (raw === POSTPROD_NET_BROKER) return POSTPROD_NET_BROKER;
  return POSTPROD_NET_LAN;
}

function formatLicenseDate(exp, lang) {
  const raw = String(exp || '').trim();
  if (!raw) return '';
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(locale);
}

function parseLicenseExpToUtcMs(exp) {
  const raw = String(exp || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const ms = Date.parse(`${raw}T23:59:59Z`);
  return Number.isFinite(ms) ? ms : null;
}

function getDaysLeft(exp) {
  const expMs = parseLicenseExpToUtcMs(exp);
  if (!expMs) return null;
  const diffMs = expMs - Date.now();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export default function ConfigurationScreen({
  licenseStatus,
  onCommonUpdated,
  onNavigate,
  onLibraryImported,
  onIdentityUpdated,
  appMode = '',
  canViewResources = true,
  canManageProjects = true,
}) {
  // identité + langue courante
  const identity = React.useMemo(readIdentity, []);
  const localIp = String(identity?.localIp || '').trim();
  const [lang, setLang] = React.useState(() => {
    if (identity && typeof identity === 'object' && identity.lang) {
      return String(identity.lang).trim();
    }
    return 'fr';
  });

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
  const [infoMsg, setInfoMsg] = React.useState({ text: '', type: '', section: '' }); // section: common|versions|projects
  const [versions, setVersions] = React.useState([]); // [{name, path}]
  const [projectRoots, setProjectRoots] = React.useState([]);
  const [projectScanMsg, setProjectScanMsg] = React.useState('');
  const [projectScanMsgType, setProjectScanMsgType] = React.useState('');
  const [projectScanBusy, setProjectScanBusy] = React.useState(false);
  const [projectScanRecursive, setProjectScanRecursive] = React.useState(true);
  const [projectScanResults, setProjectScanResults] = React.useState([]);
  const [projectImportBusy, setProjectImportBusy] = React.useState(false);
  const [hideImportedProjects, setHideImportedProjects] = React.useState(() => {
    try {
      const stored = localStorage.getItem('uu_hide_imported_projects');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {}
    return false;
  });
  const [fabAuthConnected, setFabAuthConnected] = React.useState(false);
  const [fabAuthBusy, setFabAuthBusy] = React.useState(false);
  const [fabAuthMsg, setFabAuthMsg] = React.useState('');
  const [fabAuthMsgType, setFabAuthMsgType] = React.useState('');
  const [fabPreviewItems, setFabPreviewItems] = React.useState([]);
  const [fabSelection, setFabSelection] = React.useState({});
  const [fabPreviewBusy, setFabPreviewBusy] = React.useState(false);
  const [fabPreviewToken, setFabPreviewToken] = React.useState('');
  const [fabImporting, setFabImporting] = React.useState(false);
  const [fabImportDone, setFabImportDone] = React.useState(0);
  const [fabImportTotal, setFabImportTotal] = React.useState(0);
  const [fabRemoteImportMsg, setFabRemoteImportMsg] = React.useState('');
  const [fabRemoteImportMsgType, setFabRemoteImportMsgType] = React.useState('');
  const [fabRemoteImportBusy, setFabRemoteImportBusy] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [postprodConnectivity, setPostprodConnectivity] = React.useState(() => ({
    mode: normalizePostprodNetworkMode(identity?.postprodNetworkMode),
    hubHost: String(identity?.postprodHubHost || '').trim(),
    hubUrl: String(identity?.postprodHubUrl || '').trim(),
    brokerToken: String(identity?.postprodBrokerToken || '').trim(),
  }));
  const [postprodConnectivityTesting, setPostprodConnectivityTesting] = React.useState(false);
  const [postprodConnectivityMsg, setPostprodConnectivityMsg] = React.useState('');
  const [postprodConnectivityMsgType, setPostprodConnectivityMsgType] = React.useState('');
  const saveTimer = React.useRef(null);

  React.useEffect(() => {
    if (!noticeApi) return;
    // Debug deps order (disabled in runtime builds)
    if (projectScanMsg) {
      noticeApi.showNotice?.(projectScanMsg, projectScanMsgType || '');
      return;
    }
    if (infoMsg?.text) {
      noticeApi.showNotice?.(infoMsg.text, infoMsg.type || '');
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
    fabAuthMsg,
    fabAuthMsgType,
    fabRemoteImportMsg,
    fabRemoteImportMsgType,
    noticeApi,
  ]);
  const cfgRef = React.useRef(EMPTY_COMMON);
  const versionsRef = React.useRef([]);
  const projectRootsRef = React.useRef([]);

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
          webRemoteControlName: c?.webRemoteControlName ?? prev.webRemoteControlName,
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
          refreshSec: c?.refreshSec ?? prev.refreshSec,
          logWarnLines: c?.logWarnLines ?? prev.logWarnLines,
          logHardLimitLines: c?.logHardLimitLines ?? prev.logHardLimitLines,
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

  React.useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  React.useEffect(() => {
    refreshFabAuthStatus();
  }, []);

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
    try {
      localStorage.setItem(
        'uu_hide_imported_projects',
        hideImportedProjects ? 'true' : 'false'
      );
    } catch {}
  }, [hideImportedProjects]);

  React.useEffect(() => {
    if (!noticeApi || !licenseWarn) return;
    if (!licenseLine) return;
    noticeApi.showNotice?.(licenseLine, 'error');
  }, [noticeApi, licenseWarn, licenseLine]);

  function normalizeProjectRoots(list = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(list) ? list : []).forEach((val) => {
      const raw = String(val || '').trim();
      if (!raw) return;
      const key = raw.replace(/\\/g, '/').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(raw);
    });
    return out;
  }

  function normalizeUid(uid) {
    return String(uid || '').trim().toLowerCase();
  }

  function normalizeFabPreviewStatus(item) {
    const raw = String(item?.status || item?.state || item?.kind || '').trim().toLowerCase();
    if (raw === 'new' || raw === 'added') return 'new';
    if (raw === 'modified' || raw === 'updated' || raw === 'update') return 'modified';
    if (item?.isNew) return 'new';
    if (item?.isModified) return 'modified';
    return 'modified';
  }

  function normalizePathKey(p) {
    return String(p || '')
      .trim()
      .replace(/\\/g, '/')
      .toLowerCase();
  }

  function deriveNameFromPath(p) {
    const file = String(p || '').split(/[\\/]/).pop() || '';
    return file.replace(/\.uproject$/i, '');
  }

  function updateField(field, value, sectionOverride = null) {
    const section =
      sectionOverride ||
      (field === 'showUnrealLaunchButtons' ? 'versions' :
        field.startsWith('wrc') ? 'common' :
        field === 'refreshSec' || field === 'webRemoteControlName' ||
        field === 'rcHttpPort' || field === 'rcWsPort' ||
        field === 'logWarnLines' || field === 'logHardLimitLines'
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
      webRemoteControlName: String(currentCfg.webRemoteControlName || ''),
      render_output_dir: String(currentCfg.renderOutputDir || '').trim(),
      render_output_dirs: String(currentCfg.renderOutputDir || '').trim()
        ? [String(currentCfg.renderOutputDir || '').trim()]
        : [],
      refreshSec: Number(currentCfg.refreshSec || 0),
      logWarnLines: Number(currentCfg.logWarnLines || 0),
      logHardLimitLines: Number(currentCfg.logHardLimitLines || 0),
      wrcMaxAttempts: Number(currentCfg.wrcMaxAttempts || 0),
      wrcRetryDelaySec: Number(currentCfg.wrcRetryDelaySec || 0),
      startLayoutSendDelaySec: Number(currentCfg.startLayoutSendDelaySec || 0),
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
      setInfoMsg({
        text: ok
          ? (t('setup.server.msg.commonSaved') )
          : (t('setup.server.msg.commonError')),
        type: ok ? 'ok' : 'error',
        section,
      });

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
      setInfoMsg({
        text: t('setup.server.msg.commonError'),
        type: 'error',
        section,
      });
    }

    setTimeout(() => {
      setInfoMsg({ text: '', type: '', section: '' });
    }, 2500);
  }

  async function handleProjectScan() {
    const cleaned = normalizeProjectRoots(projectRootsRef.current);
    if (cleaned.length === 0) {
      setProjectScanMsgType('error');
      setProjectScanMsg(t('setup.server.projectRoots.empty'));
      setProjectScanResults([]);
      setTimeout(() => {
        setProjectScanMsg('');
        setProjectScanMsgType('');
      }, 2500);
      return;
    }

    setProjectScanBusy(true);
    setProjectScanMsg('');
    setProjectScanMsgType('');

    try {
      const res = await postProjectsScan({
        project_roots: cleaned,
        recursive: projectScanRecursive,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      const normalized = items.map((it) => {
        const up = String(it?.uprojectPath || it?.uproject || it?.path || '').trim();
        const name = String(it?.name || '').trim() || deriveNameFromPath(up);
        const exists = !!it?.exists;
        return {
          name,
          uprojectPath: up,
          exists,
          selected: !exists,
        };
      });

      const found = normalized.length;
      const existing = normalized.filter((it) => it.exists).length;
      setProjectScanResults(normalized);
      setProjectScanMsgType('ok');
      setProjectScanMsg(
        t('setup.server.projectRoots.scanResult', { found, existing })
      );
    } catch {
      setProjectScanResults([]);
      setProjectScanMsgType('error');
      setProjectScanMsg(t('setup.server.projectRoots.scanError'));
    } finally {
      setProjectScanBusy(false);
      setTimeout(() => {
        setProjectScanMsg('');
        setProjectScanMsgType('');
      }, 3000);
    }
  }

  async function handleProjectImport() {
    const selected = projectScanResults.filter((it) => it.selected && !it.exists);
    if (selected.length === 0) {
      setProjectScanMsgType('error');
      setProjectScanMsg(t('setup.server.projectRoots.noSelection'));
      setTimeout(() => {
        setProjectScanMsg('');
        setProjectScanMsgType('');
      }, 2500);
      return;
    }

    setProjectImportBusy(true);
    setProjectScanMsg('');
    setProjectScanMsgType('');

    try {
      const res = await postProjectsImport({
        uprojectPaths: selected.map((it) => it.uprojectPath),
      });
      const imported = Number(res?.imported || 0);
      const skipped = Number(res?.skipped || 0);
      const importedSet = new Set(
        (Array.isArray(res?.importedPaths) ? res.importedPaths : [])
          .map((p) => normalizePathKey(p))
          .filter(Boolean)
      );
      const skippedSet = new Set(
        (Array.isArray(res?.skippedPaths) ? res.skippedPaths : [])
          .map((p) => normalizePathKey(p))
          .filter(Boolean)
      );
      setProjectScanResults((prev) =>
        prev.map((it) => {
          const key = normalizePathKey(it.uprojectPath);
          if (importedSet.has(key) || skippedSet.has(key)) {
            return { ...it, exists: true, selected: false };
          }
          return it;
        })
      );
      setProjectScanMsgType('ok');
      setProjectScanMsg(
        t('setup.server.projectRoots.importResult', { imported, skipped })
      );
      if (imported > 0 && typeof onNavigate === 'function') {
        onNavigate('Projets', { force: true });
      }
    } catch {
      setProjectScanMsgType('error');
      setProjectScanMsg(t('setup.server.projectRoots.importError'));
    } finally {
      setProjectImportBusy(false);
      setTimeout(() => {
        setProjectScanMsg('');
        setProjectScanMsgType('');
      }, 3000);
    }
  }

  async function refreshFabAuthStatus() {
    if (typeof window.electron?.fabAuthStatus !== 'function') {
      setFabAuthConnected(false);
      return;
    }
    try {
      const res = await window.electron.fabAuthStatus();
      setFabAuthConnected(!!res?.connected);
    } catch {
      setFabAuthConnected(false);
    }
  }

  async function handleFabLogin() {
    if (fabAuthBusy) return;
    if (typeof window.electron?.fabLogin !== 'function') {
      setFabAuthMsgType('error');
      setFabAuthMsg(t('config.resources.loginUnavailable'));
      setTimeout(() => {
        setFabAuthMsg('');
        setFabAuthMsgType('');
      }, 2500);
      return;
    }

    setFabAuthBusy(true);
    setFabAuthMsg('');
    setFabAuthMsgType('');

    try {
      const res = await window.electron.fabLogin();
      const connected = !!res?.connected;
      setFabAuthConnected(connected);
      setFabAuthMsgType(connected ? 'ok' : 'error');
      setFabAuthMsg(
        connected
          ? (t('config.resources.loginOk'))
          : (t('config.resources.loginError'))
      );
    } catch {
      setFabAuthMsgType('error');
      setFabAuthMsg(t('config.resources.loginError'));
    } finally {
      setFabAuthBusy(false);
      setTimeout(() => {
        setFabAuthMsg('');
        setFabAuthMsgType('');
      }, 3000);
    }
  }

  async function handleFabLogout() {
    if (fabAuthBusy) return;
    if (typeof window.electron?.fabLogout !== 'function') {
      setFabAuthConnected(false);
      return;
    }
    setFabAuthBusy(true);
    try {
      await window.electron.fabLogout();
      setFabAuthConnected(false);
      setFabPreviewItems([]);
      setFabSelection({});
      setFabPreviewToken('');
      setFabImporting(false);
      setFabImportDone(0);
      setFabImportTotal(0);
    } finally {
      setFabAuthBusy(false);
    }
  }

  async function handleFabPreview() {
    if (fabPreviewBusy || fabRemoteImportBusy) return;
    if (!fabAuthConnected) {
      setFabRemoteImportMsgType('error');
      setFabRemoteImportMsg(t('config.resources.loginRequired'));
      setTimeout(() => {
        setFabRemoteImportMsg('');
        setFabRemoteImportMsgType('');
      }, 2500);
      return;
    }

    setFabPreviewBusy(true);
    setFabRemoteImportMsg('');
    setFabRemoteImportMsgType('');
    setFabImporting(false);
    setFabImportDone(0);
    setFabImportTotal(0);
    setFabPreviewToken('');

    try {
      const res = await postLibraryImportRemotePreview({
        downloadThumbnails: false,
      });
      const ok = res && res.ok !== false;
      if (!ok) {
        const detail = String(res?.detail || res?.error || res?.status || '').trim();
        const base = t('resources.fabImport.previewError');
        setFabRemoteImportMsgType('error');
        setFabRemoteImportMsg(detail ? `${base} (${detail})` : base);
        return;
      }

      const list = Array.isArray(res?.items) ? res.items : [];
      const ignored = Array.isArray(res?.ignored) ? res.ignored : [];
      const ignoredSet = new Set(ignored.map((uid) => normalizeUid(uid)).filter(Boolean));
      const selection = {};
      list.forEach((item) => {
        const key = normalizeUid(item?.uid);
        if (!key) return;
        selection[key] = !ignoredSet.has(key);
      });
      setFabPreviewItems(list);
      setFabSelection(selection);
      setFabPreviewToken(String(res?.token || res?.previewToken || res?.cacheToken || ''));

      if (!list.length) {
        setFabRemoteImportMsgType('info');
        setFabRemoteImportMsg(t('resources.fabImport.empty'));
      } else {
        const selectedCount = Object.values(selection).filter(Boolean).length;
        setFabRemoteImportMsgType('ok');
        setFabRemoteImportMsg(
          t('resources.fabImport.selectionCount', {
            selected: selectedCount,
            total: list.length,
          })
        );
      }
    } catch (e) {
      const detail = String(e?.message || e || '').trim();
      const base = t('resources.fabImport.previewError');
      setFabRemoteImportMsgType('error');
      setFabRemoteImportMsg(detail ? `${base} (${detail})` : base);
      setFabPreviewToken('');
    } finally {
      setFabPreviewBusy(false);
      setTimeout(() => {
        setFabRemoteImportMsg('');
        setFabRemoteImportMsgType('');
      }, 3000);
    }
  }

  async function handleFabRemoteImport() {
    if (fabRemoteImportBusy || fabImporting) return;
    if (!fabAuthConnected) {
      setFabRemoteImportMsgType('error');
      setFabRemoteImportMsg(t('config.resources.loginRequired'));
      setTimeout(() => {
        setFabRemoteImportMsg('');
        setFabRemoteImportMsgType('');
      }, 2500);
      return;
    }

    const selected = [];
    const ignored = [];
    for (const item of fabPreviewItems) {
      const key = normalizeUid(item?.uid);
      if (!key) continue;
      if (fabSelection[key]) selected.push(key);
      else ignored.push(key);
    }

    if (selected.length === 0) {
      setFabRemoteImportBusy(false);
      setFabRemoteImportMsgType('error');
      setFabRemoteImportMsg(t('resources.fabImport.noSelection'));
      setTimeout(() => {
        setFabRemoteImportMsg('');
        setFabRemoteImportMsgType('');
      }, 2500);
      return;
    }

    const visibleUids = [...selected, ...ignored];
    let importedTotal = 0;
    let skippedTotal = 0;
    let processed = 0;
    let failed = false;

    setFabRemoteImportBusy(true);
    setFabRemoteImportMsg('');
    setFabRemoteImportMsgType('');
    setFabImporting(true);
    setFabImportDone(0);
    setFabImportTotal(selected.length);

    try {
      for (const uid of selected) {
        const res = await postLibraryImportRemote({
          selectedUids: [uid],
          ignoredUids: ignored,
          visibleUids,
          previewToken: fabPreviewToken,
          downloadThumbnails: true,
        });
        const ok = res && res.ok !== false;
        if (!ok) {
          const detail = String(res?.detail || res?.error || res?.status || '').trim();
          const base = t('config.resources.remoteImportError');
          setFabRemoteImportMsgType('error');
          setFabRemoteImportMsg(detail ? `${base} (${detail})` : base);
          failed = true;
          break;
        }

        importedTotal += Number(res?.imported || 0);
        skippedTotal += Number(res?.skipped || 0);
        processed += 1;
        setFabImportDone(processed);
        setFabPreviewItems((prev) =>
          prev.filter((row) => normalizeUid(row?.uid) !== uid)
        );
        setFabSelection((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }

      if (!failed) {
        setFabRemoteImportMsgType('ok');
        setFabRemoteImportMsg(
          t('config.resources.remoteImportResult', {
            imported: importedTotal,
            skipped: skippedTotal,
          })
        );
        if (typeof onLibraryImported === 'function' && importedTotal > 0) {
          onLibraryImported();
        }
        await handleFabLogout();
        if (typeof onNavigate === 'function') {
          onNavigate('Ressources', { force: true });
        }
      }
    } catch {
      if (!failed) {
        setFabRemoteImportMsgType('error');
        setFabRemoteImportMsg(t('config.resources.remoteImportError'));
      }
    } finally {
      setFabRemoteImportBusy(false);
      setFabImporting(false);
      setTimeout(() => {
        setFabRemoteImportMsg('');
        setFabRemoteImportMsgType('');
      }, 3000);
    }
  }

  function persistIdentityPatch(patch = {}) {
    try {
      const latest = readIdentity();
      const safeIdentity =
        latest && typeof latest === 'object'
          ? latest
          : (identity && typeof identity === 'object' ? identity : {});
      const nextId = { ...safeIdentity, ...(patch && typeof patch === 'object' ? patch : {}) };
      writeIdentity(nextId);
      if (typeof onIdentityUpdated === 'function') {
        onIdentityUpdated(nextId);
      }
      return nextId;
    } catch {
      return null;
    }
  }

  function handleLangChange(e) {
    const value = String(e.target.value || '').trim();
    const newLang = value === 'en' ? 'en' : 'fr';

    setLang(newLang);
    // pas de save côté agent pour la langue (stock local)

    persistIdentityPatch({ lang: newLang });
  }

  function updatePostprodConnectivityField(key, value) {
    const field = String(key || '').trim();
    if (!field) return;
    setPostprodConnectivity((prev) => {
      const current = prev && typeof prev === 'object'
        ? prev
        : {
          mode: POSTPROD_NET_LAN,
          hubHost: '',
          hubUrl: '',
          brokerToken: '',
        };
      const next = { ...current };
      if (field === 'mode') {
        next.mode = normalizePostprodNetworkMode(value);
      } else if (field === 'hubHost') {
        next.hubHost = String(value || '');
      } else if (field === 'hubUrl') {
        next.hubUrl = String(value || '');
      } else if (field === 'brokerToken') {
        next.brokerToken = String(value || '');
      }
      persistIdentityPatch({
        postprodNetworkMode: next.mode,
        postprodHubHost: String(next.hubHost || ''),
        postprodHubUrl: String(next.hubUrl || ''),
        postprodBrokerToken: String(next.brokerToken || ''),
      });
      return next;
    });
    setPostprodConnectivityMsg('');
    setPostprodConnectivityMsgType('');
  }

  async function handleTestPostprodConnectivity() {
    if (postprodConnectivityTesting) return;
    const mode = normalizePostprodNetworkMode(postprodConnectivity?.mode);
    const hubHost = String(postprodConnectivity?.hubHost || '').trim();
    const hubUrl = String(postprodConnectivity?.hubUrl || '').trim();
    if (mode !== POSTPROD_NET_BROKER && !hubHost) {
      setPostprodConnectivityMsgType('info');
      setPostprodConnectivityMsg(t('welcome.postprod.connectivity.test.localHint'));
      return;
    }
    setPostprodConnectivityTesting(true);
    setPostprodConnectivityMsg('');
    setPostprodConnectivityMsgType('');
    try {
      const latestIdentity = readIdentity();
      const portRaw =
        latestIdentity && typeof latestIdentity === 'object'
          ? latestIdentity.agentPort
          : identity?.agentPort;
      const port = Number(portRaw);
      const probe = await probePostprodHub({
        mode,
        hubHost,
        hubUrl,
        port: Number.isFinite(port) && port > 0 ? Math.trunc(port) : 4000,
      });
      const target = String(probe?.target || hubUrl || hubHost || '').trim();
      if (probe?.ok) {
        setPostprodConnectivityMsgType('ok');
        setPostprodConnectivityMsg(
          t('welcome.postprod.connectivity.test.ok', { target: target || 'hub' })
        );
      } else {
        setPostprodConnectivityMsgType('error');
        setPostprodConnectivityMsg(
          t('welcome.postprod.connectivity.test.fail', { target: target || 'hub' })
        );
      }
    } catch {
      const fallbackTarget =
        String(postprodConnectivity?.mode || '').trim().toLowerCase() === POSTPROD_NET_BROKER
          ? String(postprodConnectivity?.hubUrl || '').trim()
          : String(postprodConnectivity?.hubHost || '').trim();
      setPostprodConnectivityMsgType('error');
      setPostprodConnectivityMsg(
        t('welcome.postprod.connectivity.test.fail', { target: fallbackTarget || 'hub' })
      );
    } finally {
      setPostprodConnectivityTesting(false);
    }
  }

  const cleanedProjectRoots = normalizeProjectRoots(projectRoots);
  const selectableScanCount = projectScanResults.filter((it) => !it.exists).length;
  const allSelectableSelected =
    selectableScanCount > 0 &&
    projectScanResults.every((it) => it.exists || it.selected);
  const visibleScanResults = hideImportedProjects
    ? projectScanResults.filter((it) => !it.exists)
    : projectScanResults;
  const fabSelectedCount = React.useMemo(() => {
    if (!fabPreviewItems.length) return 0;
    let count = 0;
    for (const item of fabPreviewItems) {
      const key = normalizeUid(item?.uid);
      if (key && fabSelection[key]) count += 1;
    }
    return count;
  }, [fabPreviewItems, fabSelection]);
  const fabSelectableCount = React.useMemo(() => {
    if (!fabPreviewItems.length) return 0;
    let count = 0;
    for (const item of fabPreviewItems) {
      if (normalizeUid(item?.uid)) count += 1;
    }
    return count;
  }, [fabPreviewItems]);
  const fabAllSelected =
    fabSelectableCount > 0 && fabSelectedCount === fabSelectableCount;
  const fabHasPreview = fabPreviewItems.length > 0;
  const fabShowControls = fabHasPreview || fabImporting;
  const fabShowImportProgress = fabImporting;
  const fabRemainingCount = Math.max(fabImportTotal - fabImportDone, 0);
  const fabCountLabel = fabShowImportProgress
    ? t('resources.fabImport.importCount', {
        imported: fabImportDone,
        total: fabImportTotal,
      })
    : t('resources.fabImport.selectionCount', {
        selected: fabSelectedCount,
        total: fabSelectableCount,
      });
  const fabRemainingLabel = fabShowImportProgress
    ? t('resources.fabImport.remainingCount', { count: fabRemainingCount })
    : '';
  const fabPreviewNewItems = React.useMemo(() => (
    fabPreviewItems.filter((item) => normalizeFabPreviewStatus(item) === 'new')
  ), [fabPreviewItems]);
  const fabPreviewUpdatedItems = React.useMemo(() => (
    fabPreviewItems.filter((item) => normalizeFabPreviewStatus(item) === 'modified')
  ), [fabPreviewItems]);

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
          <div key={key || `fab-${idx}`} className="uu-card uu-row" style={{ alignItems: 'center' }}>
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
            <div className="uu-row uu-row-gap4" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
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
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <h3 className="uu-h3 uu-block-title">
            {t('config.commonTitle')}
          </h3>
        </div>

        <div className="uu-row" style={{ alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px', minWidth: '300px' }}>
            {/* Langue de l'interface */}
            <div className="uu-grid-field uu-maxw-420">
              <label className="uu-label">
                {t('config.lang.label')}
              </label>
              <select
                className="uu-select"
                value={lang}
                onChange={handleLangChange}
              >
                <option value="fr">{t('common.lang.fr')}</option>
                <option value="en">{t('common.lang.en')}</option>
              </select>
            </div>

            {/* Rafraîchissement */}
            <div className="uu-grid-field uu-maxw-420 mt-12">
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

            {!isPostprodMode ? (
              <div className="uu-grid-field uu-maxw-420 mt-12">
                <label className="uu-label">
                  {t('setup.server.wrcName')}
                </label>
                <input
                  className="uu-input"
                  value={cfg.webRemoteControlName}
                  onChange={(e) =>
                    updateField('webRemoteControlName', e.target.value)
                  }
                />
              </div>
            ) : null}

          </div>

          <div style={{ flex: '1 1 320px', minWidth: '280px' }}>
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
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <h3 className="uu-h3 uu-block-title">{t('config.postprod.sectionTitle')}</h3>
        </div>
        <div className="uu-muted">{t('config.postprod.sectionHint')}</div>
        <div className="uu-grid-field uu-maxw-720 mt-12">
          <label className="uu-label">
            {t('config.renders.outputDir')}
          </label>
          <div className="uu-grid-2" style={{ gridTemplateColumns: '1fr auto' }}>
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
                if (!window.electron?.chooseFolder) return;
                let folder = '';
                try {
                  folder = await window.electron.chooseFolder();
                } catch {}
                const picked = String(folder || '').trim();
                if (!picked) return;
                updateField('renderOutputDir', picked);
              }}
            >
              {t('common.browse')}
            </button>
          </div>
        </div>

      </div>

      <div className="uu-section mt-16">
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <h3 className="uu-h3 uu-block-title">{t('config.unreal.sectionTitle')}</h3>
        </div>

        <label className="uu-check mt-8">
          <input
            type="checkbox"
            checked={!!cfg.showUnrealLaunchButtons}
            onChange={(e) => updateField('showUnrealLaunchButtons', !!e.target.checked)}
          />
          {t('config.unreal.showLaunchButtons')}
        </label>

        <div className="uu-row mt-8">
          <button
            type="button"
            className="uu-btn"
            onClick={() =>
              setVersions((prev) => {
                const next = [...prev, { name: '', path: '' }];
                scheduleSave('versions');
                return next;
              })
            }
          >
            {t('config.unreal.addVersion')}
          </button>
        </div>

        {versions.map((v, idx) => (
          <div
            key={idx}
            className="uu-grid-2 uu-maxw-720 mt-12"
            style={{ gridTemplateColumns: '140px 1fr', gap: '8px' }}
          >
            <div className="uu-grid-field">
              <label className="uu-label">{t('config.unreal.versionLabel')}</label>
              <input
                className="uu-input"
                value={v.name}
                onChange={(e) => {
                  const value = e.target.value;
                  setVersions((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], name: value };
                    return next;
                  });
                  scheduleSave('versions');
                }}
                placeholder="5.7"
              />
            </div>
            <div className="uu-grid-field">
              <label className="uu-label">{t('config.unreal.pathLabel')}</label>
              <div className="uu-grid-2" style={{ gridTemplateColumns: '1fr auto' }}>
                <input
                  className="uu-input"
                  value={v.path}
                  onChange={(e) => {
                    const value = e.target.value;
                  setVersions((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], path: value };
                    return next;
                  });
                  scheduleSave('versions');
                }}
                placeholder="C:\\Program Files\\Epic Games\\UE_5.7\\Engine\\Binaries\\Win64\\UnrealEditor.exe"
              />
                <button
                type="button"
                  className="uu-btn"
                  onClick={async () => {
                    if (!window.electron?.openExecutable) return;
                    let path = '';
                    try {
                      path = await window.electron.openExecutable({
                        defaultPath: String(v?.path || '').trim(),
                      });
                    } catch {}
                  if (!path) return;
                  const trimmed = String(path).trim();
                  setVersions((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], path: trimmed };
                    return next;
                  });
                  scheduleSave('versions');
                }}
              >
                {t('common.browse')}
              </button>
            </div>
            </div>
            <div className="uu-row wrap">
              <button
                type="button"
                className="uu-btn"
                onClick={() => {
                  setVersions((prev) => prev.filter((_, i) => i !== idx));
                  scheduleSave('versions');
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}

      </div>

      {canManageProjects ? (
      <div className="uu-section mt-16">
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <h3 className="uu-h3 uu-block-title">
            {t('setup.server.projectRoots.title')}
          </h3>
        </div>

        <div className="uu-row uu-gap-8">
          <button
            type="button"
            className="uu-btn"
            onClick={() => {
              setProjectRoots((prev) => [...prev, '']);
              scheduleSave('projects');
            }}
          >
            {t('setup.server.projectRoots.add')}
          </button>
          <label className="uu-check" style={{ alignItems: 'center' }}>
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
          {projectScanResults.filter((it) => it.selected && !it.exists).length > 0 ? (
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
          {projectScanResults.length > 0 ? (
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
          <div className="uu-muted mt-8">
            {t('setup.server.projectRoots.empty')}
          </div>
        ) : (
          projectRoots.map((root, idx) => (
            <div key={`project-root-${idx}`} className="uu-grid-field mt-8">
              <label className="uu-label w-160">
                {t('setup.server.projectRoots.pathLabel')}
              </label>
              <div className="uu-grid-2" style={{ gridTemplateColumns: '1fr auto auto' }}>
                <input
                  className="uu-input"
                  value={root}
                  onChange={(e) => {
                    const value = e.target.value;
                  setProjectRoots((prev) => {
                    const next = [...prev];
                    next[idx] = value;
                    return next;
                  });
                    scheduleSave('projects');
                  }}
                  placeholder="D:\\Unreal_Projects"
                />
                <button
                  type="button"
                  className="uu-btn"
                  onClick={async () => {
                    if (!window.electron?.chooseFolder) return;
                    let folder = '';
                    try {
                      folder = await window.electron.chooseFolder();
                    } catch {}
                    const picked = String(folder || '').trim();
                    if (!picked) return;
                    setProjectRoots((prev) => {
                      const next = [...prev];
                      next[idx] = picked;
                      return next;
                    });
                    scheduleSave('projects');
                  }}
                >
                  {t('common.browse')}
                </button>
                <button
                  type="button"
                className="uu-btn"
                onClick={() => {
                  setProjectRoots((prev) => prev.filter((_, i) => i !== idx));
                  scheduleSave('projects');
                }}
              >
                {t('common.delete')}
              </button>
              </div>
            </div>
          ))
        )}

        {projectScanResults.length > 0 ? (
          <>
            <div className="uu-row uu-gap-8 mt-12">
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
              <label className="uu-check" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!hideImportedProjects}
                  onChange={(e) => setHideImportedProjects(!!e.target.checked)}
                />
                {t('setup.server.projectRoots.hideImported')}
              </label>
            </div>
            <div className="uu-list mt-8">
              {visibleScanResults.map((it, idx) => {
                const key = normalizePathKey(it.uprojectPath || it.name || String(idx));
                return (
                  <div key={key} className="uu-card uu-row" style={{ alignItems: 'center' }}>
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
                    <div className="uu-col" style={{ gap: '4px' }}>
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
      ) : null}

      {canViewResources ? (
      <div className="uu-section mt-16">
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
            {t('config.resources.title')}
          </h3>
        </div>

        <label className="uu-check">
          <input
            type="checkbox"
            checked={!!cfg.fabResourcesEnabled}
            onChange={(e) => updateField('fabResourcesEnabled', !!e.target.checked)}
          />
          {t('config.resources.enabled')}
        </label>

        <div className="uu-row mt-12">
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
          <div className="uu-row uu-row-nowrap mt-8">
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
          <div className="uu-row mt-8">
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
                <strong className="uu-block-title mt-8">
                  {t('resources.fabImport.newBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewNewItems)}
              </>
            ) : null}
            {fabPreviewUpdatedItems.length > 0 ? (
              <>
                <strong className="uu-block-title mt-8">
                  {t('resources.fabImport.updatedBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewUpdatedItems)}
              </>
            ) : null}
          </>
        ) : null}

        {fabRemoteImportMsg ? (
          <div className={`uu-msg ${fabRemoteImportMsgType || 'info'} mt-8`}>
            {fabRemoteImportMsg}
          </div>
        ) : null}

      </div>
      ) : null}

    </div>
  );
}
