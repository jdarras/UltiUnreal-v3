import { useCallback, useEffect, useRef, useState } from 'react';
import { getHosts, getProjects as agentGetProjects, postProjects as agentPostProjects, setProjectAssociation } from '../../utils/agent';
import { normPath, normalizeThumbnailPath } from '../../utils/projects-helpers';
import {
  FAVORITE_STORAGE_KEY,
  getUprojectDialogDefaultPath,
} from '../../utils/projectsScreenUtils';

const PROJECTS_FAVORITES_STORAGE_KEY = 'uu_projects_favorites';
const POSTPROD_AUTH_STORAGE_KEY = 'uu_postprod_auth';
const LS_CLIENT_ASSOC = 'uu_client_project_assoc';

function normalizeScopeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_');
}

export function resolveFavoritesUserScope(identity = {}) {
  const candidates = [
    Number.isFinite(Number(identity?.postprodUserId)) ? `id:${Number(identity.postprodUserId)}` : '',
    identity?.postprodUserPublicId ? `public:${identity.postprodUserPublicId}` : '',
    identity?.postprodUsername ? `username:${identity.postprodUsername}` : '',
    identity?.username ? `username:${identity.username}` : '',
  ];
  for (const candidate of candidates) {
    const normalized = normalizeScopeValue(candidate);
    if (normalized) return normalized;
  }
  try {
    const raw = localStorage.getItem(POSTPROD_AUTH_STORAGE_KEY) || '';
    const parsed = raw ? JSON.parse(raw) : {};
    const user = parsed?.user && typeof parsed.user === 'object' ? parsed.user : {};
    const fallbackCandidates = [
      Number.isFinite(Number(user?.id)) ? `id:${Number(user.id)}` : '',
      user?.publicId ? `public:${user.publicId}` : '',
      user?.username ? `username:${user.username}` : '',
    ];
    for (const candidate of fallbackCandidates) {
      const normalized = normalizeScopeValue(candidate);
      if (normalized) return normalized;
    }
  } catch {
    // noop
  }
  return 'anonymous';
}

function readBooleanFlag(value, fallback = false) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

function readFavoriteMap(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    Object.entries(parsed).forEach(([projectIdRaw, val]) => {
      const projectId = String(projectIdRaw || '').trim();
      if (!projectId) return;
      if (val === true) out[projectId] = true;
    });
    return out;
  } catch {
    return {};
  }
}

function writeFavoriteMap(storageKey, map) {
  try {
    const payload = {};
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      Object.entries(map).forEach(([projectIdRaw, val]) => {
        const projectId = String(projectIdRaw || '').trim();
        if (!projectId) return;
        if (val === true) payload[projectId] = true;
      });
    }
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // noop
  }
}

export function applyFavoritesToProjects(list = [], favoritesMap = {}) {
  const map = favoritesMap && typeof favoritesMap === 'object' && !Array.isArray(favoritesMap)
    ? favoritesMap
    : {};
  return (Array.isArray(list) ? list : []).map((project) => {
    const projectId = String(project?.id || '').trim();
    return {
      ...project,
      favorite: projectId ? map[projectId] === true : false,
    };
  });
}

