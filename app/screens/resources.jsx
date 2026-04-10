// app/screens/resources.jsx
import React from 'react';
import { getLibrary, getLibraryItem, postLibraryItem, getCommon } from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { normalizeThumbnailPath } from '../utils/projects-helpers';
import useFilteredResources from '../utils/useFilteredResources';
import ResourceList from '../components/ResourceList.jsx';
import MultiSelectDropdown from '../components/MultiSelectDropdown.jsx';

const VIEW_STORAGE_KEY = 'uu_resources_view';
const PAGE_SIZE_STORAGE_KEY = 'uu_resources_page_size';
const VIEW_OPTIONS = new Set(['thumbs', 'cards']);
const FAVORITE_FILTER_KEY = 'uu_resources_fav';
const RESOURCE_FAVORITES_STORAGE_KEY = 'uu_resources_favorites';
const POSTPROD_AUTH_STORAGE_KEY = 'uu_postprod_auth';
const TESTED_FILTER_KEY = 'uu_resources_tested';
const COMPAT_FILTER_KEY = 'uu_resources_compat';
const USAGE_VALUES = [
  'audio',
  'decor',
  'environment',
  'datas',
  'props',
  'shaders',
  'templates',
  'ui',
  'vfx',
  'video_production',
  'augmented_reality'
];
const STYLE_VALUES = ['realistic', 'stylized', 'toon', 'lowpoly', 'photogrammetry', 'anime'];
const AMBIANCE_VALUES = ['medieval', 'scifi', 'urban', 'nature', 'corporate'];
const LICENSE_VALUES = ['ok_client', 'to_verify', 'forbidden'];
const RATING_VALUES = [1, 2, 3, 4, 5];
const ADVANCED_INITIAL = {
  usage: [],
  style: [],
  ambiance: [],
  license: [],
  quality: 0,
  performance: 0,
  seller: '',
  type: [],
  distribution: [],
  ueVersion: [],
  tags: '',
  epicAccount: '',
};

function pickString(...values) {
  for (const val of values) {
    const s = String(val || '').trim();
    if (s) return s;
  }
  return '';
}

function formatDate(value, lang) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale);
}

function toListString(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .join(', ');
}

function normalizeValue(val) {
  return String(val || '').trim();
}

function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => normalizeValue(val))
    .filter(Boolean);
}

function normalizeSelectValue(value, allowed = []) {
  let s = normalizeValue(value).toLowerCase();
  if (!s) return '';
  if (allowed.includes('environment')) {
    if (s === 'environment' || s === 'environnement') {
      s = 'environment';
    }
  }
  if (allowed.includes('decor')) {
    if (s === 'décor' || s === 'decors' || s === 'décors') {
      s = 'decor';
    }
  }
  if (allowed.includes('video_production')) {
    if (s === 'video production' || s === 'vidéo production' || s === 'video-production') {
      s = 'video_production';
    }
  }
  if (allowed.includes('augmented_reality')) {
    if (s === 'augmented reality' || s === 'augmented-reality' || s === 'réalité augmentée' || s === 'realite augmentee' || s === 'ar' || s === 'ra') {
      s = 'augmented_reality';
    }
  }
  return allowed.includes(s) ? s : '';
}

const normalizeUserUsageFromServer = (user = {}) => {
  const usage = normalizeSelectValue(user.usage, USAGE_VALUES);
  return usage ? { ...user, usage } : user;
};

function normalizeBool(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  const s = normalizeValue(val).toLowerCase();
  if (!s) return false;
  return s === 'true' || s === '1' || s === 'yes' || s === 'oui';
}

function normalizeRating(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n);
  if (r < 1 || r > 5) return 0;
  return r;
}

function normalizeUid(uid) {
  return String(uid || '').trim().toLowerCase();
}

function normalizeScopeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_');
}

