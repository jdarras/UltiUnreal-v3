// app/screens/synchronisation.jsx
import React from 'react';

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

function safeStr(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (!value) return fallback;
  if (typeof value === 'object') {
    if (typeof value.ip === 'string') return value.ip;
    if (typeof value.address === 'string') return value.address;
    if (typeof value.value === 'string') return value.value;
    if (typeof value.name === 'string') return value.name;
    if (typeof value.label === 'string') return value.label;
  }
  return fallback;
}

function normalizeRel(rel) {
  return String(rel || '').replace(/\\/g, '/');
}

function normalizeKey(rel) {
  return normalizeRel(rel).toLowerCase();
}

export default function SynchronisationScreen() {
  const identity = readIdentity();
  const role = identity?.role || 'server';
  const localIp = String(identity?.localIp || '').trim();
  const lang = identity?.lang || 'fr';
  const t = React.useMemo(() => createT(lang), [lang]);
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
  const [confirmDialog, setConfirmDialog] = React.useState({
    open: false,
    message: '',
  });
  const confirmResolveRef = React.useRef(null);
  const confirmPrevFocusRef = React.useRef(null);
  const confirmOkBtnRef = React.useRef(null);

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
  const [serverAutoCheckDone, setServerAutoCheckDone] = React.useState(false);
  const [quietMode, setQuietMode] = React.useState(false);

  const [syncDiffs, setSyncDiffs] = React.useState({});
  const [diffFoldState, setDiffFoldState] = React.useState({});
  const [syncSelection, setSyncSelection] = React.useState({});

  React.useEffect(() => {
    return () => {
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

  function closeConfirmDialog(ok) {
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
      if (el && typeof el.focus === 'function' && el.isConnected !== false) {
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
  }

  function requestConfirm(message) {
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
  }

  React.useEffect(() => {
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
  }, [confirmDialog.open]);

  function renderConfirmDialog() {
    if (!confirmDialog.open) return null;
    const title = t('production.confirm.title') || 'Confirmation';
    const labelCancel =
      t('production.confirm.cancel') || t('app.quit.confirm.cancel') || 'Annuler';
    const labelOk = t('production.confirm.ok') || 'OK';
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 12000
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeConfirmDialog(false);
        }}
      >
        <div
          className="uu-card"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            width: 'min(460px, calc(100vw - 32px))',
            padding: '16px'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 600, marginBottom: '10px' }}>
            {title}
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
              {labelCancel}
            </button>
            <button
              ref={confirmOkBtnRef}
              type="button"
              className="uu-btn prod-toggle-active"
              onClick={() => closeConfirmDialog(true)}
            >
              {labelOk}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Si la synchro est activée pour cette machine, on exige un dossier racine
    if (clientSyncEnabled && !root) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.missingRoot'),
      });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (!localIp) {
      setMessage({
        type: 'error',
        text: t('sync.client.msg.noLocalIp'),
      });
      setTimeout(() => setMessage(null), 3000);
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
    setTimeout(() => setMessage(null), delay);
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
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    const root = String(clientRoot || '').trim();
    if (!root) {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.mustSetRoot'),
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    try {
      setMessage({
        type: 'info',
        text: t('sync.client.msg.testRunning'),
      });

      const res = await checkSync(localIp);

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

      setTimeout(() => setMessage(null), 4000);
    } catch (e) {
      setMessage({
        type: 'error',
        text: `${t('sync.client.msg.testErrorPrefix')}${e.message || e}`,
      });
      setTimeout(() => setMessage(null), 5000);
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
      setTimeout(() => setMessage(null), 2500);
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
      setTimeout(() => setMessage(null), 2500);
    }
  }

  // -------- Action côté serveur : Vérifier une machine --------
  async function handleCheckHost(ip) {
    if (!ip) return;

    setSyncStatus((prev) => ({ ...prev, [ip]: 'checking' }));
    setSyncDetails((prev) => ({ ...prev, [ip]: '' }));
    setSyncDiffs((prev) => ({
      ...prev,
      [ip]: { added: [], modified: [], removed: [] },
    }));
    setSyncSelection((prev) => ({
      ...prev,
      [ip]: { added: {}, modified: {}, removed: {} },
    }));

    try {
      const [res, ignoredList] = await Promise.all([
        checkSync(ip),
        getSyncIgnoreForHost(ip).catch(() => []),
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
      const added = Array.isArray(res?.added) ? res.added : [];
      const modified = Array.isArray(res?.modified)
        ? res.modified
        : [];
      const removed = Array.isArray(res?.removed)
        ? res.removed
        : [];

      setSyncDiffs((prev) => ({
        ...prev,
        [ip]: { added, modified, removed },
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
            [rel]: ignoreSet.has(normalizeKey(rel)) ? false : true,
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
          [ip]: diffText,
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
          [ip]: diffText,
        }));
      } else if (status === 'no_root') {
        setSyncStatus((prev) => ({ ...prev, [ip]: 'no_root' }));
        setSyncDetails((prev) => ({
          ...prev,
          [ip]:
            res?.message ||
            t('sync.server.msg.checkNoRoot'),
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
        [ip]: { added: [], modified: [], removed: [] },
      }));
      setSyncSelection((prev) => ({
        ...prev,
        [ip]: { added: {}, modified: {}, removed: {} },
      }));
    }
  }

  // -------- Gestion des sélections de fichiers (serveur) --------
  async function toggleFileSelection(ip, type, rel) {
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
      console.log('[sync] toggle selection -> updateSyncIgnore', ip, { addList, removeList });
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
        setTimeout(() => setMessage(null), 2000);
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
        setTimeout(() => setMessage(null), 2000);
      }
    }
  }

  // -------- Action côté serveur : Copier le projet vers une machine --------
  async function handleCopyHost(ip) {
    if (!ip) return;

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
        console.log('[sync] updateSyncIgnore (UI) addList', ip, addList);
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
      setTimeout(() => setMessage(null), 2000);
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
        setTimeout(() => setMessage(null), 3000);
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
        setTimeout(() => setMessage(null), 4000);
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
      setTimeout(() => setMessage(null), 3000);

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
      setTimeout(() => setMessage(null), 4000);
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
          {renderConfirmDialog()}
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

        <div className="uu-card">
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
            const excludedHosts = clientHosts.filter((h) => h && h.eligible === false);
            const localProjectHosts = clientHosts.filter(
              (h) => h && h.eligible !== false && !h.syncEnabled
            );
            const syncHosts = clientHosts.filter(
              (h) => h && h.eligible !== false && !!h.syncEnabled
            );

            const renderHostHeader = (h, idx) => {
              const name = safeStr(
                h.name,
                `${t('sync.server.hostDefaultName')} ${idx + 1}`
              );
              const ip = safeStr(h.ip || h.address, `#${idx + 1}`);
              return (
                <div className="uu-host-row">
                  <span className={`uu-host-dot ${colorClass(h.color)}`} />
                  <div className="uu-host-main">
                    <span className="uu-host-name">{name}</span>
                    <span className="uu-host-ip uu-hint"> - {ip}</span>
                  </div>
                </div>
              );
            };

            const renderSyncCard = (h, idx) => {
              const ip = safeStr(h.ip || h.address, `#${idx + 1}`);
              const syncRoot = typeof h.syncRoot === 'string' ? h.syncRoot : '';
              const uproject = typeof h.uproject === 'string' ? h.uproject : '';
              const destBase = displayProjectName || sourceProjectName;
              let destInfo;

              if (syncRoot) {
                destInfo = destBase ? `${syncRoot}\\${destBase}` : syncRoot;
              } else if (uproject) {
                const norm = uproject.replace(/\//g, '\\');
                const idx2 = norm.lastIndexOf('\\');
                destInfo = idx2 > 0 ? norm.slice(0, idx2) : norm;
              } else {
                destInfo = t('sync.server.destMissing');
              }

              const st = syncStatus[ip] || 'unknown';
              let statusLabel = t('sync.server.status.unknown');
              if (st === 'checking') statusLabel = t('sync.server.status.checking');
              else if (st === 'copying') statusLabel = t('sync.server.status.copying');
              else if (st === 'in_sync') statusLabel = t('sync.server.status.inSync');
              else if (st === 'desync') statusLabel = t('sync.server.status.desync');
              else if (st === 'no_root') statusLabel = t('sync.server.status.noRoot');
              else if (st === 'error') statusLabel = t('sync.server.status.error');
              const statusLine = syncDetails[ip]
                ? `${statusLabel} - ${syncDetails[ip]}`
                : statusLabel;
              const statusToneClass =
                st === 'in_sync'
                  ? 'uu-sync-status-ok'
                  : st === 'desync' || st === 'error' || st === 'no_root'
                  ? 'uu-sync-status-bad'
                  : 'uu-sync-status-neutral';

              const canCopy = !!syncRoot && st !== 'checking' && st !== 'copying';
              const isBusy = st === 'copying' || st === 'checking';

              const diffs = syncDiffs[ip] || {};
              const added = Array.isArray(diffs.added) ? diffs.added : [];
              const modified = Array.isArray(diffs.modified) ? diffs.modified : [];
              const removed = Array.isArray(diffs.removed) ? diffs.removed : [];

              const hasAnyDiffs =
                added.length > 0 || modified.length > 0 || removed.length > 0;

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
                    <div className="uu-col">{renderHostHeader(h, idx)}</div>
                    <div className="uu-col" style={{ flex: '1 1 260px' }}>
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

                  {hasAnyDiffs && (
                    <div className="uu-sync-diffs mt-8">
                      {added.length > 0 && (
                        <div className="uu-sync-diff-block">
                          <div className="uu-sync-diff-title">
                            <button
                              type="button"
                              className="uu-sync-diff-toggle"
                              onClick={() => toggleDiffSection(ip, 'added')}
                            >
                              {isOpen('added') ? 'v' : '>'}
                            </button>
                            <span className="uu-sync-diff-label">
                              {t('sync.diff.added', { count: added.length })}
                            </span>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'added', true)}
                              disabled={isBusy}
                            >
                              Tout
                            </button>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'added', false)}
                              disabled={isBusy}
                            >
                              Aucun
                            </button>
                          </div>
                          {isOpen('added') && (
                            <div className="uu-sync-diff-list">
                              {added.map((rel) => (
                                <label key={rel} className="uu-sync-diff-item">
                                  <input
                                    type="checkbox"
                                    checked={isChecked('added', rel)}
                                    disabled={isBusy}
                                    onChange={() => toggleFileSelection(ip, 'added', rel)}
                                  />{' '}
                                  <span className="uu-sync-diff-path">{rel}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {modified.length > 0 && (
                        <div className="uu-sync-diff-block">
                          <div className="uu-sync-diff-title">
                            <button
                              type="button"
                              className="uu-sync-diff-toggle"
                              onClick={() => toggleDiffSection(ip, 'modified')}
                            >
                              {isOpen('modified') ? 'v' : '>'}
                            </button>
                            <span className="uu-sync-diff-label">
                              {t('sync.diff.modified', { count: modified.length })}
                            </span>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'modified', true)}
                              disabled={isBusy}
                            >
                              Tout
                            </button>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'modified', false)}
                              disabled={isBusy}
                            >
                              Aucun
                            </button>
                          </div>
                          {isOpen('modified') && (
                            <div className="uu-sync-diff-list">
                              {modified.map((rel) => (
                                <label key={rel} className="uu-sync-diff-item">
                                  <input
                                    type="checkbox"
                                    checked={isChecked('modified', rel)}
                                    disabled={isBusy}
                                    onChange={() => toggleFileSelection(ip, 'modified', rel)}
                                  />{' '}
                                  <span className="uu-sync-diff-path">{rel}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {removed.length > 0 && (
                        <div className="uu-sync-diff-block">
                          <div className="uu-sync-diff-title">
                            <button
                              type="button"
                              className="uu-sync-diff-toggle"
                              onClick={() => toggleDiffSection(ip, 'removed')}
                            >
                              {isOpen('removed') ? 'v' : '>'}
                            </button>
                            <span className="uu-sync-diff-label">
                              {t('sync.diff.removed', { count: removed.length })}
                            </span>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'removed', true)}
                              disabled={isBusy}
                            >
                              Tout
                            </button>
                            <button
                              type="button"
                              className="uu-sync-diff-bulk"
                              onClick={() => bulkSelectDiff(ip, 'removed', false)}
                              disabled={isBusy}
                            >
                              Aucun
                            </button>
                          </div>
                          {isOpen('removed') && (
                            <div className="uu-sync-diff-list">
                              {removed.map((rel) => (
                                <label key={rel} className="uu-sync-diff-item">
                                  <input
                                    type="checkbox"
                                    checked={isChecked('removed', rel)}
                                    disabled={isBusy}
                                    onChange={() => toggleFileSelection(ip, 'removed', rel)}
                                  />{' '}
                                  <span className="uu-sync-diff-path">{rel}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            const renderWarnCard = (h, idx, messageText) => (
              <div
                key={`${safeStr(h.ip || h.address, idx)}-${idx}`}
                className="uu-card launch-host-invalid"
              >
                <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
                  <div className="uu-col">{renderHostHeader(h, idx)}</div>
                  <div className="uu-col">
                    <div className="uu-msg error" style={{ margin: 0 }}>
                      {messageText}
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <>
                {syncHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title">
                      {t('sync.server.section.syncHosts')}
                    </h3>
                    <div className="uu-list">
                      {syncHosts.map((h, idx) => renderSyncCard(h, idx))}
                    </div>
                  </div>
                )}

                {localProjectHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title">
                      {t('sync.server.section.localProject')}
                    </h3>
                    <div className="uu-list">
                      {localProjectHosts.map((h, idx) =>
                        renderWarnCard(
                          h,
                          idx,
                          t('sync.server.msg.localProjectMode')
                        )
                      )}
                    </div>
                  </div>
                )}

                {excludedHosts.length > 0 && (
                  <div className="uu-section">
                    <h3 className="uu-h3 uu-block-title">
                      {t('sync.server.section.excluded')}
                    </h3>
                    <div className="uu-list">
                      {excludedHosts.map((h, idx) =>
                        renderWarnCard(
                          h,
                          idx,
                          t('sync.server.msg.excluded')
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
          {renderConfirmDialog()}
        </div>
      </div>
    );
  }

  // Sécurité
  return null;
}