export function normalizeProjectsPayload(parsed) {
  const list = Array.isArray(parsed?.projects)
    ? parsed.projects.map((x) => ({
        id: String(x.id || '').trim(),
        name: String(x.name || ''),
        uproject: normPath(x.uproject || x.projectPath || ''),
        wrcNames: Array.isArray(x.wrcNames) ? x.wrcNames : (x.wrcName ? [String(x.wrcName)] : []),
        note: String(x.note || ''),
        createdAt: String(x.createdAt || ''),
        lastModified: String(x.lastModified || ''),
        thumbnail: normalizeThumbnailPath(x.thumbnail || x.thumbnailPath || ''),
        engineVersion: String(x.engineVersion || ''),
        metaStatus: String(x.metaStatus || ''),
        metaType: String(x.metaType || ''),
        metaUsageMode: String(x.metaUsageMode || ''),
        metaCategory: String(x.metaCategory || ''),
        metaFileVersion: x.metaFileVersion ?? '',
        metaReferents: (x.metaReferents && typeof x.metaReferents === 'object') ? x.metaReferents : {},
        metaKeywords: Array.isArray(x.metaKeywords) ? x.metaKeywords : [],
        maps: (x.maps && typeof x.maps === 'object') ? x.maps : {},
        favorite: false,
      }))
    : [];
  return {
    list,
    activeName: String(parsed?.activeName || ''),
    activeId: String(parsed?.activeId || ''),
    activeByHost: (parsed?.activeByHost && typeof parsed.activeByHost === 'object') ? parsed.activeByHost : {},
    nextId: Number(parsed?.nextId || 1),
  };
}

function normalizeProjectListItem(x) {
  return {
    id: String(x.id || '').trim(),
    name: String(x.name || ''),
    uproject: normPath(x.uproject || x.projectPath || ''),
    wrcNames: Array.isArray(x.wrcNames) ? x.wrcNames : (x.wrcName ? [String(x.wrcName)] : []),
    note: String(x.note || ''),
    createdAt: String(x.createdAt || ''),
    lastModified: String(x.lastModified || ''),
    thumbnail: normalizeThumbnailPath(x.thumbnail || x.thumbnailPath || ''),
    engineVersion: String(x.engineVersion || ''),
    metaStatus: String(x.metaStatus || ''),
    metaType: String(x.metaType || ''),
    metaUsageMode: String(x.metaUsageMode || ''),
    metaCategory: String(x.metaCategory || ''),
    metaFileVersion: x.metaFileVersion ?? '',
    metaReferents: (x.metaReferents && typeof x.metaReferents === 'object') ? x.metaReferents : {},
    metaKeywords: Array.isArray(x.metaKeywords) ? x.metaKeywords : [],
    maps: (x.maps && typeof x.maps === 'object') ? x.maps : {},
    favorite: false,
  };
}

