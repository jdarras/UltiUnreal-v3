import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLibrary, getCommon } from '../../utils/agent';
import useFilteredResources from '../../utils/useFilteredResources';
import {
  VIEW_STORAGE_KEY,
  PAGE_SIZE_STORAGE_KEY,
  VIEW_OPTIONS,
  FAVORITE_FILTER_KEY,
  RESOURCE_FAVORITES_STORAGE_KEY,
  TESTED_FILTER_KEY,
  COMPAT_FILTER_KEY,
  ADVANCED_INITIAL,
  resolveFavoritesUserScope,
  readFavoriteMap,
  writeFavoriteMap,
  readBooleanFlag,
  applyFavoritesToResources,
  normalizeResource,
  normalizeUeVersionList,
  normalizeValue,
} from '../../utils/resources-helpers';

export function useResourcesList({ t, id, refreshKey = 0 }) {
  const favoritesUserScope = useMemo(() => resolveFavoritesUserScope(id), [id]);
  const favoriteFilterStorageKey = useMemo(
    () => `${FAVORITE_FILTER_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );
  const favoritesStorageKey = useMemo(
    () => `${RESOURCE_FAVORITES_STORAGE_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [query, setQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchAdvanced, setSearchAdvanced] = useState(ADVANCED_INITIAL);
  const [resourceFavorites, setResourceFavorites] = useState(() => readFavoriteMap(favoritesStorageKey));
  const resourceFavoritesRef = useRef(resourceFavorites);
  const [quickFilters, setQuickFilters] = useState(() => ({
    tested: readBooleanFlag(localStorage.getItem(TESTED_FILTER_KEY), false),
    favorite: readBooleanFlag(localStorage.getItem(favoriteFilterStorageKey), false),
    compatibleOnly: readBooleanFlag(localStorage.getItem(COMPAT_FILTER_KEY), false),
  }));
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    try {
      const raw = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 10) return Math.trunc(n);
    } catch {}
    return 25;
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (VIEW_OPTIONS.has(stored)) return stored;
      if (stored === 'list') return 'cards';
    } catch {}
    return 'thumbs';
  });
  const [userUeVersions, setUserUeVersions] = useState([]);
  const [unrealLauncherPath, setUnrealLauncherPath] = useState('');
  const launcherFetchRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(favoriteFilterStorageKey, quickFilters.favorite ? 'true' : 'false');
      localStorage.setItem(TESTED_FILTER_KEY, quickFilters.tested ? 'true' : 'false');
      localStorage.setItem(COMPAT_FILTER_KEY, quickFilters.compatibleOnly ? 'true' : 'false');
    } catch {}
  }, [quickFilters.favorite, quickFilters.tested, quickFilters.compatibleOnly, favoriteFilterStorageKey]);

  useEffect(() => {
    resourceFavoritesRef.current = resourceFavorites;
  }, [resourceFavorites]);

  useEffect(() => {
    const nextFavorites = readFavoriteMap(favoritesStorageKey);
    resourceFavoritesRef.current = nextFavorites;
    setResourceFavorites(nextFavorites);
    setQuickFilters((prev) => ({
      ...(prev && typeof prev === 'object' ? prev : {}),
      tested: readBooleanFlag(localStorage.getItem(TESTED_FILTER_KEY), false),
      favorite: readBooleanFlag(localStorage.getItem(favoriteFilterStorageKey), false),
      compatibleOnly: readBooleanFlag(localStorage.getItem(COMPAT_FILTER_KEY), false),
    }));
    setItems((prev) => applyFavoritesToResources(prev, nextFavorites));
  }, [favoritesStorageKey, favoriteFilterStorageKey]);

  useEffect(() => {
    writeFavoriteMap(favoritesStorageKey, resourceFavorites);
  }, [favoritesStorageKey, resourceFavorites]);

  const fetchLibrary = useCallback(async () => {
    setBusy(true);
    try {
      const res = await getLibrary().catch(() => ({}));
      if (!aliveRef.current) return;
      const normalizedItems = Array.isArray(res?.items) ? res.items.map(normalizeResource) : [];
      setItems(applyFavoritesToResources(normalizedItems, resourceFavoritesRef.current));
      setMeta(res?.meta && typeof res.meta === 'object' ? res.meta : {});
    } finally {
      if (aliveRef.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary, refreshKey]);

  const refreshUserVersions = useCallback(async () => {
    try {
      const res = await getCommon().catch(() => ({}));
      const list = Array.isArray(res?.unrealVersions)
        ? res.unrealVersions
        : Array.isArray(res?.common?.unrealVersions)
          ? res.common.unrealVersions
          : [];
      setUserUeVersions(normalizeUeVersionList(list));
      const launcher = res?.unrealLauncherPath
        || res?.unreal_launcher_path
        || res?.common?.unrealLauncherPath
        || res?.common?.unreal_launcher_path
        || '';
      const cleaned = String(launcher || '').trim();
      setUnrealLauncherPath(cleaned);
      return cleaned;
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    refreshUserVersions();
  }, [refreshUserVersions]);

  useEffect(() => {
    if (!unrealLauncherPath && !launcherFetchRef.current) {
      launcherFetchRef.current = true;
      refreshUserVersions().finally(() => {
        launcherFetchRef.current = false;
      });
    }
  }, [unrealLauncherPath, refreshUserVersions]);

  const hasAdvancedFilters = useMemo(() => {
    return Object.entries(searchAdvanced || {}).some(([, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      return Boolean(v);
    });
  }, [searchAdvanced]);

  const sellerOptions = useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.seller);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);

  const epicAccountOptions = useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const pushAcc = (raw) => {
        const acc = normalizeValue(raw);
        if (!acc) return;
        const key = acc.toLowerCase();
        if (!seen.has(key)) seen.set(key, acc);
      };
      pushAcc(item?.epicAccount);
      pushAcc(item?.user?.displayName);
      pushAcc(item?.user?.name);
      if (Array.isArray(item?.epicAccounts)) {
        item.epicAccounts.forEach(pushAcc);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);

  const typeOptions = useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.listingType);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);

  const distributionOptions = useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.distribution || item?.listingRaw?.distribution);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);

  const ueOptions = useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const versions = Array.isArray(item?.ueVersions) ? item.ueVersions : [];
      for (const val of versions) {
        const raw = normalizeValue(val);
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (!seen.has(key)) seen.set(key, raw);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);

  const userUeVersionSet = useMemo(() => new Set(userUeVersions), [userUeVersions]);

  const isUeIncompatible = useCallback((item) => {
    const versions = normalizeUeVersionList(item?.ueVersions);
    if (!versions.length || !userUeVersionSet.size) return false;
    return !versions.some((ver) => userUeVersionSet.has(ver));
  }, [userUeVersionSet]);

  const isUeCompatible = useCallback((item) => !isUeIncompatible(item), [isUeIncompatible]);

  const { filteredResources } = useFilteredResources(items, query, searchAdvanced, quickFilters, { isCompatible: isUeCompatible });

  useEffect(() => {
    setPage(0);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
    } catch {}
  }, [filteredResources.length, pageSize]);

  const totalResources = filteredResources.length;
  const totalPages = Math.max(1, Math.ceil(totalResources / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const visibleResources = filteredResources.slice(pageStart, pageStart + pageSize);
  const canPrevPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;
  const compatLabel = userUeVersions.length > 1 ? 'Versions compatibles' : 'Version compatible';
  const compatDisabled = userUeVersions.length === 0;

  const hasMore = !!meta?.lastImportHasMore;
  const importCount = Number(meta?.lastImportFound || items.length || 0);
  const incompleteMsg = hasMore
    ? t('resources.importIncomplete', { count: importCount })
    : '';
  const canClearSearch = !!query ||
    hasAdvancedFilters ||
    quickFilters.tested ||
    quickFilters.favorite ||
    searchExpanded;

  return {
    items,
    setItems,
    meta,
    query,
    setQuery,
    searchExpanded,
    setSearchExpanded,
    searchAdvanced,
    setSearchAdvanced,
    resourceFavorites,
    setResourceFavorites,
    resourceFavoritesRef,
    quickFilters,
    setQuickFilters,
    busy,
    page,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
    userUeVersions,
    unrealLauncherPath,
    refreshUserVersions,
    fetchLibrary,
    filteredResources,
    totalPages,
    currentPage,
    canPrevPage,
    canNextPage,
    visibleResources,
    compatLabel,
    compatDisabled,
    hasAdvancedFilters,
    incompleteMsg,
    canClearSearch,
    sellerOptions,
    epicAccountOptions,
    typeOptions,
    distributionOptions,
    ueOptions,
    userUeVersionSet,
    isUeIncompatible,
    isUeCompatible,
  };
}
