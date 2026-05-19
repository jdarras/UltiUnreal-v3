// app/screens/synchronisation.jsx
import React from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';

import {
  getHosts,
  getProjects,
  postHost,
  checkSync,
  copySync,
  updateSyncIgnore,
  getSyncIgnoreForHost,
  getCommon,
} from '../utils/agent';
import { colorClass } from '../utils/colors';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';
import {
  safeStr,
  normalizeRel,
  normalizeKey,
  normalizeRenderScopeProjects,
  normalizeRenderCopyProjects,
  getSyncStatusLabel,
  getSyncStatusToneClass,
  getRenderProjectStatusLabel,
  getRenderProjectStatusClass,
  getRenderCopyStatusLabel,
  getRenderCopyStatusClass,
  buildSyncDestinationInfo,
} from './synchronisationHelpers';
import {
  SyncHostHeader,
  SyncWarnCard,
  SyncDiffSection,
} from './synchronisationSections';

const SYNC_SECTION_TITLE_STYLE = { marginBottom: '12px' };
const SYNC_DEST_COL_STYLE = { flex: '1 1 260px' };
const SYNC_LAST_COPY_HINT_STYLE = { marginBottom: '8px' };
const SYNC_RENDER_PROJECT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px,1.4fr) minmax(120px,0.9fr) minmax(90px,0.8fr) minmax(120px,1fr) 56px 56px 56px minmax(220px,1.8fr)',
  columnGap: '10px',
  rowGap: '8px',
  alignItems: 'center',
};
const SYNC_DIFF_TYPES = ['added', 'modified', 'removed'];