function useProjectsList({
  t,
  role,
  localIp,
  identity,
  canManageUnrealProjects,
  requestConfirm,
  setHttpBindMsg,
  setHttpBindMsgType,
  httpBindMsg,
}) {
  const favoritesUserScope = resolveFavoritesUserScope(identity);
  const favoritesFilterStorageKey = `${FAVORITE_STORAGE_KEY}:${favoritesUserScope}`;
  const favoritesStorageKey = `${PROJECTS_FAVORITES_STORAGE_KEY}:${favoritesUserScope}`;

  const [projects, setProjects] = useState([]);
  const [activeName, setActiveName] = useState('');
  const [activeId, setActiveId] = useState('');
  const [activeByHost, setActiveByHost] = useState({});
  const [nextId, setNextId] = useState(1);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [projectFavorites, setProjectFavorites] = useState(() => readFavoriteMap(favoritesStorageKey));
  const projectFavoritesRef = useRef(projectFavorites);
  const [favoriteOnly, setFavoriteOnly] = useState(() =>
    readBooleanFlag(localStorage.getItem(favoritesFilterStorageKey), false)
  );

  const [clientActiveName, setClientActiveName] = useState('');
  const [clientActiveId, setClientActiveId] = useState('');
  const [clientAssocPath, setClientAssocPath] = useState(() => {
    try { return String(localStorage.getItem(LS_CLIENT_ASSOC) || ''); } catch { return ''; }
  });
  const [clientSyncEnabled, setClientSyncEnabled] = useState(false);

  const fullProjectsReloadAttemptedRef = useRef(false);
  const pendingDetailIdRef = useRef('');
  const pendingStartRef = useRef(false);

  useEffect(() => {
    projectFavoritesRef.current = projectFavorites;
  }, [projectFavorites]);

  useEffect(() => {
    try { localStorage.setItem(favoritesFilterStorageKey, favoriteOnly ? 'true' : 'false'); } catch {}
  }, [favoriteOnly, favoritesFilterStorageKey]);

  useEffect(() => {
    writeFavoriteMap(favoritesStorageKey, projectFavorites);
  }, [favoritesStorageKey, projectFavorites]);

  useEffect(() => {
    const nextFavorites = readFavoriteMap(favoritesStorageKey);
    projectFavoritesRef.current = nextFavorites;
    setProjectFavorites(nextFavorites);
    setProjects((prev) => applyFavoritesToProjects(prev, nextFavorites));
    setFavoriteOnly(readBooleanFlag(localStorage.getItem(favoritesFilterStorageKey), false));
  }, [favoritesStorageKey, favoritesFilterStorageKey]);

  // Chargement initial
  useEffect(() => {
    let alive = true;
    fullProjectsReloadAttemptedRef.current = false;
    (async () => {
      setProjectsLoading(true);
      try {
        let parsed = null;
        try {
          parsed = await agentGetProjects({ timeoutMs: 30000 });
        } catch {
          parsed = await agentGetProjects({ light: true, timeoutMs: 10000 });
        }
        if (!alive || !parsed || typeof parsed !== 'object') return;
        if (role === 'server') {
          const norm = normalizeProjectsPayload(parsed);
          setProjects(applyFavoritesToProjects(norm.list, projectFavoritesRef.current));
          setActiveName(norm.activeName);
          setActiveId(norm.activeId);
          setActiveByHost(norm.activeByHost);
          setNextId(norm.nextId);
        } else {
          setClientActiveName(String(parsed.activeName || ''));
          setClientActiveId(String(parsed.activeId || ''));
          const assoc = (parsed.activeByHost && parsed.activeByHost[localIp] && parsed.activeByHost[localIp][parsed.activeId]) || '';
          if (assoc) {
            setClientAssocPath(String(assoc || ''));
            try { localStorage.setItem(LS_CLIENT_ASSOC, String(assoc || '')); } catch {}
          }
        }
      } catch {}
      finally {
        if (alive) setProjectsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [role, localIp]);

  // Rechargement complet si le premier chargement était léger (sans thumbs)
  useEffect(() => {
    if (role !== 'server') return;
    if (fullProjectsReloadAttemptedRef.current) return;
    if (!Array.isArray(projects) || projects.length === 0) return;
    if (projects.some((p) => String(p?.thumbnail || '').trim())) return;

    let alive = true;
    fullProjectsReloadAttemptedRef.current = true;
    (async () => {
      try {
        const parsed = await agentGetProjects({ timeoutMs: 30000 });
        if (!alive || !parsed || typeof parsed !== 'object') return;
        const norm = normalizeProjectsPayload(parsed);
        setProjects(applyFavoritesToProjects(norm.list, projectFavoritesRef.current));
        setActiveName(norm.activeName);
        setActiveId(norm.activeId);
        setActiveByHost(norm.activeByHost);
        setNextId(norm.nextId);
      } catch {}
    })();
    return () => { alive = false; };
  }, [role, projects]);

  // Détail/start depuis une autre page
  useEffect(() => {
    try {
      const pending = localStorage.getItem('uu_pending_detail') || '';
      if (pending) {
        pendingDetailIdRef.current = String(pending).trim();
        localStorage.removeItem('uu_pending_detail');
      }
      const pendingStart = localStorage.getItem('uu_pending_start') || '';
      if (pendingStart) {
        pendingStartRef.current = true;
        localStorage.removeItem('uu_pending_start');
      }
    } catch {}
  }, []);

  // Lecture sync pour le client
  useEffect(() => {
    if (role !== 'client') return;
    let alive = true;
    (async () => {
      try {
        const hosts = await getHosts().catch(() => []);
        const list = Array.isArray(hosts) ? hosts : [];
        let preferred = list.find(
          (h) => h && String(h.ip || h.address || '').trim().toLowerCase() === String(localIp || '').trim().toLowerCase()
        );
        if (!preferred && list.length > 0) preferred = list[0];
        if (preferred && alive) {
          const enabled = typeof preferred.syncEnabled === 'boolean'
            ? preferred.syncEnabled
            : !!preferred.syncRoot;
          setClientSyncEnabled(enabled);
        } else {
          if (alive) setClientSyncEnabled(false);
        }
      } catch {
        if (alive) setClientSyncEnabled(false);
      }
    })();
    return () => { alive = false; };
  }, [role, localIp]);

  const saveToServer = useCallback(async (
    nextProjects,
    nextActiveName = activeName,
    nextABH = activeByHost,
    nextActiveId = activeId,
  ) => {
    const payload = {
      projects: nextProjects.map(p => ({
        id: (p.id || '').trim(),
        name: (p.name || '').trim(),
        uproject: normPath(p.uproject || p.projectPath || ''),
        wrcNames: Array.isArray(p.wrcNames) ? p.wrcNames : [],
        note: String(p.note || ''),
        maps: (p.maps && typeof p.maps === 'object') ? p.maps : {},
        createdAt: String(p.createdAt || ''),
        engineVersion: String(p.engineVersion || ''),
      })),
      activeName: nextActiveName || '',
      activeId: String(nextActiveId || ''),
      activeByHost: nextABH || {},
    };

    const r = await agentPostProjects(payload);
    if (!r || r.ok === false) return false;

    const warnings = Array.isArray(r.httpBindWarnings) ? r.httpBindWarnings : [];
    if (warnings.length > 0) {
      const first = warnings[0] || {};
      const name = String(first.name || first.id || '').trim();
      const msg =
        String(first.error || '').toLowerCase() === 'ini_not_found'
          ? t('projects.httpBind.iniMissing', { name: name || '—' })
          : t('projects.httpBind.updateError');
      setHttpBindMsg(msg);
      setHttpBindMsgType('error');
    } else if (httpBindMsg) {
      setHttpBindMsg('');
      setHttpBindMsgType('');
    }

    try {
      const fresh = await agentGetProjects();
      const list = Array.isArray(fresh.projects)
        ? fresh.projects.map(normalizeProjectListItem)
        : [];
      setProjects(applyFavoritesToProjects(list, projectFavoritesRef.current));
      setActiveName(String(fresh.activeName || ''));
      setActiveId(String(fresh.activeId || ''));
      setActiveByHost((fresh.activeByHost && typeof fresh.activeByHost === 'object') ? fresh.activeByHost : {});
      setNextId(Number(fresh.nextId || 1));
    } catch {}
    return true;
  }, [activeName, activeByHost, activeId, t, setHttpBindMsg, setHttpBindMsgType, httpBindMsg]);

  const removeOne = useCallback(async (projectKey) => {
    if (!canManageUnrealProjects) return;
    const key = String(projectKey || '').trim();
    if (!key) return;
    const ok = await requestConfirm(t('projects.confirm.delete'));
    if (!ok) return;

    const index = projects.findIndex((p) => String(p.id || '').trim() === key);
    if (index === -1) return;

    const removed = projects[index];
    const next = projects.filter((_, idx) => idx !== index);

    const removedIsActive =
      removed &&
      String(removed.id || '').trim() === String(activeId || '').trim();

    const nextActiveName = removedIsActive ? '' : activeName;
    const nextActiveId = removedIsActive ? '' : activeId;

    const nextABH = { ...activeByHost };
    if (removed && removed.id) {
      for (const hostIp of Object.keys(nextABH)) {
        if (nextABH[hostIp] && typeof nextABH[hostIp] === 'object') {
          if (removed.id in nextABH[hostIp]) {
            delete nextABH[hostIp][removed.id];
            if (Object.keys(nextABH[hostIp]).length === 0) delete nextABH[hostIp];
          }
        }
      }
    }

    setProjects(next);
    setActiveName(nextActiveName);
    setActiveId(nextActiveId);
    setActiveByHost(nextABH);
    await saveToServer(next, nextActiveName, nextABH, nextActiveId);
  }, [canManageUnrealProjects, projects, activeId, activeName, activeByHost, requestConfirm, saveToServer, t]);

  const activateOne = useCallback(async (projectKey) => {
    if (!canManageUnrealProjects) return;
    const key = String(projectKey || '').trim();
    if (!key) return;

    const index = projects.findIndex((p) => String(p.id || '').trim() === key);
    if (index === -1) return;

    const p = projects[index];
    const name = String(p?.name || '').trim();
    const id = String(p?.id || '').trim();
    const path = String(p?.uproject || '').trim();

    const nextABH = { ...activeByHost };
    if (localIp && id && path && !((nextABH[localIp] || {})[id])) {
      nextABH[localIp] = { ...(nextABH[localIp] || {}), [id]: path };
    }

    setActiveName(name);
    setActiveId(id);
    setActiveByHost(nextABH);
    await saveToServer(projects, name, nextABH, id);
  }, [canManageUnrealProjects, projects, activeByHost, localIp, saveToServer]);

  const setProjectFavoriteLocal = useCallback((projectId, isFavorite, detailId, setDetailMeta, detailMetaRef) => {
    const pid = String(projectId || '').trim();
    if (!pid) return;
    setProjectFavorites((prev) => {
      const next = { ...(prev && typeof prev === 'object' ? prev : {}) };
      if (isFavorite === true) next[pid] = true;
      else delete next[pid];
      return next;
    });
    setProjects((prev) =>
      prev.map((p) =>
        String(p.id || '').trim() === pid ? { ...p, favorite: isFavorite === true } : p
      )
    );
    if (String(detailId || '').trim() === pid) {
      setDetailMeta((prev) => (prev ? { ...prev, favorite: isFavorite === true } : prev));
      if (detailMetaRef && detailMetaRef.current && typeof detailMetaRef.current === 'object') {
        detailMetaRef.current = { ...detailMetaRef.current, favorite: isFavorite === true };
      }
    }
  }, []);

  const toggleProjectFavorite = useCallback((proj, detailId, setDetailMeta, detailMetaRef) => {
    const pid = String(proj?.id || '').trim();
    if (!pid) return;
    const nextFav = proj?.favorite === true ? false : true;
    setProjectFavoriteLocal(pid, nextFav, detailId, setDetailMeta, detailMetaRef);
  }, [setProjectFavoriteLocal]);

  const associateForClientActive = useCallback(async (clientActiveId_, clientActiveName_, _clientSyncEnabled) => {
    if (!clientActiveName_) return;
    const hostIp = localIp;
    if (!hostIp) return;

    let file = await window.electron?.chooseUproject?.({
      defaultPath: getUprojectDialogDefaultPath(clientAssocPath),
    });
    if (file && typeof file === 'object') file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
    if (!file) return;

    const p = normPath(file);
    const j = await setProjectAssociation(hostIp, clientActiveId_ || clientActiveName_, p);
    if (j && j.ok) {
      setClientAssocPath(p);
      try { localStorage.setItem(LS_CLIENT_ASSOC, String(p || '')); } catch {}
    }
  }, [localIp, clientAssocPath]);

  return {
    projects,
    setProjects,
    activeName,
    setActiveName,
    activeId,
    setActiveId,
    activeByHost,
    setActiveByHost,
    nextId,
    setNextId,
    projectsLoading,
    projectFavorites,
    setProjectFavorites,
    projectFavoritesRef,
    favoriteOnly,
    setFavoriteOnly,
    clientActiveName,
    clientActiveId,
    clientAssocPath,
    clientSyncEnabled,
    pendingDetailIdRef,
    pendingStartRef,
    saveToServer,
    removeOne,
    activateOne,
    setProjectFavoriteLocal,
    toggleProjectFavorite,
    associateForClientActive,
  };
}

export { useProjectsList };
export default useProjectsList;