function resolveFavoritesUserScope(identity = {}) {
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

function readFavoriteMap(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    Object.entries(parsed).forEach(([uidRaw, val]) => {
      const uid = normalizeUid(uidRaw);
      if (!uid) return;
      if (val === true) out[uid] = true;
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
      Object.entries(map).forEach(([uidRaw, val]) => {
        const uid = normalizeUid(uidRaw);
        if (!uid) return;
        if (val === true) payload[uid] = true;
      });
    }
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function readBooleanFlag(value, fallback = false) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

function applyFavoriteToResource(item, favoritesMap = {}) {
  const uid = normalizeUid(item?.uid);
  const favorite = uid ? favoritesMap[uid] === true : false;
  return {
    ...(item || {}),
    user: {
      ...((item && item.user && typeof item.user === 'object') ? item.user : {}),
      favorite,
    },
  };
}

function applyFavoritesToResources(list = [], favoritesMap = {}) {
  return (Array.isArray(list) ? list : []).map((item) => applyFavoriteToResource(item, favoritesMap));
}

function normalizeUeVersion(val) {
  const raw = normalizeValue(val);
  if (!raw) return '';
  const cleaned = raw.replace(/^ue[_\s-]?/i, '').replace(/^unreal[_\s-]?/i, '');
  return cleaned.toLowerCase();
}

function normalizeResource(item = {}) {
  if (!item || typeof item !== 'object') return {};
  const epicAccount = pickString(
    item?.user?.displayName,
    item?.user?.name,
    item?.epicAccount,
    item?.accountName
  );
  const epicAccounts = (() => {
    const list = Array.isArray(item?.epicAccounts) ? item.epicAccounts : [];
    const out = new Map();
    list.forEach((acc) => {
      const v = normalizeValue(acc);
      if (v) out.set(v.toLowerCase(), v);
    });
    const single = normalizeValue(epicAccount);
    if (single) out.set(single.toLowerCase(), single);
    return Array.from(out.values());
  })();
  const forumUrl = pickString(
    item?.forumUrl,
    item?.comments_url,
    item?.commentsUrl
  );
  return { ...item, epicAccount, epicAccounts, forumUrl };
}

function normalizeUeVersionList(list) {
  const seen = new Set();
  const out = [];
  const arr = Array.isArray(list) ? list : [list];
  for (const val of arr) {
    const v = normalizeUeVersion(val);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function stripHtml(value) {
  const raw = String(value || '');
  if (!raw) return '';
  return raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFabTags(item) {
  const base = normalizeList(item?.tags);
  const rawTags = item?.listingRaw?.tags;
  const extra = Array.isArray(rawTags)
    ? rawTags.map((tag) => normalizeValue(tag?.name || tag?.title || tag?.slug || tag?.uid))
    : [];
  const merged = normalizeList([...base, ...extra]);
  return merged;
}

function extractDescription(item) {
  const listing = item?.listingRaw || {};
  const raw = normalizeValue(
    listing.description ||
      listing.longDescription ||
      listing.shortDescription ||
      listing.summary ||
      listing?.details?.description
  );
  return stripHtml(raw);
}

function extractTechnicalDetails(item) {
  const formats = Array.isArray(item?.listingRaw?.assetFormats)
    ? item.listingRaw.assetFormats
    : [];
  const out = [];
  for (const fmt of formats) {
    if (!fmt || typeof fmt !== 'object') continue;
    const specs = fmt.technicalSpecs && typeof fmt.technicalSpecs === 'object'
      ? fmt.technicalSpecs
      : null;
    if (!specs) continue;
    const detail = stripHtml(specs.technicalDetails || specs.details || '');
    if (detail) out.push(detail);
  }
  return out;
}

function extractGalleryImages(item) {
  const listing = item?.listingRaw || {};
  const seen = new Set();
  const out = [];

  const push = (val) => {
    const s = normalizeValue(val);
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  // Choisit une image de bonne définition sans tomber sur des fichiers énormes
  const pickOptimized = (images = []) => {
    const MAX_TARGET = 2560; // limite douce pour éviter les très gros fichiers
    let bestUnder = null;    // plus grande largeur <= MAX_TARGET
    let bestAny = null;      // plus grande largeur tout court
    let fallback = '';       // première URL trouvée

    for (const img of images) {
      if (!img || typeof img !== 'object') continue;
      const url = normalizeValue(img.url || img.src || img.href);
      if (!url) continue;
      if (!fallback) fallback = url;

      const width = Number(img.width || img.w || img.Width || 0);
      if (Number.isFinite(width) && width > 0) {
        if (!bestAny || width > bestAny.width) bestAny = { url, width };
        if (width <= MAX_TARGET && (!bestUnder || width > bestUnder.width)) {
          bestUnder = { url, width };
        }
      }
    }

    return bestUnder?.url || bestAny?.url || fallback;
  };

  const medias = Array.isArray(listing.medias) ? listing.medias : [];
  for (const media of medias) {
    if (!media || typeof media !== 'object') continue;
      const img = pickOptimized(media.images);
    if (img) {
      push(img);
      continue;
    }
    push(media.mediaUrl);
    push(media.url);
  }

  const thumbs = Array.isArray(listing.thumbnails) ? listing.thumbnails : [];
  for (const thumb of thumbs) {
    if (thumb && typeof thumb === 'object') {
      push(thumb.url || thumb.src || thumb.href);
    } else {
      push(thumb);
    }
  }

  return out;
}

function keywordsToString(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .join(', ');
}

function splitKeywords(value) {
  const raw = String(value || '');
  return raw
    .split(/[,;\n]+/)
    .map((val) => String(val || '').trim())
    .filter(Boolean);
}

function pickThumbUrl(val) {
  if (!val) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val).trim();
  if (typeof val !== 'object') return '';
  return pickString(
    val.url,
    val.src,
    val.href,
    val.imageUrl,
    val.thumbnailUrl,
    val.mediaUrl,
    val.path,
    val.uri
  );
}

function getThumbSrc(item) {
  const list = getThumbCandidates(item);
  return list[0] || '';
}

function getThumbCandidates(item) {
  const local = pickString(
    item?.thumbLocal,
    item?.thumbnailLocal,
    item?.thumbPath,
    item?.thumbnailPath
  );
  const remoteList = [];
  const pushRemote = (value) => {
    const s = normalizeThumbnailPath(value);
    if (!s) return;
    if (!remoteList.includes(s)) remoteList.push(s);
  };
  const list = Array.isArray(item?.thumbnails) ? item.thumbnails : [];
  for (const val of list) {
    const s = pickThumbUrl(val);
    if (s) {
      pushRemote(s);
    }
  }
  if (remoteList.length === 0) {
    pushRemote(
      item?.thumbnailUrl,
      item?.thumbUrl,
      item?.thumbnail,
      item?.thumb
    );
  }
  const localNormalized = normalizeThumbnailPath(local);
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const s = String(value || '').trim();
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  // Priorité remote, fallback local : évite les miniatures cassées
  // quand un cache local pointe vers un fichier déplacé.
  remoteList.forEach(push);
  push(localNormalized);
  return out;
}

function buildMetaLine(item, t) {
  const seller = item?.seller ? `${t('resources.seller')}: ${item.seller}` : '';
  const kind = item?.listingType ? `${t('resources.type')}: ${item.listingType}` : '';
  const versions = item?.ueVersions?.length
    ? `${t('resources.ueVersions')}: ${toListString(item.ueVersions)}`
    : '';
  const targets = item?.targetPlatforms?.length
    ? `${t('resources.targets')}: ${toListString(item.targetPlatforms)}`
    : '';
  const formats = item?.assetFormats?.length
    ? `${t('resources.formats')}: ${toListString(item.assetFormats)}`
    : '';
  return [seller, kind, versions, targets, formats].filter(Boolean).join(' | ');
}

export default function ResourcesScreen({ refreshKey = 0 } = {}) {
  const id = readIdentity();
  const lang = String(id?.lang || 'fr').trim();
  const t = createT(lang);
  const favoritesUserScope = React.useMemo(() => resolveFavoritesUserScope(id), [id]);
  const favoriteFilterStorageKey = React.useMemo(
    () => `${FAVORITE_FILTER_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );
  const favoritesStorageKey = React.useMemo(
    () => `${RESOURCE_FAVORITES_STORAGE_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );

  const usageOptions = USAGE_VALUES
    .map((value) => ({
      value,
      label: t(`resources.detail.usage.${value}`) || value,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, lang === 'en' ? 'en' : 'fr', { sensitivity: 'base' }));
  const styleOptions = STYLE_VALUES.map((value) => ({
    value,
    label: t(`resources.detail.style.${value}`) || value,
  }));
  const ambianceOptions = AMBIANCE_VALUES.map((value) => ({
    value,
    label: t(`resources.detail.ambiance.${value}`) || value,
  }));
  const licenseOptions = LICENSE_VALUES.map((value) => ({
    value,
    label: t(`resources.detail.license.${value}`) || value,
  }));
  const noneLabel = React.useMemo(() => {
    const raw = t('common.none');
    const stripped = raw ? raw.replace(/[()]/g, '').trim() : '';
    if (!stripped) return 'Aucun';
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }, [t]);

  const [items, setItems] = React.useState([]);
  const [meta, setMeta] = React.useState({});
  const [query, setQuery] = React.useState('');
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [searchAdvanced, setSearchAdvanced] = React.useState(ADVANCED_INITIAL);
  const [resourceFavorites, setResourceFavorites] = React.useState(() => readFavoriteMap(favoritesStorageKey));
  const resourceFavoritesRef = React.useRef(resourceFavorites);
  const [quickFilters, setQuickFilters] = React.useState(() => {
    return {
      tested: readBooleanFlag(localStorage.getItem(TESTED_FILTER_KEY), false),
      favorite: readBooleanFlag(localStorage.getItem(favoriteFilterStorageKey), false),
      compatibleOnly: readBooleanFlag(localStorage.getItem(COMPAT_FILTER_KEY), false),
    };
  });
  const [busy, setBusy] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(() => {
    try {
      const raw = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 10) return Math.trunc(n);
    } catch {}
    return 25;
  });
  const [viewMode, setViewMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (VIEW_OPTIONS.has(stored)) return stored;
      if (stored === 'list') return 'cards';
    } catch {}
    return 'thumbs';
  });
  const [detailUid, setDetailUid] = React.useState('');
  const [detailData, setDetailData] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
const [detailDraft, setDetailDraft] = React.useState({
  usage: '',
  style: '',
  ambiance: '',
  license: '',
  purchased: false,
  tested: false,
  favorite: false,
  ratingQuality: 0,
  ratingPerformance: 0,
  tags: '',
  note: '',
  epicAccount: '',
});
const [detailMsg, setDetailMsg] = React.useState('');
const [_detailMsgType, setDetailMsgType] = React.useState('');
const [detailBusy, setDetailBusy] = React.useState(false);
const [detailDeleteBusy, setDetailDeleteBusy] = React.useState(false);
const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
const [tagInput, setTagInput] = React.useState('');
const [userUeVersions, setUserUeVersions] = React.useState([]);
const [unrealLauncherPath, setUnrealLauncherPath] = React.useState('');
  const launcherFetchRef = React.useRef(false);
const aliveRef = React.useRef(true);
const detailNoteRef = React.useRef(null);
const detailNoteDirtyRef = React.useRef(false);
const detailTagsRef = React.useRef(null);
const detailSavedRef = React.useRef('');
const detailSavedNoteRef = React.useRef('');
const detailSaveTimer = React.useRef(null);
const detailPendingRef = React.useRef(null);
const detailSavingRef = React.useRef(false);
const detailInitRef = React.useRef('');
const [lightboxIndex, setLightboxIndex] = React.useState(-1);
const [heroIndex, setHeroIndex] = React.useState(0);
const detailDropdownDirtyRef = React.useRef(false);
const deleteConfirmTriggerRef = React.useRef(null);
const deleteConfirmOkRef = React.useRef(null);

  const hasAdvancedFilters = React.useMemo(() => {
    return Object.entries(searchAdvanced || {}).some(([, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      return Boolean(v);
    });
  }, [searchAdvanced]);

  React.useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  // Persister la vue choisie
  React.useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  // Persister les filtres rapides (favoris, testé, compatible)
  React.useEffect(() => {
    try {
      localStorage.setItem(favoriteFilterStorageKey, quickFilters.favorite ? 'true' : 'false');
      localStorage.setItem(TESTED_FILTER_KEY, quickFilters.tested ? 'true' : 'false');
      localStorage.setItem(COMPAT_FILTER_KEY, quickFilters.compatibleOnly ? 'true' : 'false');
    } catch {}
  }, [quickFilters.favorite, quickFilters.tested, quickFilters.compatibleOnly, favoriteFilterStorageKey]);

  React.useEffect(() => {
    resourceFavoritesRef.current = resourceFavorites;
  }, [resourceFavorites]);

  React.useEffect(() => {
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
    setDetailData((prev) => (prev ? applyFavoriteToResource(prev, nextFavorites) : prev));
  }, [favoritesStorageKey, favoriteFilterStorageKey]);

  React.useEffect(() => {
    writeFavoriteMap(favoritesStorageKey, resourceFavorites);
  }, [favoritesStorageKey, resourceFavorites]);

  const fetchLibrary = React.useCallback(async () => {
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

  React.useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary, refreshKey]);

  const refreshUserVersions = React.useCallback(async () => {
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

  React.useEffect(() => {
    refreshUserVersions();
  }, [refreshUserVersions]);

  React.useEffect(() => {
    if (!unrealLauncherPath && !launcherFetchRef.current) {
      launcherFetchRef.current = true;
      refreshUserVersions().finally(() => {
        launcherFetchRef.current = false;
      });
    }
  }, [unrealLauncherPath, refreshUserVersions]);

  React.useEffect(() => {
    let cancelled = false;
    if (!detailUid) {
      detailInitRef.current = '';
      setDetailData(null);
      setDetailLoading(false);
      return () => {};
    }

    setDetailLoading(true);
    getLibraryItem(detailUid)
      .then((res) => {
        if (cancelled || !aliveRef.current) return;
        if (res?.item) {
          const normalizedItem = normalizeResource(res.item);
          setDetailData(applyFavoriteToResource(normalizedItem, resourceFavoritesRef.current));
        }
        else setDetailData(null);
      })
      .catch(() => {
        if (cancelled || !aliveRef.current) return;
        setDetailData(null);
      })
      .finally(() => {
        if (!cancelled && aliveRef.current) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailUid]);


  const sellerOptions = React.useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.seller);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);
  const epicAccountOptions = React.useMemo(() => {
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
  const typeOptions = React.useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.listingType);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);
  const distributionOptions = React.useMemo(() => {
    const seen = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const raw = normalizeValue(item?.distribution || item?.listingRaw?.distribution);
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [items]);
  const ueOptions = React.useMemo(() => {
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
  const userUeVersionSet = React.useMemo(() => new Set(userUeVersions), [userUeVersions]);
  const isUeIncompatible = React.useCallback((item) => {
    const versions = normalizeUeVersionList(item?.ueVersions);
    if (!versions.length || !userUeVersionSet.size) return false;
    return !versions.some((ver) => userUeVersionSet.has(ver));
  }, [userUeVersionSet]);
  const isUeCompatible = React.useCallback((item) => !isUeIncompatible(item), [isUeIncompatible]);
  const { filteredResources } = useFilteredResources(items, query, searchAdvanced, quickFilters, { isCompatible: isUeCompatible });
  React.useEffect(() => {
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
const detailItem = React.useMemo(() => {
  const key = normalizeUid(detailUid);
  if (!key) return null;
  if (detailData && normalizeUid(detailData?.uid) === key) return detailData;
  return (Array.isArray(items) ? items : []).find(
    (item) => normalizeUid(item?.uid) === key
  ) || null;
}, [items, detailUid, detailData]);
const detailEpicAccount = React.useMemo(
  () =>
    pickString(
      detailItem?.user?.displayName,
      detailItem?.user?.name,
      detailItem?.epicAccount,
      detailItem?.accountName
    ),
  [detailItem]
);
const detailForumUrl = React.useMemo(
  () =>
    pickString(
      detailItem?.forumUrl,
      detailItem?.comments_url,
      detailItem?.commentsUrl
    ),
  [detailItem]
);
  const detailList = React.useMemo(() => {
    const list = Array.isArray(filteredResources) ? filteredResources : [];
    if (!list.length) return Array.isArray(items) ? items : [];
    const key = normalizeUid(detailUid);
    if (!key) return list;
    const exists = list.some((item) => normalizeUid(item?.uid) === key);
    return exists ? list : (Array.isArray(items) ? items : []);
  }, [filteredResources, items, detailUid]);
  const detailIndex = React.useMemo(() => {
    const key = normalizeUid(detailUid);
    if (!key) return -1;
    return detailList.findIndex((item) => normalizeUid(item?.uid) === key);
  }, [detailList, detailUid]);
  const detailHasNav = detailList.length > 1 && detailIndex >= 0;

  const hasMore = !!meta?.lastImportHasMore;
  const importCount = Number(meta?.lastImportFound || items.length || 0);
  const incompleteMsg = hasMore
    ? (t('resources.importIncomplete', { count: importCount }))
    : '';
  const canClearSearch = !!query ||
    hasAdvancedFilters ||
    quickFilters.tested ||
    quickFilters.favorite ||
    searchExpanded;
  const detailTitle = detailItem?.title || detailItem?.uid || '';
const detailThumb = detailItem ? getThumbSrc(detailItem) : '';
const detailCreatedAt = detailItem?.createdAt
  ? formatDate(detailItem.createdAt, lang)
  : '';
const detailDescription = detailItem ? extractDescription(detailItem) : '';
  const detailTechnical = detailItem ? extractTechnicalDetails(detailItem) : [];
  const detailGalleryRaw = detailItem ? extractGalleryImages(detailItem) : [];
  const detailGallery = detailGalleryRaw
    .map((src) => normalizeThumbnailPath(src))
    .filter(Boolean);
  const galleryBlockItems = React.useMemo(() => {
    const out = [];
    const seen = new Set();
    const push = (src) => {
      const s = normalizeThumbnailPath(src);
      if (!s) return;
      const key = s.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    };
    push(detailThumb);
    detailGallery.forEach(push);
    return out;
  }, [detailThumb, detailGallery]);
  React.useEffect(() => {
    setHeroIndex(0);
  }, [detailUid]);
  React.useEffect(() => {
    setHeroIndex((prev) => {
      if (!galleryBlockItems.length) return 0;
      if (prev < 0 || prev >= galleryBlockItems.length) return 0;
      return prev;
    });
  }, [galleryBlockItems.length]);
  const heroActiveIndex = galleryBlockItems.length
    ? Math.min(Math.max(heroIndex, 0), galleryBlockItems.length - 1)
    : -1;
  const detailHeroSrc = heroActiveIndex >= 0 ? galleryBlockItems[heroActiveIndex] : '';
  const vendorDescription = [detailDescription, ...detailTechnical].filter(Boolean).join('\n\n');
  const heroNavAvailable = galleryBlockItems.length > 1;
const detailUeBadges = React.useMemo(() => {
  const list = Array.isArray(detailItem?.ueVersions) ? detailItem.ueVersions : [];
  if (!list.length) return null;
  const hasUserVersions = userUeVersionSet.size > 0;
  const nodes = list.map((ver, idx) => {
    const norm = normalizeUeVersion(ver);
    const isCompat = norm && hasUserVersions ? userUeVersionSet.has(norm) : false;
    const status = hasUserVersions ? (isCompat ? 'ok' : 'bad') : 'neutral';
    const color =
      status === 'ok'
        ? '#2ecc71'
        : status === 'bad'
          ? '#e74c3c'
          : 'var(--uu-color-text)';
    const border =
      status === 'ok'
        ? '#2ecc71'
        : status === 'bad'
          ? '#e74c3c'
          : 'var(--uu-color-border)';
    return (
      <span
        key={`${norm || ver}-${idx}`}
        className="uu-chip"
        style={{
          borderColor: border,
          color,
          padding: '4px 8px',
          background: 'transparent',
          opacity: 1,
          fontWeight: 600,
        }}
      >
        {ver}
      </span>
    );
  });
  return <div className="uu-row uu-gap-6 uu-wrap">{nodes}</div>;
}, [detailItem?.ueVersions, userUeVersionSet]);
const detailInfoLines = detailItem
  ? [
      { label: t('resources.seller'), value: normalizeValue(detailItem?.seller) },
      { label: t('resources.type'), value: normalizeValue(detailItem?.listingType) },
      { label: t('resources.ueVersions'), value: detailUeBadges || toListString(detailItem?.ueVersions) },
      { label: t('resources.targets'), value: toListString(detailItem?.targetPlatforms) },
      { label: t('resources.formats'), value: toListString(detailItem?.assetFormats) },
      { label: t('resources.detail.distribution'), value: normalizeValue(detailItem?.distribution) },
      { label: t('resources.detail.labels.epicAccount'), value: detailEpicAccount },
      detailForumUrl
        ? {
            label: 'Forum Epic',
            value: (
              <a href={detailForumUrl} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            )
          }
        : null,
      { label: t('resources.detail.addedAt'), value: detailCreatedAt },
    ].filter((row) => row && row.value)
  : [];
const lightboxItems = galleryBlockItems;
const lightboxOpen = lightboxIndex >= 0;
const detailTagsList = React.useMemo(() => normalizeList(splitKeywords(detailDraft.tags)), [detailDraft.tags]);
const detailTagsSet = React.useMemo(() => new Set(detailTagsList.map((t) => t.toLowerCase())), [detailTagsList]);
const addTagToDraft = React.useCallback((raw) => {
  const parts = String(raw || '')
    .split(/[,;\n]+/)
    .map((val) => normalizeValue(val).toLowerCase())
    .map((val) => (val.length > 48 ? val.slice(0, 48) : val))
    .filter(Boolean);

  if (!parts.length) return;

  const seen = new Set(detailTagsSet);
  const toAdd = [];
  parts.forEach((tag) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    toAdd.push(tag);
  });

  if (!toAdd.length) {
    setTagInput('');
    return;
  }

  const next = [...detailTagsList, ...toAdd];
  setDetailDraft((prev) => ({ ...prev, tags: keywordsToString(next) }));
  detailTagsDirtyRef.current = true;
  setTagInput('');
}, [detailTagsList, detailTagsSet]);
const removeTagFromDraft = React.useCallback((tag) => {
  const key = normalizeValue(tag).toLowerCase();
  if (!key) return;
  const next = detailTagsList.filter((t) => t.toLowerCase() !== key);
  setDetailDraft((prev) => ({ ...prev, tags: keywordsToString(next) }));
  detailTagsDirtyRef.current = true;
}, [detailTagsList]);
const handleTagInputKeyDown = React.useCallback((e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTagToDraft(tagInput);
  }
}, [addTagToDraft, tagInput]);

  React.useEffect(() => {
    if (!detailUid) return;
    if (!detailItem) {
      if (!busy && !detailLoading) setDetailUid('');
      return;
    }
    if (detailInitRef.current === detailUid) return;
    detailInitRef.current = detailUid;
    const user = detailItem?.user && typeof detailItem.user === 'object' ? detailItem.user : {};
    const usage = normalizeSelectValue(user.usage, USAGE_VALUES);
    const style = normalizeSelectValue(user.style, STYLE_VALUES);
    const ambiance = normalizeSelectValue(user.ambiance, AMBIANCE_VALUES);
    const license = normalizeSelectValue(user.license, LICENSE_VALUES);
    const purchased = normalizeBool(user.purchased);
    const tested = normalizeBool(user.tested);
    const favorite = normalizeBool(user.favorite);
    const ratingQuality = normalizeRating(user.ratingQuality);
    const ratingPerformance = normalizeRating(user.ratingPerformance);
    const userTags = normalizeList(user.keywords);
    const fallbackTags = extractFabTags(detailItem);
    const initialTags = userTags.length ? userTags : fallbackTags;
    const preservedStatus = normalizeValue(user.status);
    setDetailDraft({
      usage,
      style,
      ambiance,
      license,
      purchased,
      tested,
      favorite,
      ratingQuality,
      ratingPerformance,
      tags: keywordsToString(initialTags),
      note: String(user.note || ''),
    });
    const normalizedTags = normalizeList(initialTags).sort();
    detailSavedRef.current = JSON.stringify({
      status: preservedStatus,
      usage,
      style,
      ambiance,
      license,
      tested,
      favorite,
      ratingQuality,
      ratingPerformance,
      tags: normalizedTags,
      note: String(user.note || ''),
    });
    detailSavedNoteRef.current = String(user.note || '');
    detailNoteDirtyRef.current = false;
    setDetailMsg('');
    setDetailMsgType('');
  }, [detailUid, detailItem, busy, detailLoading]);

  React.useEffect(() => {
    const el = detailNoteRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [detailDraft.note, detailUid]);

  React.useEffect(() => {
    setTagInput('');
  }, [detailUid]);

  const buildPayload = React.useCallback(
    (noteOverride) => {
      const preservedType = normalizeValue(detailItem?.user?.type);
      const preservedStatus = normalizeValue(detailItem?.user?.status);
      return {
        status: preservedStatus,
        type: preservedType,
        usage: detailDraft.usage,
        style: detailDraft.style,
        ambiance: detailDraft.ambiance,
        license: detailDraft.license,
        purchased: !!detailDraft.purchased,
        tested: !!detailDraft.tested,
        ratingQuality: normalizeRating(detailDraft.ratingQuality),
        ratingPerformance: normalizeRating(detailDraft.ratingPerformance),
        keywords: splitKeywords(detailDraft.tags),
        note: noteOverride !== undefined ? String(noteOverride || '') : String(detailDraft.note || ''),
      };
    },
    [detailDraft, detailItem]
  );

  const buildSnapshot = React.useCallback((payload) => {
    return JSON.stringify({
      status: payload.status,
      usage: payload.usage,
      style: payload.style,
      ambiance: payload.ambiance,
      license: payload.license,
      tested: payload.tested,
      ratingQuality: payload.ratingQuality,
      ratingPerformance: payload.ratingPerformance,
      tags: normalizeList(payload.keywords).sort(),
      note: payload.note,
    });
  }, []);

const detailNoteFocusedRef = React.useRef(false);
const detailTagsDirtyRef = React.useRef(false);
const closeDeleteConfirm = React.useCallback((confirmed = false) => {
  setDeleteConfirmOpen(false);
  if (confirmed && !detailDeleteBusy) {
    void handleDeleteResource();
    return;
  }
  setTimeout(() => {
    deleteConfirmTriggerRef.current?.focus?.();
  }, 0);
}, [detailDeleteBusy, handleDeleteResource]);
const triggerDetailSave = React.useCallback(() => {
  detailDropdownDirtyRef.current = false;
  detailTagsDirtyRef.current = false;
  const payload = buildPayload();
  const snapshot = buildSnapshot(payload);
  detailSavedNoteRef.current = payload.note;
  detailNoteDirtyRef.current = false;
  if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
  saveDetail(payload, snapshot);
}, [buildPayload, buildSnapshot]);

// Permet de revenir à la liste en cliquant sur l'onglet actif (Sidebar)
React.useEffect(() => {
  window.__closeResourceDetail = async () => {
    triggerDetailSave();
    setDetailUid('');
  };
  return () => {
    if (window.__closeResourceDetail) delete window.__closeResourceDetail;
  };
}, [triggerDetailSave]);

  React.useEffect(() => {
    if (!deleteConfirmOpen) return undefined;
    const onKeyDown = (e) => {
      const key = String(e?.key || '').trim().toLowerCase();
      if (key === 'escape') {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteConfirm(false);
        return;
      }
      if (key === 'enter' && !detailDeleteBusy) {
        e.preventDefault();
        e.stopPropagation();
        closeDeleteConfirm(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      deleteConfirmOkRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [deleteConfirmOpen, detailDeleteBusy, closeDeleteConfirm]);

  // Raccourci clavier : Échap ferme le détail ressource et force la sauvegarde
  React.useEffect(() => {
    if (!detailUid) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Quand la lightbox est ouverte, c'est elle qui doit consommer Échap.
        if (lightboxOpen) return;
        if (deleteConfirmOpen) {
          e.preventDefault();
          e.stopPropagation();
          closeDeleteConfirm(false);
          return;
        }
        e.preventDefault();
        triggerDetailSave();
        setDetailUid('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailUid, triggerDetailSave, lightboxOpen, deleteConfirmOpen, closeDeleteConfirm]);

  React.useEffect(() => {
    if (!detailUid || !detailItem) return;
    if (detailNoteDirtyRef.current) return;
    const payload = buildPayload();
    const savedSnapshot = detailSavedRef.current || '';

    // Si un dropdown est en cours, on ne déclenche pas d'autosave pour éviter les fermetures
    if (detailDropdownDirtyRef.current || detailTagsDirtyRef.current) return;

    const freezeNote = detailNoteDirtyRef.current || detailNoteFocusedRef.current;
    const payloadFrozen = freezeNote ? { ...payload, note: detailSavedNoteRef.current || '' } : payload;
    const snapshotFrozen = buildSnapshot(payloadFrozen);
    if (snapshotFrozen === savedSnapshot) return;
    if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
    detailSaveTimer.current = setTimeout(() => {
      saveDetail(payloadFrozen, snapshotFrozen);
    }, 700);
    return () => {
      if (detailSaveTimer.current) clearTimeout(detailSaveTimer.current);
    };
  }, [detailDraft, detailUid, detailItem, buildPayload, buildSnapshot]);

  React.useEffect(() => {
    if (detailUid) return;
    if (deleteConfirmOpen) setDeleteConfirmOpen(false);
  }, [detailUid, deleteConfirmOpen]);

  React.useEffect(() => {
    if (!detailMsg) return;
    const t = setTimeout(() => {
      setDetailMsg('');
      setDetailMsgType('');
    }, 2000);
    return () => clearTimeout(t);
  }, [detailMsg]);

  React.useEffect(() => {
    setLightboxIndex(-1);
  }, [detailUid]);

  React.useEffect(() => {
    if (lightboxIndex < 0) return;
    if (lightboxIndex >= lightboxItems.length) {
      setLightboxIndex(lightboxItems.length ? 0 : -1);
    }
  }, [lightboxIndex, lightboxItems.length]);

  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLightbox(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, lightboxItems.length]);

  function handleOpen(url) {
    const target = String(url || '').trim();
    if (!target) return;
    if (typeof window.electron?.openExternal === 'function') {
      window.electron.openExternal(target);
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  function isFabListingUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    try {
      const u = new URL(raw);
      return /\.fab\.com$/i.test(u.hostname) || u.hostname.toLowerCase().endsWith('fab.com');
    } catch {
      return raw.toLowerCase().includes('fab.com');
    }
  }

  function buildLauncherLibraryLink() {
    return 'com.epicgames.launcher://ue/library';
  }

  function buildFabLauncherUrl(item) {
    const uid = String(item?.uid || '').trim();
    if (uid) return `https://www.fab.com/plugins/egl/listings/${uid}`;
    const rawUrl = String(item?.listingUrl || '').trim();
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl);
      const host = (u.hostname || '').toLowerCase();
      if (!host.endsWith('fab.com')) return rawUrl;
      const segments = (u.pathname || '').split('/').filter(Boolean);
      const idx = segments.indexOf('listings');
      const listingId = idx >= 0 ? segments[idx + 1] : segments[segments.length - 1];
      if (!listingId) return rawUrl;
      return `https://www.fab.com/plugins/egl/listings/${listingId}`;
    } catch {
      return rawUrl;
    }
  }

  function buildLauncherDeepLink(item) {
    const rawUrl = String(item?.listingUrl || '').trim();
    const title = String(item?.title || '').trim();
    if (!rawUrl && !title) return '';

    const slugify = (s) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/--+/g, '-');

    const pickBestSlug = () => {
      const candidates = [
        item?.entitlementUid,
        item?.entitlementId,
        item?.listingRaw?.slug,
        item?.listingRaw?.urlSlug,
        item?.listingRaw?.slugName,
        item?.listingRaw?.id,
        item?.listingRaw?.uid,
        item?.listingRaw?.catalogItemId,
        item?.listingSlug,
        item?.slug,
        item?.uid,
      ]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
      return candidates[0] || '';
    };

    const build = (slug, useProductContent = false) => {
      if (!slug) return '';
      const path = useProductContent ? 'productcontent' : 'product';
      return `com.epicgames.launcher://ue/marketplace/${path}/${encodeURIComponent(slug)}`;
    };

    const toProductContentId = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (/^[0-9a-f]{32}$/i.test(raw)) return raw;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
        return raw.replace(/-/g, '');
      }
      return '';
    };

    const buildFromAnyId = (value) => {
      const pc = toProductContentId(value);
      if (pc) return build(pc, true);
      return build(String(value || '').trim(), false);
    };

    if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        const host = (u.host || '').toLowerCase();
        const segments = (u.pathname || '').split('/').filter(Boolean);
        const last = segments.pop() || '';
        const secondLast = segments.pop() || '';
        const slugFromUrl =
          u.searchParams.get('id') ||
          u.searchParams.get('offerId') ||
          u.searchParams.get('slug') ||
          last ||
          secondLast;

        // Fab : privilégier un slug explicite (si disponible), sinon on évite le slugify titre
        if (host.includes('fab.com')) {
          const directSlug = pickString(
            item?.listingRaw?.marketplaceSlug,
            item?.listingRaw?.ueMarketplaceSlug,
            item?.listingRaw?.unrealMarketplaceSlug,
            item?.listingRaw?.urlSlug,
            item?.listingRaw?.slug,
            item?.listingSlug,
            item?.slug
          );
          if (directSlug) return build(directSlug);
          return '';
        }

        if (host.includes('unrealengine.com') || host.includes('epicgames.com')) {
          // Marketplace classique : slug suffit
          if (slugFromUrl) return build(slugFromUrl);
        }
      } catch {}
    }

    const candidate = pickBestSlug();
    if (candidate) return buildFromAnyId(candidate);

    const fallbackSlug = slugify(title);
    return build(fallbackSlug);
  }

  async function handleLaunchInUnreal() {
    if (!detailItem) return;
    const listingUrl = String(detailItem?.listingUrl || '').trim();
    const isFab = isFabListingUrl(listingUrl);

    if (isFab) {
      const deeplink = buildLauncherDeepLink(detailItem);
      if (deeplink) {
        if (typeof window.electron?.openExternal === 'function') {
          window.electron.openExternal(deeplink);
        } else {
          window.location.assign(deeplink);
        }
        return;
      }
      const fabUrl = buildFabLauncherUrl(detailItem);
      let exe = String(unrealLauncherPath || '').trim();
      if (!exe) {
        exe = await refreshUserVersions();
      }
      if (exe && fabUrl && typeof window.electron?.openLauncherUrl === 'function') {
        window.electron.openLauncherUrl(exe, fabUrl);
        return;
      }
      const libraryLink = buildLauncherLibraryLink();
      if (typeof window.electron?.openExternal === 'function') {
        window.electron.openExternal(libraryLink);
      } else {
        window.location.assign(libraryLink);
      }
      return;
    }

    const deeplink = buildLauncherDeepLink(detailItem);
    if (deeplink) {
      if (typeof window.electron?.openExternal === 'function') {
        window.electron.openExternal(deeplink);
      } else {
        window.location.assign(deeplink);
      }
      return;
    }

    let exe = String(unrealLauncherPath || '').trim();
    if (!exe) {
      exe = await refreshUserVersions();
    }
    if (!exe) {
      const fallbackUrl = String(detailItem?.listingUrl || '').trim();
      if (fallbackUrl) handleOpen(fallbackUrl);
      return;
    }
    if (typeof window.electron?.openExternal === 'function') {
      window.electron.openExternal(exe);
    } else {
      window.location.assign(exe);
    }
  }

  const handleResourceImageContextMenu = React.useCallback((event, source) => {
    const src = String(source || '').trim();
    if (!src) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.electron?.showImageContextMenu === 'function') {
      void window.electron.showImageContextMenu(src);
      return;
    }
    if (typeof window.electron?.copyImageToClipboard === 'function') {
      void window.electron.copyImageToClipboard(src);
    }
  }, []);

  function openLightboxAt(index) {
    if (!lightboxItems.length) return;
    const safeIndex = Math.min(Math.max(index, 0), lightboxItems.length - 1);
    setLightboxIndex(safeIndex);
  }

  function closeLightbox() {
    setLightboxIndex(-1);
  }

  function stepHero(delta) {
    if (!galleryBlockItems.length) return;
    setHeroIndex((prev) => {
      const base = prev >= 0 && prev < galleryBlockItems.length ? prev : 0;
      const next = (base + delta + galleryBlockItems.length) % galleryBlockItems.length;
      return next;
    });
  }

  function stepLightbox(delta) {
    if (!lightboxItems.length) return;
    setLightboxIndex((prev) => {
      if (prev < 0) return prev;
      const next = (prev + delta + lightboxItems.length) % lightboxItems.length;
      return next;
    });
  }

  function openDetail(item) {
    const uid = String(item?.uid || '').trim();
    if (!uid) return;
    setDetailUid(uid);
  }

  function stepDetail(delta) {
    if (!detailList.length) return;
    const base = detailIndex >= 0 ? detailIndex : 0;
    const next = (base + delta + detailList.length) % detailList.length;
    const nextUid = detailList[next]?.uid;
    if (!nextUid) return;
    setDetailUid(String(nextUid));
  }

  const setResourceFavoriteLocal = React.useCallback((resourceUid, isFavorite) => {
    const uid = normalizeUid(resourceUid);
    if (!uid) return;
    setResourceFavorites((prev) => {
      const next = { ...(prev && typeof prev === 'object' ? prev : {}) };
      if (isFavorite === true) next[uid] = true;
      else delete next[uid];
      return next;
    });
    setItems((prev) => prev.map((it) => {
      if (normalizeUid(it?.uid) !== uid) return it;
      return {
        ...it,
        user: { ...(it?.user && typeof it.user === 'object' ? it.user : {}), favorite: isFavorite === true },
      };
    }));
    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return {
          ...prev,
          user: { ...(prev.user || {}), favorite: isFavorite === true },
        };
      });
      setDetailDraft((prev) => ({ ...(prev || {}), favorite: isFavorite === true }));
    }
  }, [detailUid, detailItem]);

  async function toggleUserFlag(item, field) {
    const uid = normalizeUid(item?.uid);
    if (!uid) return;
    const prevValue = normalizeBool(item?.user?.[field]);
    const nextValue = !prevValue;
    if (field === 'favorite') {
      setResourceFavoriteLocal(uid, nextValue);
      return;
    }
    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    const applyFlag = (val) => (it) => (
      normalizeUid(it?.uid) === uid
        ? { ...it, user: { ...(it.user || {}), [field]: val } }
        : it
    );

    setItems((prev) => prev.map(applyFlag(nextValue)));
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return { ...prev, user: { ...(prev.user || {}), [field]: nextValue } };
      });
      setDetailDraft((prev) => ({ ...prev, [field]: nextValue }));
    }

    if (isActiveDetail) return;

    const baseUser = item?.user && typeof item.user === 'object' ? item.user : {};
    const payload = { ...baseUser, [field]: nextValue };

    try {
      const res = await postLibraryItem({ uid, user: payload }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok && res?.item) {
        const normalizedItem = applyFavoriteToResource(normalizeResource(res.item), resourceFavoritesRef.current);
        setItems((prev) => prev.map((it) => (
          normalizeUid(it?.uid) === uid ? normalizedItem : it
        )));
      } else {
        setItems((prev) => prev.map(applyFlag(prevValue)));
      }
    } catch {
      setItems((prev) => prev.map(applyFlag(prevValue)));
    }
  }

  const toggleFavorite = React.useCallback((item) => toggleUserFlag(item, 'favorite'), [toggleUserFlag]);
  const togglePurchased = React.useCallback((item) => toggleUserFlag(item, 'purchased'), [detailUid, detailItem]);
  const toggleTested = React.useCallback((item) => toggleUserFlag(item, 'tested'), [detailUid, detailItem]);

  // Mise à jour générique d'un champ "user" (usage, style, ambiance, licence, rating, etc.)
  const updateUserFields = React.useCallback(
    async (item, patch) => {
      const uid = normalizeUid(item?.uid);
      if (!uid || !patch || typeof patch !== 'object') return;
      const effectivePatch = { ...patch };
      if (Object.prototype.hasOwnProperty.call(effectivePatch, 'favorite')) {
        delete effectivePatch.favorite;
      }
      if (!Object.keys(effectivePatch).length) return;
      const prevUser = (item?.user && typeof item.user === 'object') ? item.user : {};
      const nextUser = { ...prevUser, ...effectivePatch };
      const applyUser = (userObj) => (it) =>
        normalizeUid(it?.uid) === uid ? { ...it, user: { ...(it.user || {}), ...userObj } } : it;

      setItems((prev) => prev.map(applyUser(nextUser)));

      const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
      if (isActiveDetail) {
        setDetailData((prev) => {
          if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
          return { ...prev, user: { ...(prev.user || {}), ...nextUser } };
        });
        setDetailDraft((prev) => {
          if (!prev) return prev;
          const draft = { ...prev };
          if ('usage' in effectivePatch) draft.usage = normalizeSelectValue(effectivePatch.usage, USAGE_VALUES);
          if ('style' in effectivePatch) draft.style = normalizeSelectValue(effectivePatch.style, STYLE_VALUES);
          if ('ambiance' in effectivePatch) draft.ambiance = normalizeSelectValue(effectivePatch.ambiance, AMBIANCE_VALUES);
          if ('license' in effectivePatch) draft.license = normalizeSelectValue(effectivePatch.license, LICENSE_VALUES);
          if ('purchased' in effectivePatch) draft.purchased = !!effectivePatch.purchased;
          if ('tested' in effectivePatch) draft.tested = !!effectivePatch.tested;
          if ('ratingQuality' in effectivePatch) draft.ratingQuality = normalizeRating(effectivePatch.ratingQuality);
          if ('ratingPerformance' in effectivePatch) draft.ratingPerformance = normalizeRating(effectivePatch.ratingPerformance);
          return draft;
        });
      }

      try {
        const res = await postLibraryItem({ uid, user: nextUser }).catch(() => ({}));
        const ok = res && res.ok !== false;
        if (ok && res?.item) {
          const normalizedBaseItem =
            res.item && res.item.user
              ? { ...res.item, user: normalizeUserUsageFromServer(res.item.user) }
              : res.item;
          const normalizedItem = applyFavoriteToResource(normalizeResource(normalizedBaseItem), resourceFavoritesRef.current);
          setItems((prev) =>
            prev.map((it) => (normalizeUid(it?.uid) === uid ? normalizedItem || it : it))
          );
          if (isActiveDetail && res.item?.user) {
            setDetailData((prev) => {
              if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
              const nu = normalizeUserUsageFromServer(res.item.user);
              return applyFavoriteToResource({ ...prev, user: nu }, resourceFavoritesRef.current);
            });
          }
        } else {
          // revert
          setItems((prev) => prev.map(applyUser(prevUser)));
        }
      } catch {
        setItems((prev) => prev.map(applyUser(prevUser)));
      }
    },
    [detailUid, detailItem]
  );

  const setUserSelect = React.useCallback(
    (item, field, value, allowed) => {
      const normalized = normalizeSelectValue(value, allowed);
      updateUserFields(item, { [field]: normalized });
    },
    [updateUserFields]
  );

  const setUserRating = React.useCallback(
    (item, field, value) => {
      const n = normalizeRating(value);
      updateUserFields(item, { [field]: n });
    },
    [updateUserFields]
  );

  async function addKeywordQuick(item, rawKeyword) {
    const uid = normalizeUid(item?.uid);
    let keyword = normalizeValue(rawKeyword);
    if (!uid || !keyword) return;
    const baseUser = item?.user && typeof item.user === 'object' ? item.user : {};
    const existingKeywords = normalizeList(baseUser.keywords);
    if (existingKeywords.includes(keyword)) return;
    const nextKeywords = [...existingKeywords, keyword];
    const applyKeywords = (kwList) => (it) => (
      normalizeUid(it?.uid) === uid
        ? { ...it, user: { ...(it.user || {}), keywords: kwList } }
        : it
    );

    setItems((prev) => prev.map(applyKeywords(nextKeywords)));

    const isActiveDetail = normalizeUid(detailUid) === uid && !!detailItem;
    if (isActiveDetail) {
      setDetailData((prev) => {
        if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
        return { ...prev, user: { ...(prev.user || {}), keywords: nextKeywords } };
      });
      setDetailDraft((prev) => {
        const current = normalizeList(splitKeywords(prev.tags));
        if (current.includes(keyword)) return prev;
        const merged = [...current, keyword];
        return { ...prev, tags: keywordsToString(merged) };
      });
    }

    try {
      const res = await postLibraryItem({ uid, user: { ...baseUser, keywords: nextKeywords } }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok && res?.item) {
        const normalizedItem = applyFavoriteToResource(normalizeResource(res.item), resourceFavoritesRef.current);
        setItems((prev) => prev.map((it) => (
          normalizeUid(it?.uid) === uid ? normalizedItem : it
        )));
        if (isActiveDetail) {
          setDetailData((prev) => {
            if (!prev || normalizeUid(prev?.uid) !== uid) return prev;
            return res.item?.user
              ? applyFavoriteToResource({ ...prev, user: res.item.user }, resourceFavoritesRef.current)
              : prev;
          });
        }
      } else {
        setItems((prev) => prev.map(applyKeywords(existingKeywords)));
      }
    } catch {
      setItems((prev) => prev.map(applyKeywords(existingKeywords)));
    }
  }

  async function handleDeleteResource() {
    const uid = normalizeUid(detailUid);
    if (!uid || detailDeleteBusy) return;
    setDetailMsg('');
    setDetailMsgType('');
    setDetailDeleteBusy(true);
    try {
      const baseUser = detailItem?.user && typeof detailItem.user === 'object' ? detailItem.user : {};
      const user = { ...baseUser, status: 'deleted', deletedAt: new Date().toISOString() };
      const res = await postLibraryItem({ uid: detailUid, user }).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok) {
        setItems((prev) => prev.filter((it) => normalizeUid(it?.uid) !== uid));
        setDetailUid('');
      } else {
        setDetailMsgType('error');
        setDetailMsg(t('resources.detail.deleteError'));
      }
    } catch {
      setDetailMsgType('error');
      setDetailMsg(t('resources.detail.deleteError'));
    } finally {
      setDetailDeleteBusy(false);
    }
  }

  async function saveDetail(payload, snapshot) {
    if (!detailUid) return;
    if (detailSavingRef.current) {
      detailPendingRef.current = { payload, snapshot };
      return;
    }
    detailSavingRef.current = true;
    setDetailBusy(true);
    setDetailMsg('');
    setDetailMsgType('');
    try {
      const body = {
        uid: detailUid,
        user: payload,
      };
      const res = await postLibraryItem(body).catch(() => ({}));
      const ok = res && res.ok !== false;
      if (ok && res?.item) {
        const normalizedItem = applyFavoriteToResource(normalizeResource(res.item), resourceFavoritesRef.current);
        setItems((prev) => prev.map((it) => (
          normalizeUid(it?.uid) === normalizeUid(detailUid) ? normalizedItem : it
        )));
        setDetailData((prev) => {
          if (!prev || normalizeUid(prev?.uid) !== normalizeUid(detailUid)) return prev;
          return res.item?.user
            ? applyFavoriteToResource({ ...prev, user: res.item.user }, resourceFavoritesRef.current)
            : prev;
        });
        if (snapshot) {
          detailSavedRef.current = snapshot;
          try {
            const parsed = JSON.parse(snapshot);
            detailSavedNoteRef.current = String(parsed?.note || '');
          } catch {
            detailSavedNoteRef.current = payload.note || '';
          }
        }
        setDetailMsgType('ok');
        setDetailMsg(t('resources.detail.saveOk'));
      } else {
        setDetailMsgType('error');
        setDetailMsg(t('resources.detail.saveError'));
      }
    } catch {
      setDetailMsgType('error');
      setDetailMsg(t('resources.detail.saveError'));
    } finally {
      detailSavingRef.current = false;
      setDetailBusy(false);
      if (detailPendingRef.current) {
        const pending = detailPendingRef.current;
        detailPendingRef.current = null;
        if (pending && pending.snapshot !== detailSavedRef.current) {
          saveDetail(pending.payload, pending.snapshot);
        }
      }
    }
  }

  if (detailUid && detailItem) {
    return (
      <div className="uu-page uu-page-compact resources-page">
        <div className="uu-section">
          <div className="uu-row uu-align-center uu-gap-8">
            <button
              className="uu-btn"
              onClick={() => {
                triggerDetailSave();
                setDetailUid('');
              }}
            >
              {t('resources.detail.back')}
            </button>
            <div className="uu-resource-title">{detailTitle}</div>
            {detailItem?.uid ? (
              <span className="uu-id-tag uu-muted">[{detailItem.uid}]</span>
            ) : null}
            <div style={{ marginLeft: 'auto' }} />
            {detailItem?.listingUrl ? (
              <button className="uu-btn" onClick={() => { void handleLaunchInUnreal(); }}>
                {t('resources.openFab')}
              </button>
            ) : null}
            <button
              ref={deleteConfirmTriggerRef}
              className="uu-btn"
              onClick={() => {
                setDeleteConfirmOpen(true);
                setDetailMsg('');
                setDetailMsgType('');
              }}
              disabled={detailDeleteBusy}
            >
              {detailDeleteBusy
                ? t('common.loading')
                : t('common.delete')}
            </button>
          </div>
        </div>

        <div className="uu-section mt-16 uu-col uu-gap-16">
          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-resource-detail-hero">
              {detailHasNav ? (
                <button
                  type="button"
                  className="uu-resource-hero-nav left"
                  onClick={() => stepDetail(-1)}
                  disabled={!detailHasNav}
                  title={t('common.prev')}
                >
                  ‹
                </button>
              ) : null}
            {heroNavAvailable ? (
              <button
                type="button"
                className="uu-resource-hero-inline-nav left"
                onClick={() => stepHero(-1)}
                title={t('common.prev')}
                aria-label={t('common.prev')}
              >
                ‹
              </button>
            ) : null}
              {detailHeroSrc ? (
                <button
                  type="button"
                  className="uu-resource-hero-btn"
                  onClick={() => openLightboxAt(heroActiveIndex >= 0 ? heroActiveIndex : 0)}
                  onContextMenu={(event) => {
                    handleResourceImageContextMenu(event, detailHeroSrc);
                  }}
                >
                  <img
                    className="uu-resource-detail-thumb-hero"
                    src={detailHeroSrc}
                    alt={detailTitle}
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      if (galleryBlockItems.length <= 1) return;
                      setHeroIndex((prev) => {
                        const next = prev + 1;
                        if (next >= galleryBlockItems.length) return prev;
                        return next;
                      });
                    }}
                  />
                </button>
              ) : (
                <div className="uu-resource-detail-thumb-hero placeholder">
                  {t('resources.noThumbnail')}
                </div>
              )}
            {heroNavAvailable ? (
              <button
                type="button"
                className="uu-resource-hero-inline-nav right"
                onClick={() => stepHero(1)}
                title={t('common.next')}
                aria-label={t('common.next')}
              >
                ›
              </button>
            ) : null}
              {detailHasNav ? (
                <button
                  type="button"
                  className="uu-resource-hero-nav right"
                  onClick={() => stepDetail(1)}
                  disabled={!detailHasNav}
                  title={t('common.next')}
                >
                  ›
                </button>
              ) : null}
            </div>
          </div>

          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-row uu-align-center uu-gap-12" style={{ flexWrap: 'wrap' }}>
              <strong className="uu-block-title">
                {t('resources.detail.indexation')}
              </strong>
              {/* inline messages désactivés sur la page détail ressource */}
            </div>

            <div className="uu-col uu-gap-12">
              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>
                    {t('resources.detail.labels.usage')}
                  </label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={detailDraft.usage}
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, usage: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
                  >
                    <option value="">{noneLabel}</option>
                    {usageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>
                    {t('resources.detail.labels.style')}
                  </label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={detailDraft.style}
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, style: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
                  >
                    <option value="">{noneLabel}</option>
                    {styleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>
                    {t('resources.detail.labels.ambiance')}
                  </label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={detailDraft.ambiance}
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, ambiance: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
                  >
                    <option value="">{noneLabel}</option>
                    {ambianceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>
                    {t('resources.detail.labels.license')}
                  </label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={detailDraft.license}
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, license: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
                  >
                    <option value="">{noneLabel}</option>
                    {licenseOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

            <div className="uu-detail-flags-row">
              <div className="uu-detail-flag">
                <label className="uu-label">{t('resources.detail.labels.purchased')}</label>
                <input
                  type="checkbox"
                  checked={!!detailDraft.purchased}
                  onChange={(e) => setDetailDraft((prev) => ({ ...prev, purchased: !!e.target.checked }))}
                  disabled={detailBusy}
                />
              </div>
              <div className="uu-detail-flag">
                <label className="uu-label" htmlFor="resource-tested">
                  {t('resources.detail.labels.tested')}
                </label>
                <input
                  id="resource-tested"
                  type="checkbox"
                  checked={!!detailDraft.tested}
                  onChange={(e) => setDetailDraft((prev) => ({ ...prev, tested: !!e.target.checked }))}
                />
              </div>
              <div className="uu-detail-flag">
                <span className="uu-label">
                  {t('resources.detail.labels.favorite')}
                </span>
                <button
                  type="button"
                  className={`uu-fav-btn ${detailDraft.favorite ? 'active' : ''}`}
                  onClick={() => setResourceFavoriteLocal(detailUid, !detailDraft.favorite)}
                  aria-pressed={detailDraft.favorite ? 'true' : 'false'}
                  title={t('resources.detail.labels.favorite')}
                >
                  ★
                </button>
              </div>
              <div className="uu-detail-flag">
                <label className="uu-label">
                  {t('resources.detail.labels.quality')}
                </label>
                <div className="uu-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={`quality-${n}`}
                        type="button"
                        className={`uu-rating-btn ${detailDraft.ratingQuality >= n ? 'active' : ''}`}
                        onClick={() => setDetailDraft((prev) => ({
                          ...prev,
                          ratingQuality: prev.ratingQuality === n ? 0 : n,
                        }))}
                        aria-pressed={detailDraft.ratingQuality >= n ? 'true' : 'false'}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              <div className="uu-detail-flag" style={{ flex: '1 1 auto' }}>
                <label className="uu-label">
                  {t('resources.detail.labels.performance')}
                </label>
                <div className="uu-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={`perf-${n}`}
                        type="button"
                        className={`uu-rating-btn ${detailDraft.ratingPerformance >= n ? 'active' : ''}`}
                        onClick={() => setDetailDraft((prev) => ({
                          ...prev,
                          ratingPerformance: prev.ratingPerformance === n ? 0 : n,
                        }))}
                        aria-pressed={detailDraft.ratingPerformance >= n ? 'true' : 'false'}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="uu-row wrap">
                <div className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.note')}</div>
                <div className="uu-value">
                  <textarea
                    ref={detailNoteRef}
                    className="uu-input"
                    rows={1}
                    style={{ overflow: 'hidden' }}
                    value={detailDraft.note}
                    onChange={(e) => {
                      const el = e.target;
                      el.style.height = '0px';
                      el.style.height = `${el.scrollHeight}px`;
                      detailNoteDirtyRef.current = true;
                      setDetailDraft((prev) => ({ ...prev, note: el.value }));
                    }}
                    onFocus={() => {
                      detailNoteFocusedRef.current = true;
                    }}
                    onBlur={() => {
                      detailNoteFocusedRef.current = false;
                    }}
                  />
                </div>
              </div>

              <div className="uu-row wrap">
                <div className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.tags')}</div>
                <div className="uu-row" style={{ flex: '1 1 auto' }}>
                  <input
                    ref={detailTagsRef}
                    className="uu-input"
                    style={{ minWidth: '200px', flex: '1 1 260px' }}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => addTagToDraft(tagInput)}
                    placeholder={t('resources.search.placeholderTags')}
                  />
                </div>
              </div>
              <div className="uu-row uu-gap-6 uu-wrap" style={{ marginLeft: '90px' }}>
                {detailTagsList.map((tag) => (
                  <span
                    key={tag}
                    className="uu-chip"
                    style={{ border: 'none', padding: '6px 10px', gap: '8px' }}
                  >
                    <span style={{ marginRight: '6px' }}>{tag}</span>
                    <button
                      type="button"
                      className="uu-chip-remove"
                      onClick={() => removeTagFromDraft(tag)}
                      aria-label={t('common.delete')}
                      style={{ padding: '2px 6px', minWidth: 'auto', height: '22px' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div className="uu-card uu-col uu-gap-12">
            <strong className="uu-block-title">
              {t('resources.detail.gallery')}
            </strong>
            {galleryBlockItems.length ? (
              <div className="uu-resource-gallery">
                {galleryBlockItems.map((src, idx) => (
                  <button
                    key={`img-${idx}`}
                    type="button"
                    className="uu-resource-gallery-btn"
                    onClick={() => openLightboxAt(idx)}
                    onContextMenu={(event) => {
                      handleResourceImageContextMenu(event, src);
                    }}
                  >
                    <img
                      className="uu-resource-gallery-img"
                      src={src}
                      alt={detailTitle}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="uu-muted">{t('resources.noThumbnail')}</div>
            )}
          </div>

          <div className="uu-card uu-col uu-gap-12">
            <strong className="uu-block-title">
              {t('resources.detail.infoTitle')}
            </strong>
            <div className="uu-col uu-gap-8">
              {detailInfoLines.map((row, idx) => (
                <div key={`${row.label}-${idx}`} className="uu-row uu-gap-8">
                  <div className="uu-label w-160">{row.label}</div>
                  <div className="uu-value uu-muted">{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {vendorDescription ? (
            <div className="uu-card uu-col uu-gap-12">
              <strong className="uu-block-title">
                {t('resources.detail.vendorDescription')}
              </strong>
              <div className="uu-resource-detail-text">{vendorDescription}</div>
            </div>
          ) : null}
        </div>

        {lightboxOpen && lightboxItems.length ? (
          <div className="uu-lightbox" onClick={closeLightbox}>
            <div className="uu-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <button className="uu-lightbox-close" type="button" onClick={closeLightbox}>
                ×
              </button>
              <button
                className="uu-lightbox-nav left"
                type="button"
                onClick={() => stepLightbox(-1)}
                disabled={lightboxItems.length < 2}
              >
                ‹
              </button>
              <img
                className="uu-lightbox-img"
                src={lightboxItems[lightboxIndex]}
                alt={detailTitle}
                onContextMenu={(event) => {
                  handleResourceImageContextMenu(event, lightboxItems[lightboxIndex]);
                }}
              />
              <button
                className="uu-lightbox-nav right"
                type="button"
                onClick={() => stepLightbox(1)}
                disabled={lightboxItems.length < 2}
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
        {deleteConfirmOpen ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2200,
            }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !detailDeleteBusy) {
                closeDeleteConfirm(false);
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
                padding: '16px',
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div style={{ fontWeight: 600, marginBottom: '10px' }}>
                {t('production.confirm.title')}
              </div>
              <div style={{ marginBottom: '14px', lineHeight: 1.35 }}>
                {`Supprimer la ressource "${detailTitle || detailUid || '-'}" ?`}
              </div>
              <div className="uu-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="uu-btn"
                  disabled={detailDeleteBusy}
                  onClick={() => closeDeleteConfirm(false)}
                >
                  {t('production.confirm.cancel')}
                </button>
                <button
                  ref={deleteConfirmOkRef}
                  type="button"
                  className="uu-btn prod-toggle-active"
                  disabled={detailDeleteBusy}
                  onClick={() => closeDeleteConfirm(true)}
                >
                  {detailDeleteBusy ? t('common.loading') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="uu-page uu-page-compact resources-page">
      <div className="uu-section">
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
          <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: '0 0 auto' }}>
            <input
              className="uu-input"
              style={{ width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' }}
              placeholder={t('resources.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              onClick={() => {
                setQuery('');
                setSearchAdvanced(ADVANCED_INITIAL);
                setQuickFilters({ tested: false, favorite: false, compatibleOnly: false });
                setSearchExpanded(false);
              }}
              disabled={!canClearSearch}
              title={t('resources.search.clear')}
              style={{ width: '36px', minWidth: '36px', height: '36px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={() => setSearchExpanded(true)}
              style={{ height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' }}
            >
              {t('resources.search.advancedButton')}
            </button>
          </div>

          <div className="uu-row uu-align-center" style={{ flex: '0 0 auto', marginLeft: '12px', gap: '32px' }}>
            <label className="uu-check">
              <input
                type="checkbox"
                checked={!!quickFilters.tested}
                onChange={() => setQuickFilters((prev) => ({ ...prev, tested: !prev.tested }))}
              />
              {t('resources.detail.labels.tested')}
            </label>
            <label className="uu-check" style={{ opacity: compatDisabled ? 0.5 : 1 }}>
              <input
                type="checkbox"
                disabled={compatDisabled}
                checked={!!quickFilters.compatibleOnly}
                onChange={() => setQuickFilters((prev) => ({ ...prev, compatibleOnly: !prev.compatibleOnly }))}
              />
              {compatLabel}
            </label>
            <div className="uu-row uu-gap-6 uu-align-center">
              <button
                type="button"
                className={`uu-fav-filter ${quickFilters.favorite ? 'active' : ''}`}
                onClick={() => setQuickFilters((prev) => ({ ...prev, favorite: !prev.favorite }))}
                aria-pressed={quickFilters.favorite ? 'true' : 'false'}
                title={t('resources.detail.labels.favorite')}
              >
                ★
              </button>
              <span>{t('resources.detail.labels.favorite')}</span>
            </div>
          </div>
          <div className="uu-row uu-gap-4" style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className={`uu-btn ${viewMode === 'thumbs' ? 'prod-toggle-active' : ''}`}
              onClick={() => setViewMode('thumbs')}
            >
              {t('resources.view.thumbs')}
            </button>
            <button
              type="button"
              className={`uu-btn ${viewMode === 'cards' ? 'prod-toggle-active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              {t('resources.view.cards')}
            </button>
          </div>
        </div>
        {incompleteMsg ? (
          <div className="uu-msg error mt-8">
            {incompleteMsg}
          </div>
        ) : null}
      </div>

      {searchExpanded ? (
        <div className="uu-section">
          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
              <strong className="uu-block-title">{t('resources.search.advancedTitle')}</strong>
              <div className="uu-muted">
                {filteredResources.length ? `(${filteredResources.length} ${t('resources.search.resultsLabel')})` : ''}
              </div>
            </div>

            <div className="uu-col uu-gap-12">
                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.usage')}</label>
                  <MultiSelectDropdown
                    options={usageOptions}
                    values={searchAdvanced.usage}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, usage: vals }))}
                    noneLabel={noneLabel}
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.style')}</label>
                  <MultiSelectDropdown
                    options={styleOptions}
                    values={searchAdvanced.style}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, style: vals }))}
                    noneLabel={noneLabel}
                    style={{}}
                  />
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.ambiance')}</label>
                  <MultiSelectDropdown
                    options={ambianceOptions}
                    values={searchAdvanced.ambiance}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, ambiance: vals }))}
                    noneLabel={noneLabel}
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.license')}</label>
                  <MultiSelectDropdown
                    options={licenseOptions}
                    values={searchAdvanced.license}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, license: vals }))}
                    noneLabel={noneLabel}
                    style={{}}
                  />
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.type')}</label>
                  <MultiSelectDropdown
                    options={typeOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.type}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, type: vals }))}
                    noneLabel={noneLabel}
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.distribution')}</label>
                  <MultiSelectDropdown
                    options={distributionOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.distribution}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, distribution: vals }))}
                    noneLabel={noneLabel}
                  />
                </div>
              </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.ueVersions')}</label>
                  <MultiSelectDropdown
                    options={ueOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.ueVersion}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, ueVersion: vals }))}
                    noneLabel={noneLabel}
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                  />
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('resources.seller')}</label>
                    <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.seller}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, seller: e.target.value }))}
                  >
                    <option value="">{noneLabel}</option>
                    {sellerOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.quality')}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {RATING_VALUES.map((n) => (
                        <button
                          key={`adv-quality-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.quality >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            quality: prev.quality === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.quality >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, quality: 0 }))}
                      title={noneLabel}
                      aria-label={noneLabel}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.performance')}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {RATING_VALUES.map((n) => (
                        <button
                          key={`adv-performance-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.performance >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            performance: prev.performance === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.performance >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, performance: 0 }))}
                      title={noneLabel}
                      aria-label={noneLabel}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>{t('resources.detail.labels.tags')}</label>
                  <input
                    className="uu-input"
                    style={{ width: '480px', minWidth: '480px', maxWidth: '480px' }}
                    value={searchAdvanced.tags}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder={t('resources.search.placeholderTags')}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                  <label className="uu-label" style={{ width: '90px' }}>
                    {t('resources.detail.labels.epicAccount')}
                  </label>
                  <select
                    className="uu-select"
                    style={{ flex: '1 1 220px', minWidth: '200px', height: '36px' }}
                    value={searchAdvanced.epicAccount}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, epicAccount: e.target.value }))}
                  >
                    <option value="">{noneLabel}</option>
                    {epicAccountOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="uu-row uu-align-center uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                onClick={() => { setSearchExpanded(false); setQuery(''); setSearchAdvanced(ADVANCED_INITIAL); }}
              >
                {t('resources.search.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`uu-section mt-16 ${viewMode === 'thumbs' ? 'resources-thumbs-section' : ''}`}>
        {filteredResources.length > 0 ? (
          <div className="uu-row uu-gap-12 uu-align-center" style={{ marginBottom: '8px' }}>
            <div className="uu-row uu-gap-6 uu-align-center">
              {canPrevPage ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label={t('projects.pagination.prevAria')}
                >
                  ‹
                </button>
              ) : null}
              <span className="uu-muted">
                {`Page ${currentPage + 1}/${totalPages}`}
              </span>
              {canNextPage ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label={t('projects.pagination.nextAria')}
                >
                  ›
                </button>
              ) : null}
              <select
                className="uu-select"
                value={pageSize}
                onChange={(e) => setPageSize(Math.max(10, Number(e.target.value) || 25))}
                style={{ width: '80px' }}
                aria-label={t('projects.pagination.pageSizeAria')}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        {filteredResources.length === 0 ? (
          <div className="uu-muted mt-8">
            {busy ? t('common.loading') : t('resources.empty')}
          </div>
        ) : (
          <ResourceList
            items={visibleResources}
            viewMode={viewMode}
            onOpenDetail={openDetail}
            onOpenExternal={handleOpen}
            onToggleFavorite={toggleFavorite}
            onTogglePurchased={togglePurchased}
            onToggleTested={toggleTested}
            onAddKeyword={addKeywordQuick}
            onSetUsage={(item, val) => setUserSelect(item, 'usage', val, USAGE_VALUES)}
            onSetStyle={(item, val) => setUserSelect(item, 'style', val, STYLE_VALUES)}
            onSetAmbiance={(item, val) => setUserSelect(item, 'ambiance', val, AMBIANCE_VALUES)}
            onSetLicense={(item, val) => setUserSelect(item, 'license', val, LICENSE_VALUES)}
            onSetQuality={(item, val) => setUserRating(item, 'ratingQuality', val)}
            onSetPerformance={(item, val) => setUserRating(item, 'ratingPerformance', val)}
            usageOptions={USAGE_VALUES}
            styleOptions={STYLE_VALUES}
            ambianceOptions={AMBIANCE_VALUES}
            licenseOptions={LICENSE_VALUES}
            getThumbSrc={getThumbSrc}
            getThumbCandidates={getThumbCandidates}
            toListString={toListString}
            normalizeValue={normalizeValue}
            buildMetaLine={(item) => buildMetaLine(item, t)}
            isUeIncompatible={isUeIncompatible}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
