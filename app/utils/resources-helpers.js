// app/utils/resources-helpers.js
import { normalizeThumbnailPath } from './projects-helpers';

const POSTPROD_AUTH_STORAGE_KEY = 'uu_postprod_auth';

export const VIEW_STORAGE_KEY = 'uu_resources_view';
export const PAGE_SIZE_STORAGE_KEY = 'uu_resources_page_size';
export const VIEW_OPTIONS = new Set(['thumbs', 'cards']);
export const FAVORITE_FILTER_KEY = 'uu_resources_fav';
export const RESOURCE_FAVORITES_STORAGE_KEY = 'uu_resources_favorites';
export const TESTED_FILTER_KEY = 'uu_resources_tested';
export const COMPAT_FILTER_KEY = 'uu_resources_compat';
export const USAGE_VALUES = [
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
  'augmented_reality',
];
export const STYLE_VALUES = ['realistic', 'stylized', 'toon', 'lowpoly', 'photogrammetry', 'anime'];
export const AMBIANCE_VALUES = ['medieval', 'scifi', 'urban', 'nature', 'corporate'];
export const LICENSE_VALUES = ['ok_client', 'to_verify', 'forbidden'];
export const RATING_VALUES = [1, 2, 3, 4, 5];
export const ADVANCED_INITIAL = {
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

export function pickString(...values) {
  for (const val of values) {
    const s = String(val || '').trim();
    if (s) return s;
  }
  return '';
}

export function formatDate(value, lang) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale);
}

export function toListString(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function normalizeValue(val) {
  return String(val || '').trim();
}

export function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => normalizeValue(val))
    .filter(Boolean);
}

export function normalizeSelectValue(value, allowed = []) {
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
    if (
      s === 'augmented reality' ||
      s === 'augmented-reality' ||
      s === 'réalité augmentée' ||
      s === 'realite augmentee' ||
      s === 'ar' ||
      s === 'ra'
    ) {
      s = 'augmented_reality';
    }
  }
  return allowed.includes(s) ? s : '';
}

export const normalizeUserUsageFromServer = (user = {}) => {
  const usage = normalizeSelectValue(user.usage, USAGE_VALUES);
  return usage ? { ...user, usage } : user;
};

export function normalizeBool(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  const s = normalizeValue(val).toLowerCase();
  if (!s) return false;
  return s === 'true' || s === '1' || s === 'yes' || s === 'oui';
}

export function normalizeRating(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n);
  if (r < 1 || r > 5) return 0;
  return r;
}

export function normalizeUid(uid) {
  return String(uid || '').trim().toLowerCase();
}

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

export function readFavoriteMap(storageKey) {
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

export function writeFavoriteMap(storageKey, map) {
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

export function readBooleanFlag(value, fallback = false) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

export function applyFavoriteToResource(item, favoritesMap = {}) {
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

export function applyFavoritesToResources(list = [], favoritesMap = {}) {
  return (Array.isArray(list) ? list : []).map((item) => applyFavoriteToResource(item, favoritesMap));
}

export function normalizeUeVersion(val) {
  const raw = normalizeValue(val);
  if (!raw) return '';
  const cleaned = raw.replace(/^ue[_\s-]?/i, '').replace(/^unreal[_\s-]?/i, '');
  return cleaned.toLowerCase();
}

export function normalizeResource(item = {}) {
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

export function normalizeUeVersionList(list) {
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

export function stripHtml(value) {
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

export function extractFabTags(item) {
  const base = normalizeList(item?.tags);
  const rawTags = item?.listingRaw?.tags;
  const extra = Array.isArray(rawTags)
    ? rawTags.map((tag) => normalizeValue(tag?.name || tag?.title || tag?.slug || tag?.uid))
    : [];
  const merged = normalizeList([...base, ...extra]);
  return merged;
}

export function extractDescription(item) {
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

export function extractTechnicalDetails(item) {
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

export function extractGalleryImages(item) {
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

  const pickOptimized = (images = []) => {
    const MAX_TARGET = 2560;
    let bestUnder = null;
    let bestAny = null;
    let fallback = '';

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

export function keywordsToString(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function splitKeywords(value) {
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

export function getThumbSrc(item) {
  const list = getThumbCandidates(item);
  return list[0] || '';
}

export function getThumbCandidates(item) {
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

  remoteList.forEach(push);
  push(localNormalized);
  return out;
}

export function buildMetaLine(item, t) {
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