export default function SynchronisationScreen() {
  const identity = readIdentity();
  const role = identity?.role || 'server';
  const appMode = String(identity?.mode || '').trim().toLowerCase();
  const isRenderMode = appMode === 'postprod' || appMode === 'render';
  const localIp = String(identity?.localIp || '').trim();
  const lang = identity?.lang || 'fr';
  const t = React.useMemo(() => createT(lang), [lang]);
  const syncScopeOptions = React.useMemo(
    () => (isRenderMode ? { scope: 'render_auto', direction: 'auto' } : null),
    [isRenderMode]
  );
  const LS_SYNC_ROOT = 'uu_client_syncRoot';

  const readCachedRoot = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_ROOT);
      return typeof raw === 'string' ? raw : '';
    } catch {
      return '';
    }
  }, []);

  const writeCachedRoot = React.useCallback((val) => {
    try {
      localStorage.setItem(LS_SYNC_ROOT, String(val || ''));
    } catch {}
  }, []);

  // -------- États CLIENT --------
  const [clientRoot, setClientRoot] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_ROOT);
      return typeof raw === 'string' ? raw : '';
    } catch {
      return '';
    }
  });
  const [clientSyncEnabled, setClientSyncEnabled] = React.useState(false);
  const [clientInitDone, setClientInitDone] = React.useState(false);
  const clientSaveTimer = React.useRef(null);
  const saveReady = React.useRef(false);

  // -------- États communs --------
  const [message, setMessage] = React.useState(null);
  const messageTimerRef = React.useRef(null);
  React.useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
        messageTimerRef.current = null;
      }
    };
  }, []);
  const scheduleMessageClear = React.useCallback((delayMs = 2000) => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
      messageTimerRef.current = null;
    }, timeoutMs);
  }, []);
  const {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  } = usePromiseConfirmDialog();

  const [hosts, setHosts] = React.useState([]);
  const [hostsLoading, setHostsLoading] = React.useState(false);
  const [hostsError, setHostsError] = React.useState('');

  const [activeName, setActiveName] = React.useState('');
  const [projectsData, setProjectsData] = React.useState(null);
  const loadingProjects = !projectsData;
  const editActiveProject = React.useCallback(() => {
    const pid = String(projectsData?.activeId || '').trim();
    if (!pid) return;
    if (window.goToProjectDetail) {
      window.goToProjectDetail(pid);
    }
  }, [projectsData]);

  const [syncStatus, setSyncStatus] = React.useState({});
  const [syncDetails, setSyncDetails] = React.useState({});
  const [syncCopyProjects, setSyncCopyProjects] = React.useState({});
  const [serverAutoCheckDone, setServerAutoCheckDone] = React.useState(false);
  const [quietMode, setQuietMode] = React.useState(false);

  const [syncDiffs, setSyncDiffs] = React.useState({});
  const [diffFoldState, setDiffFoldState] = React.useState({});
  const [syncSelection, setSyncSelection] = React.useState({});

  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
    confirmLabel: confirmOkLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  });
  const confirmDialogNode = (
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
      overlayZIndex={12000}
    />
  );

  // -------- Chargement initial des hosts (tous rôles) --------
  React.useEffect(() => {
    let cancelled = false;

    async function loadHosts() {
      setHostsLoading(true);
      setHostsError('');
      try {
        const raw = await getHosts();
        if (cancelled) return;

        const list = (Array.isArray(raw) ? raw : []).filter(
          (h) =>
            h &&
            typeof h === 'object' &&
            safeStr(h.ip || h.address, '')
        );
        setHosts(list);
      } catch (e) {
        if (!cancelled) {
          setHostsError(String(e?.message || e));
        }
      } finally {
        if (!cancelled) {
          setHostsLoading(false);
        }
      }
    }

    loadHosts();

    return () => {
      cancelled = true;
    };
  }, []);

  // Quiet mode : réduit les rafraîchissements périodiques
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getCommon().catch(() => ({}));
        if (cancelled) return;
        if (typeof c?.quietMode === 'boolean') {
          setQuietMode(c.quietMode);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // -------- Rafraîchissement périodique côté SERVEUR --------
  React.useEffect(() => {
    if (role !== 'server') return;
    if (quietMode) return;

    let cancelled = false;
    let timer = null;

    async function tick() {
      try {
        const [hostsRaw, projRaw] = await Promise.all([
          getHosts().catch(() => []),
          getProjects({ light: true }).catch(() => null),
        ]);
        if (cancelled) return;

        // Hosts
        const list = (Array.isArray(hostsRaw) ? hostsRaw : []).filter(
          (h) =>
            h &&
            typeof h === 'object' &&
            safeStr(h.ip || h.address, '')
        );
        setHosts(list);

        // Projects
        if (projRaw && typeof projRaw === 'object') {
          let name = '';
          if (typeof projRaw.activeName === 'string') {
            name = projRaw.activeName;
          } else if (Array.isArray(projRaw.projects)) {
            const activeProj = projRaw.projects.find(
              (p) => p && (p.active || p.isActive)
            );
            if (activeProj && typeof activeProj.name === 'string') {
              name = activeProj.name;
            }
          }

          const normalized = {
            activeId:
              typeof projRaw.activeId === 'string' ||
              typeof projRaw.activeId === 'number'
                ? projRaw.activeId
                : undefined,
            activeName: name || '',
            projects: Array.isArray(projRaw.projects)
              ? projRaw.projects
              : [],
            activeByHost:
              projRaw.activeByHost &&
              typeof projRaw.activeByHost === 'object'
                ? projRaw.activeByHost
                : {},
          };

          setProjectsData(normalized);
          setActiveName(normalized.activeName || '');
        }
      } catch {
        // on garde l'état précédent en cas d'erreur
      }
    }

    // premier tick immédiat
    tick();
    // puis refresh régulier
    timer = setInterval(tick, 5000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [role, quietMode]);

  // -------- Vérification automatique à l'arrivée sur la page (serveur) --------
  React.useEffect(() => {
    if (role !== 'server') return;
    if (serverAutoCheckDone) return;
    if (!hosts || hosts.length === 0) return;

    // IP de la machine serveur (celle où tourne UltiUnreal)
    const localHost = hosts.find((h) => h && localIp && safeStr(h.ip || h.address, '') === localIp) || hosts[0];
    const serverIp = safeStr(localHost?.ip || localHost?.address, '') || localIp;

    // On ne cible que les machines clientes (pas la locale)
    const clientHosts = (hosts || []).filter((h) => {
      if (!h || typeof h !== 'object') return false;

      const ip = safeStr(h.ip || h.address, '');
      if (!ip) return false;

      // On exclut aussi toute entrée dont l'IP = IP locale
      if (serverIp && ip === serverIp) return false;

      return true;
    });

    if (clientHosts.length === 0) return;

    // On marque pour ne pas relancer à chaque refresh de hosts
    setServerAutoCheckDone(true);

    // On lance "Vérifier" pour chaque machine cliente
    clientHosts.forEach((h) => {
      const ip = safeStr(h.ip || h.address, '');
      if (!ip) return;
      handleCheckHost(ip);
    });
  }, [role, hosts, localIp, serverAutoCheckDone]);

  // -------- Initialisation côté client (pré-remplissage) --------
  React.useEffect(() => {
    if (role !== 'client') return;
    if (clientInitDone) return;
    if (!hosts || hosts.length === 0) return;

    let preferred = hosts.find(
      (h) =>
        h &&
        String(safeStr(h.ip || h.address, '')).trim() === localIp
    );
    if (!preferred) preferred = hosts[0];

    if (preferred) {
      const root =
        typeof preferred.syncRoot === 'string'
          ? preferred.syncRoot
          : '';
      const enabled =
        typeof preferred.syncEnabled === 'boolean'
          ? preferred.syncEnabled
          : !!preferred.syncRoot; // fallback : si un dossier existe déjà, on considère sync activée

      setClientRoot(root);
      writeCachedRoot(root);
      setClientSyncEnabled(enabled);
    }

    // Aucun host trouvé mais un cache existe : on pré-remplit quand même
    if (!preferred) {
      const cached = readCachedRoot();
      if (cached) {
        setClientRoot(cached);
      }
    }

    setClientInitDone(true);
  }, [role, hosts, clientInitDone, localIp, readCachedRoot, writeCachedRoot]);

  // Auto-save client (syncRoot + syncEnabled) dès qu'un changement est fait après init
  React.useEffect(() => {
    if (role !== 'client') return;
    if (!clientInitDone) return;
    if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    if (!saveReady.current) {
      saveReady.current = true;
      return;
    }
    clientSaveTimer.current = setTimeout(() => {
      handleSaveClient();
    }, 600);
    return () => {
      if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    };
  }, [clientRoot, clientSyncEnabled, role, clientInitDone]);

  // -------- Actions côté client --------
  async function handleSaveClient() {
    const root = String(clientRoot || '').trim();
    const hostExists = (hosts || []).some(
      (h) => h && String(safeStr(h.ip || h.address, '')).trim() === localIp
    );

    if (!hostExists) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.hostMissingOnServer'),
      });
      scheduleMessageClear(3000);
      return;
    }

    // Si la synchro est activée pour cette machine, on exige un dossier racine
    if (clientSyncEnabled && !root) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.missingRoot'),
      });
      scheduleMessageClear(2000);
      return;
    }

    if (!localIp) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.noLocalIp'),
      });
      scheduleMessageClear(3000);
      return;
    }

    try {
      // On ne change plus le mode ici : seulement le dossier racine
      await postHost(localIp, {
        syncRoot: root,
      });
      writeCachedRoot(root);

      setMessage({
        type: 'ok',
        text: t('sync.client.msg.saved'),
      });
    } catch (e) {
      setMessage({
        type: 'error',
        text: `${t('sync.client.msg.saveErrorPrefix')}${e.message || e}`,
      });
    }

    // nettoyage du message après un délai (succès : 2s, erreur : 4s)
    const delay = (clientSyncEnabled && !root) ? 4000 : 2000;
    scheduleMessageClear(delay);
  }

  async function handleTestClient() {
    const hasHosts = hosts && hosts.length > 0;

    const localHostClient = hasHosts
      ? hosts.find(
          (h) =>
            h &&
            String(safeStr(h.ip || h.address, '')).trim() === localIp
        ) || hosts[0]
      : null;

    if (!localHostClient || !localIp) {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.noLocalHost'),
      });
      scheduleMessageClear(4000);
      return;
    }

    const root = String(clientRoot || '').trim();
    if (!root) {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.mustSetRoot'),
      });
      scheduleMessageClear(4000);
      return;
    }

    try {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.testRunning'),
      });

      const res = await checkSync(localIp, syncScopeOptions || undefined);

      if (
        res &&
        (res.ok ||
          res.status === 'in_sync' ||
          res.status === 'desync')
      ) {
        const added = Array.isArray(res?.added)
          ? res.added.length
          : Number(res?.addedCount ?? 0);
        const modified = Array.isArray(res?.modified)
          ? res.modified.length
          : Number(res?.modifiedCount ?? 0);
        const removed = Array.isArray(res?.removed)
          ? res.removed.length
          : Number(res?.deletedCount ?? 0);

        setMessage({
          type: 'ok',
          text: t('sync.client.msg.testOkCounts')
            .replace('{added}', added)
            .replace('{modified}', modified)
            .replace('{removed}', removed),
        });
      } else {
        setMessage({
          type: 'error',
          text: t('sync.client.msg.testError'),
        });
      }

      scheduleMessageClear(4000);
    } catch (e) {
      setMessage({
        type: 'error',
        text: `${t('sync.client.msg.testErrorPrefix')}${e.message || e}`,
      });
      scheduleMessageClear(5000);
    }
  }

  async function handleBrowseClient() {
    // Utiliser l’API exposée par preload
    if (
      !window.electron ||
      typeof window.electron.chooseFolder !== 'function'
    ) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.chooseFolderUnavailable'),
      });
      scheduleMessageClear(2500);
      return;
    }

    try {
      const folder = await window.electron.chooseFolder();
      if (!folder) {
        // utilisateur a annulé : ne rien dire, garder la valeur
        return;
      }

      setClientRoot(folder);
      writeCachedRoot(folder);
      // Choisir un dossier active la sync locale
      setClientSyncEnabled(true);
    } catch {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.chooseFolderError'),
      });
      scheduleMessageClear(2500);
    }
  }

  // -------- Action côté serveur : Vérifier une machine --------
  async function handleCheckHost(ip) {
    if (!ip) return;

    setSyncStatus((prev) => ({ ...prev, [ip]: 'checking' }));
    setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
    setSyncDiffs((prev) => ({
      ...prev,
      [ip]: { added: [], modified: [], removed: [], renderProjects: [] },
    }));
    setSyncSelection((prev) => ({
      ...prev,
      [ip]: { added: {}, modified: {}, removed: {} },
    }));

    try {
      const checkPromise = isRenderMode
        ? checkSync(ip, syncScopeOptions || undefined)
        : checkSync(ip);
      const [res, ignoredList] = await Promise.all([
        checkPromise,
        isRenderMode
          ? Promise.resolve([])
          : getSyncIgnoreForHost(ip).catch(() => []),
      ]);
      const status = res && (res.status || res.state);
      const diffEffective =
        typeof res?.effectiveDiffCount === 'number'
          ? res.effectiveDiffCount
          : typeof res?.diffCount === 'number'
          ? res.diffCount
          : null;
      const diffRaw =
        typeof res?.rawDiffCount === 'number'
          ? res.rawDiffCount
          : typeof res?.diffCount === 'number'
          ? res.diffCount
          : null;
      const renderProjects = isRenderMode
        ? normalizeRenderScopeProjects(res)
        : [];
      const added = isRenderMode
        ? []
        : (Array.isArray(res?.added) ? res.added : []);
      const modified = isRenderMode
        ? []
        : (Array.isArray(res?.modified) ? res.modified : []);
      const removed = isRenderMode
        ? []
        : (Array.isArray(res?.removed) ? res.removed : []);

      setSyncDiffs((prev) => ({
        ...prev,
        [ip]: { added, modified, removed, renderProjects },
      }));

      const ignoreSet = new Set(
        (ignoredList || [])
          .map((s) => normalizeKey(s))
          .filter(Boolean)
      );

      const makeSelectionMap = (list) =>
        list.reduce(
          (m, rel) => ({
            ...m,
            [rel]: isRenderMode
              ? true
              : (ignoreSet.has(normalizeKey(rel)) ? false : true),
          }),
          {}
        );

      setSyncSelection((prev) => ({
        ...prev,
        [ip]: {
          added: makeSelectionMap(added),
          modified: makeSelectionMap(modified),
          removed: makeSelectionMap(removed),
        },
      }));

      if (status === 'in_sync') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'in_sync' }));
        const displayDiff = diffRaw;
        const diffText =
          displayDiff === 0
            ? t('sync.server.msg.checkNoDiff')
            : displayDiff != null
            ? t('sync.server.msg.checkWithDiff').replace(
                '{diff}',
                String(displayDiff)
              )
            : t('sync.server.msg.checkResult');
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: isRenderMode && Number(res?.projectCount || 0) > 0
            ? `${diffText} (${Number(res?.projectCount || 0)} projet(s))`
            : diffText,
        }));
      } else if (status === 'desync') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'desync' }));
        const displayDiff = diffEffective != null ? diffEffective : diffRaw;
        const diffText =
          displayDiff != null
            ? t(
                'sync.server.msg.checkDesyncWithDiff'
              ).replace('{diff}', String(displayDiff))
            : t('sync.server.msg.checkDesyncGeneric');
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: isRenderMode && Number(res?.projectCount || 0) > 0
            ? `${diffText} (${Number(res?.projectCount || 0)} projet(s))`
            : diffText,
        }));
      } else if (status === 'no_root') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'no_root' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]:
            res?.message ||
            t('sync.server.msg.checkNoRoot'),
        }));
      } else if (status === 'no_projects') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'in_sync' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: res?.message || 'Aucun projet en rendu automatique.',
        }));
      } else if (status === 'no_source') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'desync' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: res?.message || 'Source de verite absente pour au moins un projet.',
        }));
      } else if (status === 'error') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]: res?.message || t('sync.server.msg.checkErrorGeneric'),
        }));
      } else {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'unknown' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]:
            res?.message ||
            t('sync.server.msg.checkUnknown'),
        }));
      }
    } catch (e) {
      setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
      setSyncDetails((prev) => ({
        ...prev,
        [ip]:
          e?.message ||
          t('sync.server.msg.checkErrorGeneric'),
      }));
      setSyncDiffs((prev) => ({
        ...prev,
        [ip]: { added: [], modified: [], removed: [], renderProjects: [] },
      }));
      setSyncSelection((prev) => ({
        ...prev,
        [ip]: { added: {}, modified: {}, removed: {} },
      }));
    }
  }

  // -------- Gestion des sélections de fichiers (serveur) --------
  async function toggleFileSelection(ip, type, rel) {
    if (isRenderMode) return;
    if (!ip || !type || !rel) return;

    const current = syncSelection[ip] || {
      added: {},
      modified: {},
      removed: {},
    };
    const original = {
      added: { ...(current.added || {}) },
      modified: { ...(current.modified || {}) },
      removed: { ...(current.removed || {}) },
    };

    const next = {
      added: { ...original.added },
      modified: { ...original.modified },
      removed: { ...original.removed },
    };

    const map = next[type] || {};
    const prevVal = map[rel] !== undefined ? map[rel] : true;
    const nextVal = !prevVal;
    map[rel] = nextVal;

    const norm = normalizeRel(rel);
    const addList = nextVal === false ? [norm] : [];
    const removeList = nextVal === false ? [] : [norm];

    setSyncSelection((prev) => ({
      ...prev,
      [ip]: {
        ...next,
        [type]: map,
      },
    }));

    if (addList.length || removeList.length) {
      console.debug('[sync] toggle selection -> updateSyncIgnore', ip, { addList, removeList });
      try {
        const resp = await updateSyncIgnore(ip, addList, removeList);
        if (resp && resp.ok === false) {
          throw new Error(resp.message || 'updateSyncIgnore failed');
        }
      } catch (e) {
        console.warn('updateSyncIgnore toggleFileSelection failed', e);
        // rollback
        setSyncSelection((prev) => ({ ...prev, [ip]: original }));
        setMessage({
          type: 'error',
          text: `${t('sync.server.msg.checkErrorGeneric')} (${e?.message || e})`,
        });
        scheduleMessageClear(2000);
      }
    }
  }

  function toggleDiffSection(ip, type) {
    if (!ip || !type) return;

    setDiffFoldState((prev) => {
      const current =
        prev[ip] || {
          added: true,
          modified: true,
          removed: true,
        };
      return {
        ...prev,
        [ip]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  }

  async function bulkSelectDiff(ip, type, check) {
    if (isRenderMode) return;
    if (!ip || !type) return;

    const current = syncSelection[ip] || {
      added: {},
      modified: {},
      removed: {},
    };
    const original = {
      added: { ...(current.added || {}) },
      modified: { ...(current.modified || {}) },
      removed: { ...(current.removed || {}) },
    };

    const diffs = syncDiffs[ip] || {};
    const list =
      type === 'added'
        ? diffs.added || []
        : type === 'modified'
        ? diffs.modified || []
        : diffs.removed || [];

    const nextType = { ...(current[type] || {}) };
    const addList = [];
    const removeList = [];

    for (const rel of list) {
      const prevVal = nextType[rel] !== undefined ? nextType[rel] : true;
      const nextVal = !!check;
      nextType[rel] = nextVal;
      if (prevVal !== nextVal) {
        const norm = normalizeRel(rel);
        if (nextVal === false) addList.push(norm);
        else removeList.push(norm);
      }
    }

    const nextSelection = {
      added:
        type === 'added'
          ? nextType
          : { ...(current.added || {}) },
      modified:
        type === 'modified'
          ? nextType
          : { ...(current.modified || {}) },
      removed:
        type === 'removed'
          ? nextType
          : { ...(current.removed || {}) },
    };

    setSyncSelection((prev) => ({
      ...prev,
      [ip]: nextSelection,
    }));

    if (addList.length || removeList.length) {
      try {
        const resp = await updateSyncIgnore(ip, addList, removeList);
        if (resp && resp.ok === false) {
          throw new Error(resp.message || 'updateSyncIgnore failed');
        }
      } catch (e) {
        console.warn('updateSyncIgnore bulkSelectDiff failed', e);
        setSyncSelection((prev) => ({ ...prev, [ip]: original }));
        setMessage({
          type: 'error',
          text: `${t('sync.server.msg.checkErrorGeneric')} (${e?.message || e})`,
        });
        scheduleMessageClear(2000);
      }
    }
  }

  // -------- Action côté serveur : Copier le projet vers une machine --------
  async function handleCopyHost(ip) {
    if (!ip) return;
    if (isRenderMode) {
      setSyncStatus((prev) => ({ ...prev, [ip]: 'copying' }));
      setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
      setMessage({
        type: 'info',
        text: t('sync.server.msg.copyStart').replace('{ip}', String(ip)),
      });
      try {
        const res = await copySync(ip, null, syncScopeOptions || undefined);
        if (!res || res.ok === false) {
          const msg =
            (res && (res.message || res.error)) ||
            t('sync.server.msg.copyError');
          setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
          setSyncDetails((prev) => ({ ...prev, [ip]: msg }));
          setMessage({ type: 'error', text: msg });
          scheduleMessageClear(4000);
          return;
        }
        const copyRows = normalizeRenderCopyProjects(res);
        setSyncCopyProjects((prev) => ({
          ...prev,
          [ip]: {
            at: new Date().toISOString(),
            rows: copyRows,
          },
        }));
        const projectCount = Number(res?.projectCount || 0);
        const summary = `Sync rendu OK: ${projectCount} projet(s), ${Number(res?.addedCount ?? 0)} nouveaux, ${Number(res?.modifiedCount ?? 0)} modifies, ${Number(res?.deletedCount ?? 0)} supprimes.`;
        setMessage({ type: 'ok', text: summary });
        scheduleMessageClear(3500);
        await handleCheckHost(ip);
      } catch (e) {
        const detail = String(e?.message || t('sync.server.msg.copyErrorGeneric'));
        setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
        setSyncDetails((prev) => ({ ...prev, [ip]: detail }));
        setMessage({
          type: 'error',
          text: `${t('sync.server.msg.copyErrorPrefix')}${detail}`,
        });
        scheduleMessageClear(4000);
      }
      return;
    }

    const diffs = syncDiffs[ip] || {};
    const sel = syncSelection[ip] || {};

    const added = Array.isArray(diffs.added) ? diffs.added : [];
    const modified = Array.isArray(diffs.modified)
      ? diffs.modified
      : [];
    const removed = Array.isArray(diffs.removed)
      ? diffs.removed
      : [];

    // --- MAJ syncIgnore : enregistre les fichiers décochés même si on ne copie rien ---
    try {
      const sel2 = syncSelection[ip] || {};
      const addList = [];

      const lists = [
        { list: sel2.added || {} },
        { list: sel2.modified || {} },
        { list: sel2.removed || {} },
      ];

      lists.forEach(({ list }) => {
        Object.entries(list).forEach(([rel, state]) => {
          const boolState = state !== false; // undefined -> true par défaut
          if (boolState === false) addList.push(normalizeRel(rel));
        });
      });

      if (addList.length > 0) {
        console.debug('[sync] updateSyncIgnore (UI) addList', ip, addList);
        const resp = await updateSyncIgnore(ip, addList, []);
        if (resp && resp.ok === false) {
          throw new Error(resp.message || 'updateSyncIgnore failed');
        }
      }
    } catch (err) {
      console.warn('updateSyncIgnore échoué:', err);
      setMessage({
        type: 'error',
        text: `${t('sync.server.msg.checkErrorGeneric')} (${err?.message || err})`,
      });
      scheduleMessageClear(2000);
      return; // on stoppe pour ne pas diverger entre UI et backend
    }

    const hasDiffs =
      added.length > 0 || modified.length > 0 || removed.length > 0;

    let payload = null;

    if (hasDiffs) {
      const selAdded = sel.added || {};
      const selModified = sel.modified || {};
      const selRemoved = sel.removed || {};

      const toAdd = added.filter((rel) => selAdded[rel] !== false);
      const toMod = modified.filter(
        (rel) => selModified[rel] !== false
      );
      const toRem = removed.filter(
        (rel) => selRemoved[rel] !== false
      );

      // Confirmation avant suppression de fichiers sur la machine cible
      if (toRem.length > 0) {
        const msg =
          toRem.length === 1
            ? `Cette synchronisation va supprimer 1 fichier sur ${ip}. Continuer ?`
            : `Cette synchronisation va supprimer ${toRem.length} fichiers sur ${ip}. Continuer ?`;

        const ok = await requestConfirm(msg);
        if (!ok) {
          // On annule complètement la synchro pour cette machine
          return;
        }
      }

      if (toAdd.length === 0 && toMod.length === 0 && toRem.length === 0) {
        setMessage({
          type: 'info',
          text: t('sync.server.noFilesSelected'),
        });
        scheduleMessageClear(3000);
        return;
      }

      payload = {
        added: toAdd,
        modified: toMod,
        removed: toRem,
      };
    }

    setSyncStatus((prev) => ({ ...prev, [ip]: 'copying' }));
    setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
    setMessage({
      type: 'info',
      text: t('sync.server.msg.copyStart').replace(
        '{ip}',
        String(ip)
      ),
    });

    try {
      // Si payload = null, on garde le comportement actuel (copier tout ce qui diffère)
      const res = await copySync(ip, payload || undefined);

      if (!res || res.ok === false) {
        const msg =
          (res && (res.message || res.error)) ||
          t('sync.server.msg.copyError');

        setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));
        setSyncDetails((prev) => ({ ...prev, [ip]: msg }));
        setMessage({ type: 'error', text: msg });
        scheduleMessageClear(4000);
        return;
      }

      // On recharge la liste des hosts pour refléter les changements éventuels
      try {
        const refreshed = await getHosts();
        const list = (Array.isArray(refreshed) ? refreshed : []).filter(
          (h) =>
            h &&
            typeof h === 'object' &&
            safeStr(h.ip || h.address, '')
        );
        setHosts(list);
      } catch (e) {
        console.warn('getHosts after copy failed', e);
      }

      const summary =
        t('sync.server.msg.copySummary')
          .replace('{added}', Number(res?.addedCount ?? 0))
          .replace('{modified}', Number(res?.modifiedCount ?? 0))
          .replace('{deleted}', Number(res?.deletedCount ?? 0)) ||
        (res && res.summaryText && String(res.summaryText)) ||
        t('sync.server.msg.copyDone');

      setMessage({
        type: 'ok',
        text: summary,
      });
      scheduleMessageClear(3000);

      // Vérification immédiate après copie
      await handleCheckHost(ip);
    } catch (e) {
      setSyncStatus((prev) => ({ ...prev, [ip]: 'error' }));

      let detail = '';
      if (e && typeof e === 'object') {
        const errCode = e.error || e.code || '';
        if (errCode === 'write_error') {
          detail = t('sync.server.msg.copyWriteError');
        } else if (e.message) {
          detail = String(e.message);
        }
      }
      if (!detail) {
        detail = t('sync.server.msg.copyErrorGeneric');
      }

      setSyncDetails((prev) => ({
        ...prev,
        [ip]: detail,
      }));
      setMessage({
        type: 'error',
        text: `${t('sync.server.msg.copyErrorPrefix')}${detail}`,
      });
      scheduleMessageClear(4000);
    }
  }

  // -------- Rendu CLIENT --------
  if (role === 'client') {
    const hasHosts = hosts && hosts.length > 0;

    const localHostClient = hasHosts
      ? hosts.find(
          (h) =>
            h &&
            String(safeStr(h.ip || h.address, '')).trim() === localIp
        ) || hosts[0]
      : null;

    const localHostIpStr = localHostClient
      ? safeStr(
          localHostClient.ip || localHostClient.address,
          ''
        )
      : '';
    const localHostNameStr = localHostClient
      ? safeStr(
          localHostClient.name,
          t('sync.client.thisMachine')
        )
      : '';

    return (
      <div className="uu-page uu-page-compact">
        <p className="uu-page-title">{t('sync.client.title')}</p>
        <p className="uu-page-subtitle">
          {t('sync.client.subtitle')}
        </p>

        <div className="uu-card">
          <div className="uu-field">
            <label className="uu-label">
              {t('sync.client.machineLabel')}
            </label>
            {!hasHosts && (
              <p className="uu-hint">
                {t('sync.client.noHostsHint')}
              </p>
            )}
            {hasHosts && localHostClient && (
              <div className="uu-host-row">
                <span
                  className={`uu-host-dot ${colorClass(
                    localHostClient.color
                  )}`}
                />
                <div className="uu-host-main">
                  <span className="uu-host-name">
                    {localHostNameStr}
                  </span>
                  <span className="uu-host-ip uu-hint">
                    {' '}
                    - {localHostIpStr}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="uu-field">
            <label className="uu-label">
              {t('sync.client.rootLabel')}
            </label>
            <div className="uu-input-row">
              <input
                className="uu-input"
                type="text"
                value={clientRoot}
                onChange={(e) =>
                  setClientRoot(e.target.value)
                }
                placeholder={t(
                  'sync.client.rootPlaceholder'
                )}
              />
              <button
                type="button"
                className="uu-btn"
                onClick={handleBrowseClient}
              >
                {t('sync.client.browse')}
              </button>
            </div>
          </div>

          <div className="uu-buttons-row">
            <button
              type="button"
              className="uu-btn"
              onClick={handleTestClient}
            >
              {t('sync.client.test')}
            </button>
          </div>

          {message && (
            <div className={`uu-msg ${message.type || ''}`}>
              {message.text}
            </div>
          )}
          {confirmDialogNode}
        </div>
      </div>
    );
  }

  // -------- Rendu SERVEUR --------
  if (role === 'server') {
    const localHost = hosts.find(
      (h) => h && localIp && safeStr(h.ip || h.address, '') === localIp
    ) || hosts[0];
    const localHostIp = safeStr(localHost?.ip || localHost?.address, '') || '';

    // 1) On cherche le .uproject dans projects_server.json pour le projet actif
    let sourceUproject = '';

    if (projectsData) {
      const ab = projectsData.activeByHost || {};

      // On tente plusieurs clés possibles pour retrouver le .uproject dans activeByHost
      const keysToTry = [];
      if (projectsData.activeId) keysToTry.push(String(projectsData.activeId));

      if (ab && typeof ab === 'object' && keysToTry.length > 0) {
        for (const hostKey of Object.keys(ab)) {
          const perHost = ab[hostKey];
          if (!perHost || typeof perHost !== 'object') continue;
          for (const k of keysToTry) {
            const val = perHost[k];
            if (typeof val === 'string' && val.toLowerCase().endsWith('.uproject')) {
              sourceUproject = val;
              break;
            }
          }
          if (sourceUproject) break;
        }
      }

      // b) Fallback : recherche par activeId ou activeName dans la liste projects
      if (!sourceUproject && Array.isArray(projectsData.projects)) {
        let activeProj = null;
        if (projectsData.activeId) {
          activeProj = projectsData.projects.find((p) => p && String(p.id || '') === String(projectsData.activeId));
        }
        if (!activeProj && projectsData.activeName) {
          const ref = String(projectsData.activeName).trim().toLowerCase();
          activeProj = projectsData.projects.find((p) => p && String(p.name || '').trim().toLowerCase() === ref);
        }
        if (activeProj) {
          if (typeof activeProj.uproject === 'string' && activeProj.uproject.toLowerCase().endsWith('.uproject')) {
            sourceUproject = activeProj.uproject;
          } else {
            // On cherche toute propriété chaîne qui finit par .uproject
            for (const key of Object.keys(activeProj)) {
              const val = activeProj[key];
              if (typeof val === 'string' && val.toLowerCase().endsWith('.uproject')) {
                sourceUproject = val;
                break;
              }
            }
          }
        }
      }
    }

    let sourceDir = '';
    let sourceProjectName = '';

    if (sourceUproject) {
      const norm = sourceUproject.replace(/\//g, '\\');
      const idx = norm.lastIndexOf('\\');
      if (idx > 0) {
        sourceDir = norm.slice(0, idx);
        const tail = norm.slice(idx + 1);
        if (tail.toLowerCase().endsWith('.uproject')) {
          const parts = tail.split('.');
          sourceProjectName = parts[0] || '';
        } else {
          sourceProjectName = tail;
        }
      }
    } else if (
      projectsData &&
      Array.isArray(projectsData.projects)
    ) {
      const activeProj =
        projectsData.projects.find(
          (p) => p && (p.active || p.isActive)
        ) || null;
      if (activeProj) {
        if (typeof activeProj.uproject === 'string') {
          const norm = activeProj.uproject.replace(/\//g, '\\');
          const idx = norm.lastIndexOf('\\');
          if (idx > 0) {
            sourceDir = norm.slice(0, idx);
          }
          if (activeProj.name) {
            sourceProjectName = activeProj.name;
          } else if (idx > 0) {
            const tail = norm.slice(idx + 1);
            if (tail.toLowerCase().endsWith('.uproject')) {
              const parts = tail.split('.');
              sourceProjectName = parts[0] || '';
            } else {
              sourceProjectName = tail;
            }
          }
        } else if (activeProj.name) {
          sourceProjectName = activeProj.name;
        }
      }
    }

    const displayProjectName =
      loadingProjects
        ? t('sync.server.activeProjectLoading')
        : (activeName || sourceProjectName || '');

    // IP de la machine serveur (celle où tourne UltiUnreal)
    const serverIp = localIp || localHostIp;

    // On ne liste que les machines clientes (pas la machine locale)
    const clientHosts = (hosts || []).filter((h) => {
      if (!h || typeof h !== 'object') return false;

      const ip = safeStr(h.ip || h.address, '');
      if (!ip) return false;

      // On exclut aussi toute entrée dont l'IP = IP locale
      if (serverIp && ip === serverIp) return false;

      return true;
    });

    const hasHosts = clientHosts.length > 0;

    return (
      <div className="uu-page uu-page-compact">
        {!isRenderMode && (
          <div className="uu-section">
            <div className="uu-kv">
              {projectsData?.activeId ? (
                <button className="uu-btn" onClick={editActiveProject}>
                  {t('projects.actions.edit')}
                </button>
              ) : null}
              <span className="uu-k">
                {t('sync.server.activeProjectLabel')}
              </span>
              <span className="uu-v">
                {displayProjectName ? (
                  <>
                    {displayProjectName}{' '}
                    {projectsData?.activeId ? (
                      <span className="uu-id-tag uu-muted">
                        [{projectsData.activeId}]
                      </span>
                    ) : null}
                  </>
                ) : (
                  t('sync.server.activeProjectUnknown')
                )}
              </span>
            </div>
          </div>
        )}

        <div className="uu-card">
          {!isRenderMode && (
            <p>
              <strong>
                {t('sync.server.sourceDirLabel')}&nbsp;
              </strong>{' '}
              {sourceDir ? (
                <code>{sourceDir}</code>
              ) : (
                <span>
                  {t('sync.server.sourceDirUnknown')}
                </span>
              )}
            </p>
          )}

          {hostsLoading && (
            <p className="uu-hint">
              {t('sync.server.loadingHosts')}
            </p>
          )}

          {!hostsLoading && hostsError && (
            <div className="uu-msg error">
              {hostsError}
            </div>
          )}

          {!hostsLoading && !hostsError && !hasHosts && (
            <p className="uu-hint">
              {t('sync.server.noClientHosts')}
            </p>
          )}

          {!hostsLoading && !hostsError && hasHosts && (() => {
            const groupedHosts = clientHosts.reduce((acc, h) => {
              if (!h) return acc;
              if (h.renderAvailability === 'excluded' || h.eligible === false) {
                acc.excludedHosts.push(h);
              } else if (h.syncEnabled) {
                acc.syncHosts.push(h);
              } else {
                acc.localProjectHosts.push(h);
              }
              return acc;
            }, { excludedHosts: [], localProjectHosts: [], syncHosts: [] });
            const { excludedHosts, localProjectHosts, syncHosts } = groupedHosts;

            const renderSyncCard = (h, idx) => {
              const ip = safeStr(h.ip || h.address, `#${idx + 1}`);
              const syncRoot = typeof h.syncRoot === 'string' ? h.syncRoot : '';
              const uproject = typeof h.uproject === 'string' ? h.uproject : '';
              const destInfo = buildSyncDestinationInfo({
                isRenderMode,
                syncRoot,
                uproject,
                displayProjectName,
                sourceProjectName,
                t,
              });

              const st = syncStatus[ip] || 'unknown';
              const statusLabel = getSyncStatusLabel(st, t);
              const statusLine = syncDetails[ip]
                ? `${statusLabel} - ${syncDetails[ip]}`
                : statusLabel;
              const statusToneClass = getSyncStatusToneClass(st);

              const canCopy = !!syncRoot && st !== 'checking' && st !== 'copying';
              const isBusy = st === 'copying' || st === 'checking';

              const diffs = syncDiffs[ip] || {};
              const added = Array.isArray(diffs.added) ? diffs.added : [];
              const modified = Array.isArray(diffs.modified) ? diffs.modified : [];
              const removed = Array.isArray(diffs.removed) ? diffs.removed : [];
              const renderProjects = Array.isArray(diffs.renderProjects)
                ? diffs.renderProjects
                : [];
              const copyState = syncCopyProjects[ip] && typeof syncCopyProjects[ip] === 'object'
                ? syncCopyProjects[ip]
                : null;
              const renderCopyRows = Array.isArray(copyState?.rows) ? copyState.rows : [];
              const copyRowsByProjectId = new Map();
              const copyRowsByProjectName = new Map();
              renderCopyRows.forEach((item) => {
                const projectIdKey = String(item?.projectId || '').trim();
                if (projectIdKey && !copyRowsByProjectId.has(projectIdKey)) {
                  copyRowsByProjectId.set(projectIdKey, item);
                }
                const projectNameKey = String(item?.projectName || '').trim().toLowerCase();
                if (projectNameKey && !copyRowsByProjectName.has(projectNameKey)) {
                  copyRowsByProjectName.set(projectNameKey, item);
                }
              });

              const hasAnyDiffs =
                !isRenderMode &&
                (added.length > 0 || modified.length > 0 || removed.length > 0);

              const sel = syncSelection[ip] || {};
              const selAdded = sel.added || {};
              const selModified = sel.modified || {};
              const selRemoved = sel.removed || {};

              const fold = diffFoldState[ip] || {};
              const isOpen = (type) => (fold[type] === undefined ? true : !!fold[type]);

              const isChecked = (type, rel) => {
                if (type === 'added') return selAdded[rel] !== false;
                if (type === 'modified') return selModified[rel] !== false;
                if (type === 'removed') return selRemoved[rel] !== false;
                return true;
              };

              return (
                <div key={`${ip}-${idx}`} className="uu-card">
                  <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
                    <div className="uu-col">
                      <SyncHostHeader host={h} index={idx} t={t} />
                    </div>
                    <div className="uu-col" style={SYNC_DEST_COL_STYLE}>
                      <div>{destInfo}</div>
                    </div>
                    <div className="uu-col uu-actions">
                      <div className="uu-buttons-row">
                        <button
                          type="button"
                          className="uu-btn"
                          onClick={() => handleCheckHost(ip)}
                          disabled={st === 'checking' || st === 'copying'}
                        >
                          {t('sync.server.btn.check')}
                        </button>
                        <button
                          type="button"
                          className="uu-btn"
                          onClick={() => handleCopyHost(ip)}
                          disabled={!canCopy}
                        >
                          {t('sync.server.btn.copy')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`uu-sync-status-line ${statusToneClass}`}>
                    {statusLine}
                  </div>

                  {isRenderMode && renderProjects.length > 0 && (
                    <div className="uu-sync-diffs mt-8">
                      <div className="uu-sync-diff-block">
                        {copyState?.at ? (
                          <div className="uu-hint" style={SYNC_LAST_COPY_HINT_STYLE}>
                            Derniere synchro: {new Date(copyState.at).toLocaleString('fr-FR')}
                          </div>
                        ) : null}
                        <div
                          className="uu-sync-diff-list"
                          style={SYNC_RENDER_PROJECT_GRID_STYLE}
                        >
                          <strong>Projet</strong>
                          <strong>Source</strong>
                          <strong>Statut</strong>
                          <strong>Derniere synchro</strong>
                          <strong>+</strong>
                          <strong>~</strong>
                          <strong>-</strong>
                          <strong>Dossier cible</strong>
                          {renderProjects.map((row, rowIndex) => {
                            const key = `${row.projectId || row.projectName || 'p'}-${rowIndex}`;
                            const sourceText = row.sourceHostName || row.sourceHostIp || '-';
                            const projectText = `${row.projectName}${row.projectId ? ` [${row.projectId}]` : ''}`;
                            const statusText = getRenderProjectStatusLabel(row.status);
                            const rowProjectId = String(row.projectId || '').trim();
                            const rowProjectName = String(row.projectName || '').trim().toLowerCase();
                            const copyRow =
                              (rowProjectId ? copyRowsByProjectId.get(rowProjectId) : null) ||
                              (rowProjectName ? copyRowsByProjectName.get(rowProjectName) : null) ||
                              null;
                            const copyStatusText = copyRow
                              ? getRenderCopyStatusLabel(copyRow.status)
                              : '-';
                            return (
                              <React.Fragment key={key}>
                                <span>{projectText}</span>
                                <span className="uu-hint">{sourceText}</span>
                                <span className={getRenderProjectStatusClass(row.status)}>{statusText}</span>
                                <span
                                  className={copyRow ? getRenderCopyStatusClass(copyRow.status) : 'uu-hint'}
                                  title={copyRow?.message || ''}
                                >
                                  {copyStatusText}
                                </span>
                                <span>{Number(row.addedCount || 0)}</span>
                                <span>{Number(row.modifiedCount || 0)}</span>
                                <span>{Number(row.removedCount || 0)}</span>
                                <span className="uu-hint" title={row.message || row.destDir || ''}>
                                  {row.message || row.destDir || '-'}
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {hasAnyDiffs && (
                    <div className="uu-sync-diffs mt-8">
                      {SYNC_DIFF_TYPES.map((diffType) => (
                        <SyncDiffSection
                          key={diffType}
                          ip={ip}
                          type={diffType}
                          items={diffType === 'added' ? added : diffType === 'modified' ? modified : removed}
                          isOpen={isOpen}
                          isRenderMode={isRenderMode}
                          isBusy={isBusy}
                          isChecked={isChecked}
                          onToggleSection={toggleDiffSection}
                          onBulkSelect={bulkSelectDiff}
                          onToggleFileSelection={toggleFileSelection}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <>
                {syncHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
                      {t('sync.server.section.syncHosts')}
                    </h3>
                    <div className="uu-list">
                      {syncHosts.map((h, idx) => renderSyncCard(h, idx))}
                    </div>
                  </div>
                )}

                {localProjectHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
                      {isRenderMode
                        ? t('sync.server.render.localProjectTitle', 'Stations non configurees pour la synchronisation')
                        : t('sync.server.section.localProject')}
                    </h3>
                    <div className="uu-list">
                      {localProjectHosts.map((h, idx) =>
                        (
                          <SyncWarnCard
                            key={`${safeStr(h.ip || h.address, idx)}-${idx}`}
                            host={h}
                            index={idx}
                            t={t}
                            messageText={
                              isRenderMode
                                ? t(
                                    'sync.server.render.localProjectMessage',
                                    'Synchronisation desactivee sur cette station. Active-la pour comparer et copier les projets rendu.'
                                  )
                                : t('sync.server.msg.localProjectMode')
                            }
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {excludedHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
                      {isRenderMode
                        ? t('sync.server.render.excludedTitle', 'Stations exclues de la synchronisation')
                        : t('sync.server.section.excluded')}
                    </h3>
                    <div className="uu-list">
                      {excludedHosts.map((h, idx) =>
                        (
                          <SyncWarnCard
                            key={`${safeStr(h.ip || h.address, idx)}-${idx}`}
                            host={h}
                            index={idx}
                            t={t}
                            messageText={
                              isRenderMode
                                ? t('sync.server.render.excludedMessage', 'Cette station est exclue du rendu/synchronisation.')
                                : t('sync.server.msg.excluded')
                            }
                          />
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {message && (
            <div className={`uu-msg ${message.type || ''}`}>
              {message.text}
            </div>
          )}
          {confirmDialogNode}
        </div>
      </div>
    );
  }

  // Sécurité
  return null;
}
