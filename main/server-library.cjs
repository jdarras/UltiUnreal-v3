// main/server-library.cjs
// Fab Library helpers & routes (extraits de server.cjs)

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { URL } = require('url');
const { getDataDir } = require('./data-path.cjs');
const { getSharedStore } = require('./server-shared-sqlite.cjs');
const fabAuth = require('./fab-auth.cjs');

const DATA_DIR = getDataDir();
const LIBRARY_THUMBS_DIR = path.join(DATA_DIR, 'fab_thumbs');
const FAB_IMPORT_CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_TTL_MS = 10 * 1000;
const sharedStore = getSharedStore({ dataDir: DATA_DIR });

let fabImportCache = { token: '', createdAt: 0, items: [], found: 0, pages: 0, hasMore: false };
let cacheLibrary = { ts: 0, indexDoc: null, detailsMap: null };
let cacheLibraryItem = new Map();

function setFabImportCache(items = [], meta = {}) {
  const token = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');
  fabImportCache = {
    token,
    createdAt: Date.now(),
    items: Array.isArray(items) ? items : [],
    found: Number(meta?.found || 0),
    pages: Number(meta?.pages || 0),
    hasMore: !!meta?.hasMore,
  };
  return token;
}

function getFabImportCache(token) {
  const key = String(token || '').trim();
  if (!key || key !== fabImportCache.token) return null;
  const age = Date.now() - Number(fabImportCache.createdAt || 0);
  if (!fabImportCache.createdAt || age > FAB_IMPORT_CACHE_TTL_MS) {
    fabImportCache = { token: '', createdAt: 0, items: [], found: 0, pages: 0, hasMore: false };
    return null;
  }
  return fabImportCache;
}

function getLibraryItemCached(uid, loader) {
  const key = String(uid || '').trim().toLowerCase();
  const now = Date.now();
  if (cacheLibraryItem.has(key)) {
    const entry = cacheLibraryItem.get(key);
    if (now - entry.ts < CACHE_TTL_MS) return entry.item;
  }
  const item = loader ? loader() : null;
  cacheLibraryItem.set(key, { ts: now, item });
  return item;
}

function setLibraryCache(indexDoc, detailsMap) {
  cacheLibrary = {
    ts: Date.now(),
    indexDoc: indexDoc || null,
    detailsMap: detailsMap || null,
  };
  cacheLibraryItem.clear();
}

function invalidateLibraryCache() {
  cacheLibrary = { ts: 0, indexDoc: null, detailsMap: null };
  cacheLibraryItem.clear();
}

function readLibraryIndexDocFromStore() {
  return sharedStore.loadLibraryIndexDoc();
}

function writeLibraryIndexDocToStore(doc, { onlyIfChanged = true } = {}) {
  return sharedStore.saveLibraryIndexDoc(doc, { onlyIfChanged: onlyIfChanged === true });
}

function readLibraryDetailsDocFromStore() {
  return sharedStore.loadLibraryDetailsDoc();
}

function writeLibraryDetailsDocToStore(doc, { onlyIfChanged = true } = {}) {
  return sharedStore.saveLibraryDetailsDoc(doc, { onlyIfChanged: onlyIfChanged === true });
}

// ---------- Fab Library helpers ----------
function normalizeLibraryUid(uid) {
  return String(uid || '').trim().toLowerCase();
}

function normalizeLibraryUidList(list = []) {
  const raw = Array.isArray(list) ? list : [];
  const out = [];
  const seen = new Set();
  for (const val of raw) {
    const key = normalizeLibraryUid(val);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizeLibraryUser(input = {}) {
  const incoming = input && typeof input === 'object' ? input : {};
  const allowedStatus = new Set(['Test', 'In progress', 'PAD', 'Archive', 'deleted', 'Deleted']);
  const rawStatus = incoming.status === 'PAS' ? 'PAD' : incoming.status;
  const status = allowedStatus.has(rawStatus) ? rawStatus : '';
  const type = typeof incoming.type === 'string' ? incoming.type.trim() : '';

  const normalizeChoice = (value, allowed = new Set(), aliases = {}) => {
    const s = cleanString(value);
    if (!s) return '';
    const key = s.toLowerCase();
    if (allowed.has(key)) return key;
    if (aliases && aliases[key]) return aliases[key];
    return '';
  };

  const boolFrom = (val) => {
    if (val === true || val === 1) return true;
    if (val === false || val === 0) return false;
    const s = cleanString(val).toLowerCase();
    if (!s) return false;
    return s === 'true' || s === '1' || s === 'yes' || s === 'oui';
  };

  const ratingFrom = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return 0;
    const r = Math.round(n);
    if (r < 1 || r > 5) return 0;
    return r;
  };

  const usage = normalizeChoice(
    incoming.usage,
    new Set([
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
      'characters', // conservé pour rétrocompatibilité si déjà en base
    ]),
    {
      'décor': 'decor',
      'décors': 'decor',
      'decor': 'decor',
      'environnement': 'environment',
      'environment': 'environment',
      'data': 'datas',
      'dataset': 'datas',
      'personnages': 'characters',
      'video production': 'video_production',
      'vidéo production': 'video_production',
      'video-production': 'video_production',
      'augmented reality': 'augmented_reality',
      'augmented-reality': 'augmented_reality',
      'réalité augmentée': 'augmented_reality',
      'realite augmentee': 'augmented_reality',
      'ar': 'augmented_reality',
      'ra': 'augmented_reality',
    }
  );

  const style = normalizeChoice(
    incoming.style,
    new Set(['realistic', 'stylized', 'toon', 'lowpoly', 'photogrammetry', 'anime']),
    {
      'réaliste': 'realistic',
      'realiste': 'realistic',
      'stylisé': 'stylized',
      'stylise': 'stylized',
      'low-poly': 'lowpoly',
      'scan photogrammetry': 'photogrammetry',
      'photogrammetry scan': 'photogrammetry',
    }
  );

  const ambiance = normalizeChoice(
    incoming.ambiance,
    new Set(['medieval', 'scifi', 'urban', 'nature', 'corporate']),
    {
      'médiéval': 'medieval',
      'medieval': 'medieval',
      'sci-fi': 'scifi',
      'sci fi': 'scifi',
      'urbain': 'urban',
    }
  );

  const license = normalizeChoice(
    incoming.license,
    new Set(['ok_client', 'to_verify', 'forbidden']),
    {
      'ok client': 'ok_client',
      'ok': 'ok_client',
      'à vérifier': 'to_verify',
      'a verifier': 'to_verify',
      'interdit diffusion': 'forbidden',
      'interdit': 'forbidden',
    }
  );

  const tested = boolFrom(incoming.tested);
  const favorite = boolFrom(incoming.favorite);
  const ratingQuality = ratingFrom(incoming.ratingQuality ?? incoming.quality);
  const ratingPerformance = ratingFrom(incoming.ratingPerformance ?? incoming.performance);

  const note = typeof incoming.note === 'string' ? incoming.note : '';
  const keywordsRaw = Array.isArray(incoming.keywords)
    ? incoming.keywords
    : (typeof incoming.keywords === 'string'
      ? incoming.keywords.split(/[,;\n]+/)
      : []);
  const keywords = normalizeStringArray(keywordsRaw);
  return {
    status,
    type,
    usage,
    style,
    ambiance,
    license,
    tested,
    favorite,
    ratingQuality,
    ratingPerformance,
    keywords,
    note,
  };
}

function cleanString(val) {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  return '';
}

function pickString(...vals) {
  for (const val of vals) {
    const s = cleanString(val);
    if (s) return s;
  }
  return '';
}

function normalizeStringArray(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();

  for (const val of list) {
    let s = '';
    if (typeof val === 'string' || typeof val === 'number') {
      s = String(val).trim();
    } else if (val && typeof val === 'object') {
      s = pickString(val.name, val.title, val.slug, val.id, val.code, val.value);
    }
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function normalizeAssetFormats(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();

  for (const val of list) {
    let s = '';
    if (val && typeof val === 'object') {
      const aft =
        val.assetFormatType && typeof val.assetFormatType === 'object'
          ? val.assetFormatType
          : null;
      s = pickString(
        aft?.name,
        aft?.code,
        aft?.id,
        val.name,
        val.code,
        val.type,
        val.slug,
        val.id
      );
    } else if (typeof val === 'string' || typeof val === 'number') {
      s = String(val).trim();
    }
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function mergeStringArray(a, b) {
  const list = [];
  if (Array.isArray(a)) list.push(...a);
  if (Array.isArray(b)) list.push(...b);
  return normalizeStringArray(list);
}

function normalizeComparableString(val) {
  const raw = cleanString(val);
  return raw ? raw.toLowerCase() : '';
}

function normalizeComparableSet(list) {
  const out = new Set();
  const normalized = normalizeStringArray(list);
  for (const val of normalized) {
    const key = normalizeComparableString(val);
    if (key) out.add(key);
  }
  return out;
}

function hasNewComparableValues(prevList, nextList) {
  const nextSet = normalizeComparableSet(nextList);
  if (!nextSet.size) return false;
  const prevSet = normalizeComparableSet(prevList);
  for (const key of nextSet) {
    if (!prevSet.has(key)) return true;
  }
  return false;
}

function extractImageUrls(raw) {
  const out = [];
  const seen = new Set();
  const visited = new WeakSet();

  const push = (val) => {
    const s = cleanString(val);
    if (!s) return;
    const key = s.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };

  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'string' || typeof node === 'number') {
      push(node);
      return;
    }
    if (typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);

    push(node.url);
    push(node.src);
    push(node.href);
    push(node.imageUrl);
    push(node.thumbnailUrl);
    push(node.mediaUrl);
    push(node.path);
    push(node.uri);

    walk(node.images);
    walk(node.thumbnails);
    walk(node.medias);
    walk(node.media);
    walk(node.gallery);
    walk(node.preview);
    walk(node.previews);
  };

  walk(raw);
  return out;
}

function pickListingCandidate(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [
    obj.listing,
    obj.listingItem,
    obj.item,
    obj.product,
    obj.catalogItem,
    obj.listingData,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object') return c;
  }
  return obj;
}

function _extractLibraryItemFromCandidate(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const listing = pickListingCandidate(obj) || {};

  const uid = pickString(
    obj.uid,
    obj.listingUid,
    obj.listing_id,
    obj.listingId,
    obj.id,
    listing.uid,
    listing.listingUid,
    listing.listing_id,
    listing.listingId,
    listing.id
  );

  if (!uid) return null;

  const title = pickString(
    obj.title,
    obj.name,
    listing.title,
    listing.name,
    listing.displayName
  );

  if (!title) return null;

  const seller = pickString(
    obj?.user?.sellerName,
    listing?.user?.sellerName,
    obj?.sellerName,
    listing?.sellerName,
    listing?.seller?.name,
    listing?.creator?.name
  );

  const listingType = pickString(
    obj.listingType,
    listing.listingType,
    obj.type,
    listing.type
  );

  const createdAt = pickString(
    obj.createdAt,
    obj.acquiredAt,
    obj.addedAt,
    listing.createdAt,
    listing.acquiredAt
  );

  const technical =
    listing?.technicalSpecs && typeof listing.technicalSpecs === 'object'
      ? listing.technicalSpecs
      : obj?.technicalSpecs && typeof obj.technicalSpecs === 'object'
        ? obj.technicalSpecs
        : null;

  const ueVersions = normalizeStringArray(
    technical?.unrealEngineEngineVersions ||
      technical?.unrealEngineVersions ||
      technical?.ueVersions
  );

  const distribution = pickString(
    technical?.unrealEngineDistributionMethod,
    technical?.distribution
  );

  const targetPlatforms = normalizeStringArray(
    technical?.unrealEngineTargetPlatforms ||
      technical?.targetPlatforms
  );

  const assetFormats = normalizeAssetFormats(
    listing?.assetFormats || obj?.assetFormats || listing?.formats
  );

  const tags = normalizeStringArray(
    listing?.tags || listing?.categories || listing?.taxonomies || obj?.tags
  );

  const thumbnails = extractImageUrls(
    listing?.thumbnails ||
      listing?.images ||
      listing?.media ||
      obj?.thumbnails ||
      obj?.images
  );

  const listingUrl =
    pickString(obj.listingUrl, listing?.listingUrl, listing?.url, listing?.href) ||
    (uid ? `https://www.fab.com/listings/${uid}` : '');

  return {
    uid,
    title,
    seller,
    listingType,
    createdAt,
    listingUrl,
    ueVersions,
    distribution,
    targetPlatforms,
    assetFormats,
    tags,
    thumbnails,
  };
}

function _collectFabEntitlementResults(root) {
  const out = [];
  const seen = new Set();

  const pushResults = (payload) => {
    const results = Array.isArray(payload?.results) ? payload.results : [];
    for (const item of results) {
      if (!item || typeof item !== 'object') continue;
      const key = pickString(item.uid, item?.listing?.uid, item?.listing?.id);
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      out.push(item);
    }
  };

  const scanContainer = (container) => {
    if (!container || typeof container !== 'object') return;
    for (const [k, v] of Object.entries(container)) {
      if (String(k).startsWith('/i/library/entitlements/search')) {
        pushResults(v);
      }
    }
  };

  scanContainer(root);
  scanContainer(root?.initialState?.api);

  if (!out.length) {
    const entMap = root?.initialState?.entities?.entitlements;
    if (entMap && typeof entMap === 'object') {
      for (const item of Object.values(entMap)) {
        if (item && typeof item === 'object') out.push(item);
      }
    }
  }

  return out;
}

function resolveEntitlementListing(ent, listingMap) {
  const listing =
    ent && typeof ent.listing === 'object' ? ent.listing : null;
  let uid = pickString(listing?.uid, listing?.id, ent?.listingUid, ent?.listingId);
  let listingObj = listing;

  if ((!listingObj || !listingObj.title) && uid && listingMap) {
    const fallback = listingMap[uid];
    if (fallback && typeof fallback === 'object') {
      listingObj = fallback;
    }
  }

  if (!uid && listingObj) {
    uid = pickString(listingObj?.uid, listingObj?.id);
  }

  return { listing: listingObj, uid };
}

function extractLibraryItemFromEntitlement(ent, listingMap) {
  if (!ent || typeof ent !== 'object') return null;
  const resolved = resolveEntitlementListing(ent, listingMap);
  const listing = resolved.listing;
  const listingUid = resolved.uid;
  if (!listing || !listingUid) return null;

  const title = pickString(listing.title, listing.name, listing.displayName);
  if (!title) return null;

  const seller = pickString(
    listing?.user?.sellerName,
    listing?.sellerName,
    listing?.seller?.name,
    listing?.creator?.name
  );

  const listingType = pickString(listing?.listingType, listing?.type);
  const createdAt = pickString(ent?.createdAt, ent?.acquiredAt, listing?.createdAt);

  let ueVersions = [];
  let targetPlatforms = [];
  let distribution = '';
  const assetFormatsRaw = Array.isArray(listing.assetFormats) ? listing.assetFormats : [];

  for (const fmt of assetFormatsRaw) {
    if (!fmt || typeof fmt !== 'object') continue;
    const specs =
      fmt.technicalSpecs && typeof fmt.technicalSpecs === 'object'
        ? fmt.technicalSpecs
        : null;
    if (!distribution) {
      distribution = pickString(
        specs?.unrealEngineDistributionMethod,
        specs?.distribution
      );
    }
    ueVersions = mergeStringArray(
      ueVersions,
      specs?.unrealEngineEngineVersions ||
        specs?.unrealEngineVersions ||
        specs?.ueVersions
    );
    targetPlatforms = mergeStringArray(
      targetPlatforms,
      specs?.unrealEngineTargetPlatforms ||
        specs?.targetPlatforms
    );
  }

  const assetFormats = normalizeAssetFormats(assetFormatsRaw);
  const tags = normalizeStringArray(listing?.tags);
  const thumbnails = extractImageUrls(
    listing?.thumbnails ||
      listing?.medias ||
      listing?.images
  );

  const listingUrl = `https://www.fab.com/listings/${listingUid}`;

  const entitlement = {
    uid: pickString(ent?.uid),
    status: pickString(ent?.status),
    licenses: Array.isArray(ent?.licenses) ? ent.licenses : [],
    capabilities: Array.isArray(ent?.capabilities) ? ent.capabilities : [],
  };

  return {
    uid: listingUid,
    entitlementUid: entitlement.uid,
    title,
    seller,
    listingType,
    createdAt,
    listingUrl,
    ueVersions,
    distribution,
    targetPlatforms,
    assetFormats,
    tags,
    thumbnails,
    entitlement,
    listingRaw: listing,
  };
}

function mergeLibraryItems(base = {}, incoming = {}) {
  const next = { ...base };
  next.uid = pickString(base.uid, incoming.uid);

  const maybeSet = (key) => {
    const val = pickString(incoming[key]);
    if (val && !pickString(base[key])) next[key] = val;
  };

  maybeSet('title');
  maybeSet('seller');
  maybeSet('listingType');
  maybeSet('createdAt');
  maybeSet('listingUrl');
  maybeSet('distribution');
  maybeSet('entitlementUid');
  maybeSet('thumbLocal');
  maybeSet('vendorDescription');

  const mergeList = (key) => {
    const merged = mergeStringArray(base[key], incoming[key]);
    if (merged.length) next[key] = merged;
  };

  mergeList('ueVersions');
  mergeList('targetPlatforms');
  mergeList('assetFormats');
  mergeList('tags');
  mergeList('thumbnails');

  if (incoming.listingRaw && typeof incoming.listingRaw === 'object') {
    next.listingRaw = incoming.listingRaw;
  }
  if (incoming.entitlement && typeof incoming.entitlement === 'object') {
    next.entitlement = incoming.entitlement;
  }

  if (base.user && !next.user) next.user = base.user;
  if (base.local && !next.local) next.local = base.local;

  return next;
}

function mergeUserKeywords(user = null, incomingTags = []) {
  const base = user && typeof user === 'object' ? user : {};
  const current = normalizeStringArray(base.keywords);
  const incoming = normalizeStringArray(incomingTags);
  if (!incoming.length) return user && typeof user === 'object' ? user : null;
  const merged = mergeStringArray(current, incoming);
  if (merged.length === current.length) {
    return user && typeof user === 'object' ? user : null;
  }
  return { ...base, keywords: merged };
}

function getLibraryItemChangeFlags(existing = {}, incoming = {}) {
  const changes = {};
  const seller = normalizeComparableString(incoming?.seller);
  if (seller && seller !== normalizeComparableString(existing?.seller)) {
    changes.seller = true;
  }
  const listingType = normalizeComparableString(incoming?.listingType);
  if (listingType && listingType !== normalizeComparableString(existing?.listingType)) {
    changes.listingType = true;
  }
  const distribution = normalizeComparableString(incoming?.distribution);
  if (distribution && distribution !== normalizeComparableString(existing?.distribution)) {
    changes.distribution = true;
  }
  if (hasNewComparableValues(existing?.ueVersions, incoming?.ueVersions)) {
    changes.ueVersions = true;
  }
  if (hasNewComparableValues(existing?.targetPlatforms, incoming?.targetPlatforms)) {
    changes.targetPlatforms = true;
  }
  if (hasNewComparableValues(existing?.assetFormats, incoming?.assetFormats)) {
    changes.assetFormats = true;
  }
  if (hasNewComparableValues(existing?.thumbnails, incoming?.thumbnails)) {
    changes.thumbnails = true;
  }
  return changes;
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

function extractListingDescription(listing = {}) {
  const raw = pickString(
    listing.description,
    listing.longDescription,
    listing.shortDescription,
    listing.summary,
    listing?.details?.description
  );
  return stripHtml(raw);
}

function extractListingTechnicalDetails(listing = {}) {
  const formats = Array.isArray(listing?.assetFormats) ? listing.assetFormats : [];
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

function buildVendorDescription(listing = {}) {
  if (!listing || typeof listing !== 'object') return '';
  const desc = extractListingDescription(listing);
  const technical = extractListingTechnicalDetails(listing);
  return [desc, ...technical].filter(Boolean).join('\n\n');
}

function mergeLibraryDetails(base = {}, incoming = {}) {
  const prev = base && typeof base === 'object' ? base : {};
  const next = { ...prev };
  if (incoming.listingRaw && typeof incoming.listingRaw === 'object') {
    next.listingRaw = incoming.listingRaw;
  }
  if (incoming.entitlement && typeof incoming.entitlement === 'object') {
    next.entitlement = incoming.entitlement;
  }
  return next;
}

function splitLibraryItem(item = {}) {
  const index = { ...(item && typeof item === 'object' ? item : {}) };
  const detail = {};

  if (index.listingRaw && typeof index.listingRaw === 'object') {
    detail.listingRaw = index.listingRaw;
    delete index.listingRaw;
  }
  if (index.entitlement && typeof index.entitlement === 'object') {
    detail.entitlement = index.entitlement;
    delete index.entitlement;
  }
  if (!index.vendorDescription && detail.listingRaw) {
    const desc = buildVendorDescription(detail.listingRaw);
    if (desc) index.vendorDescription = desc;
  }
  // Normaliser epicAccounts
  if (index.epicAccount && !index.epicAccounts) index.epicAccounts = [index.epicAccount];

  return { index, detail };
}

function mergeLibraryIndexItems(base = {}, incoming = {}) {
  const merged = mergeLibraryItems(base, incoming);
  const overrideKeys = ['seller', 'listingType', 'listingUrl', 'distribution', 'epicAccount', 'forumUrl'];
  for (const key of overrideKeys) {
    const val = pickString(incoming[key]);
    if (val) merged[key] = val;
  }
  // Cumuler les comptes Epic si déjà présents
  const accSet = new Set();
  const addAcc = (val) => {
    const v = pickString(val);
    if (v) accSet.add(v);
  };
  addAcc(base?.epicAccount);
  addAcc(incoming?.epicAccount);
  (Array.isArray(base?.epicAccounts) ? base.epicAccounts : []).forEach(addAcc);
  (Array.isArray(incoming?.epicAccounts) ? incoming.epicAccounts : []).forEach(addAcc);
  if (accSet.size > 0) {
    merged.epicAccounts = Array.from(accSet);
    merged.epicAccount = merged.epicAccount || merged.epicAccounts[0];
  }
  if (merged.listingRaw) delete merged.listingRaw;
  if (merged.entitlement) delete merged.entitlement;
  return merged;
}

function normalizeLibraryIndexDoc(doc = {}) {
  const next = doc && typeof doc === 'object' ? doc : {};
  const items = Array.isArray(next.items) ? next.items : [];
  const meta = next.meta && typeof next.meta === 'object' ? next.meta : {};
  return { ...next, items, meta };
}

function normalizeLibraryDetailsDoc(doc = {}) {
  const next = doc && typeof doc === 'object' ? doc : {};
  const items = next.items && typeof next.items === 'object' ? next.items : {};
  const meta = next.meta && typeof next.meta === 'object' ? next.meta : {};
  return { items, meta };
}

function ensureLibrarySplitStorage(opts = {}) {
  const requireDetails = !!opts.requireDetails;
  const now = Date.now();
  if (cacheLibrary.indexDoc && now - cacheLibrary.ts < CACHE_TTL_MS) {
    if (!requireDetails || cacheLibrary.detailsMap) {
      return {
        indexDoc: cacheLibrary.indexDoc,
        detailsMap: requireDetails ? (cacheLibrary.detailsMap || {}) : cacheLibrary.detailsMap,
      };
    }
  }

  const indexDoc = normalizeLibraryIndexDoc(readLibraryIndexDocFromStore() || {});
  const needsInlineSplit = indexDoc.items.some((item) => item?.listingRaw || item?.entitlement);
  const needsVendorDescription = indexDoc.items.some((item) => !item?.vendorDescription);
  const shouldLoadDetails = requireDetails || needsInlineSplit || needsVendorDescription;
  const detailsDoc = shouldLoadDetails
    ? normalizeLibraryDetailsDoc(readLibraryDetailsDocFromStore() || {})
    : { items: {}, meta: {} };
  const detailsMap = shouldLoadDetails ? { ...detailsDoc.items } : {};

  let indexChanged = false;
  let detailsChanged = false;
  const nextItems = [];

  for (const item of indexDoc.items) {
    const hadInlineDetail = !!(item?.listingRaw || item?.entitlement);
    const { index, detail } = splitLibraryItem(item);
    const key = normalizeLibraryUid(index.uid);
    if (key && (detail.listingRaw || detail.entitlement)) {
      const mergedDetail = mergeLibraryDetails(detailsMap[key], detail);
      if (!detailsMap[key] || mergedDetail !== detailsMap[key]) {
        detailsMap[key] = mergedDetail;
        detailsChanged = true;
      }
      indexChanged = true;
    }
    if (hadInlineDetail) indexChanged = true;

    if (!index.vendorDescription && key && detailsMap[key]?.listingRaw) {
      const desc = buildVendorDescription(detailsMap[key].listingRaw);
      if (desc) {
        index.vendorDescription = desc;
        indexChanged = true;
      }
    }

    nextItems.push(index);
  }

  if (indexChanged) {
    indexDoc.items = nextItems;
    indexDoc.meta = indexDoc.meta && typeof indexDoc.meta === 'object' ? indexDoc.meta : {};
    indexDoc.meta.libraryStorage = 'split-v1';
    writeLibraryIndexDocToStore(indexDoc, { onlyIfChanged: true });
  }

  if (detailsChanged) {
    writeLibraryDetailsDocToStore({ items: detailsMap, meta: detailsDoc.meta || {} }, { onlyIfChanged: true });
  }

  const result = { indexDoc: indexDoc.items ? indexDoc : { ...indexDoc, items: nextItems }, detailsMap };
  setLibraryCache(result.indexDoc, result.detailsMap);
  return result;
}

function getSavedAssetPathFromUrl(assetsDir, url) {
  const root = String(assetsDir || '').trim();
  const target = String(url || '').trim();
  if (!root || !target) return '';
  let fileName = '';
  try {
    fileName = path.basename(new URL(target).pathname);
  } catch {
    return '';
  }
  if (!fileName) return '';
  const candidate = path.join(root, fileName);
  return fs.existsSync(candidate) ? candidate : '';
}

function hashString(value) {
  return crypto
    .createHash('sha1')
    .update(String(value || ''))
    .digest('hex')
    .slice(0, 12);
}

function pickLibraryThumbUrl(item) {
  if (!item || typeof item !== 'object') return '';
  const list = Array.isArray(item.thumbnails) ? item.thumbnails : [];
  for (const val of list) {
    if (typeof val === 'string' || typeof val === 'number') {
      const s = cleanString(val);
      if (s) return s;
      continue;
    }
    if (val && typeof val === 'object') {
      const s = pickString(
        val.url,
        val.src,
        val.href,
        val.imageUrl,
        val.thumbnailUrl,
        val.mediaUrl,
        val.path,
        val.uri
      );
      if (s) return s;
    }
  }
  return pickString(
    item?.thumbnailUrl,
    item?.thumbUrl,
    item?.thumbnail,
    item?.thumb
  );
}

function buildLibraryThumbPath(uid, url) {
  const safeUid = String(uid || 'listing')
    .replace(/[^a-z0-9_-]+/gi, '')
    .slice(0, 32) || 'listing';
  let ext = '';
  try {
    ext = path.extname(new URL(String(url || '')).pathname).toLowerCase();
  } catch {}
  if (!ext || ext.length > 8) ext = '.jpg';
  if (!/^\.(jpg|jpeg|png|webp|gif)$/i.test(ext)) ext = '.jpg';
  const hash = hashString(url);
  return path.join(LIBRARY_THUMBS_DIR, `${safeUid}_${hash}${ext}`);
}

async function downloadUrlToFile(url, dest, opts = {}) {
  const target = String(url || '').trim();
  if (!target) return false;

  const timeoutMs = Number(opts?.timeoutMs || 15000);
  const headers = opts && typeof opts === 'object' && opts.headers ? { ...opts.headers } : {};
  const sess = opts?.session || null;
  const referrer = typeof opts?.referrer === 'string' ? opts.referrer : '';
  const maxRedirects = Number(opts?.maxRedirects ?? 3);

  if (sess && typeof sess.fetch === 'function') {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const sessionHeaders = { ...headers };
      if (sessionHeaders.Cookie) delete sessionHeaders.Cookie;
      const res = await sess.fetch(target, {
        method: 'GET',
        headers: sessionHeaders,
        credentials: 'include',
        referrer: referrer || undefined,
        signal: ctrl.signal,
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await fsp.writeFile(dest, buf);
        return true;
      }
    } catch {
      // fallback to http(s)
    } finally {
      clearTimeout(t);
    }
  }

  const fetchViaHttp = (currentUrl, redirectsLeft) => new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const client = currentUrl.startsWith('https://') ? https : http;
    const req = client.get(currentUrl, { timeout: timeoutMs, headers }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const nextUrl = new URL(res.headers.location, currentUrl).toString();
        res.resume();
        return finish(fetchViaHttp(nextUrl, redirectsLeft - 1));
      }
      if (status !== 200) {
        res.resume();
        return finish(false);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => finish(true)));
      file.on('error', () => {
        try { file.close(); } catch {}
        try { fs.unlinkSync(dest); } catch {}
        finish(false);
      });
    });
    req.on('timeout', () => {
      req.destroy();
      finish(false);
    });
    req.on('error', () => finish(false));
  });

  return fetchViaHttp(target, maxRedirects);
}

async function cacheLibraryThumbnail(item, opts = {}) {
  const uid = normalizeLibraryUid(item?.uid) || '';
  const url = pickLibraryThumbUrl(item);
  if (!url) return { ok: false, reason: 'missing_url' };

  const dest = buildLibraryThumbPath(uid || 'listing', url);
  const rootResolved = path.resolve(LIBRARY_THUMBS_DIR);
  const destResolved = path.resolve(dest);
  if (!destResolved.toLowerCase().startsWith(rootResolved.toLowerCase() + path.sep.toLowerCase())) {
    return { ok: false, reason: 'invalid_path' };
  }

  if (fs.existsSync(destResolved)) {
    return { ok: true, path: destResolved, reused: true };
  }

  try {
    fs.mkdirSync(rootResolved, { recursive: true });
  } catch {
    return { ok: false, reason: 'mkdir_failed' };
  }

  const local = getSavedAssetPathFromUrl(opts.assetsDir, url);
  if (local) {
    try {
      await fsp.copyFile(local, destResolved);
      return { ok: true, path: destResolved, copied: true };
    } catch {
      return { ok: false, reason: 'copy_failed' };
    }
  }

  if (opts.download && /^https?:\/\//i.test(url)) {
    const headers = {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Referer: 'https://www.fab.com/library',
    };
    const cookieHeader = typeof opts.cookieHeader === 'string'
      ? opts.cookieHeader
      : (typeof fabAuth.buildCookieHeader === 'function' ? fabAuth.buildCookieHeader() : '');
    if (cookieHeader) headers.Cookie = cookieHeader;
    const sess = opts.session || (typeof fabAuth.getAuthSession === 'function' ? fabAuth.getAuthSession() : null);
    const ok = await downloadUrlToFile(url, destResolved, {
      headers,
      session: sess,
      referrer: 'https://www.fab.com/library',
      timeoutMs: Number(opts.timeoutMs || 15000),
      maxRedirects: 4,
    });
    if (ok) return { ok: true, path: destResolved, downloaded: true };
  }

  return { ok: false, reason: 'not_cached' };
}

function extractFabNextCursor(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const direct = pickString(payload?.cursors?.next);
  if (direct) return direct;
  const nextUrl = pickString(payload?.next);
  if (!nextUrl) return '';
  try {
    const u = new URL(nextUrl);
    return pickString(u.searchParams.get('cursor'));
  } catch {
    return '';
  }
}

function extractLibraryItemsFromEntitlementResults(results = [], listingMap = {}) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(results) ? results : [];

  for (const ent of list) {
    const item =
      extractLibraryItemFromEntitlement(ent, listingMap) ||
      extractLibraryItemFromListing(ent) ||
      _extractLibraryItemFromCandidate(ent);
    if (!item || !item.uid) continue;
    const key = normalizeLibraryUid(item.uid);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(item);
  }

  return out;
}

function requestJson(url, headers = {}, timeoutMs = 15000) {
  const target = String(url || '').trim();
  if (!target) return Promise.resolve({ ok: false, error: 'missing_url' });

  return new Promise((resolve) => {
    const client = target.startsWith('https://') ? https : http;
    const req = client.request(
      target,
      {
        method: 'GET',
        headers: { ...headers },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            return resolve({ ok: false, status, text: data });
          }
          try {
            const json = JSON.parse(data || '{}');
            return resolve({ ok: true, status, data: json });
          } catch {
            return resolve({ ok: false, status, error: 'invalid_json', text: data });
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    req.on('error', (err) => resolve({ ok: false, error: String(err?.message || err) }));
    req.end();
  });
}

function requestText(url, headers = {}, timeoutMs = 15000) {
  const target = String(url || '').trim();
  if (!target) return Promise.resolve({ ok: false, error: 'missing_url' });

  return new Promise((resolve) => {
    const client = target.startsWith('https://') ? https : http;
    const req = client.request(
      target,
      {
        method: 'GET',
        headers: { ...headers },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const status = Number(res.statusCode || 0);
          resolve({ ok: status >= 200 && status < 300, status, text: data });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    req.on('error', (err) => resolve({ ok: false, error: String(err?.message || err) }));
    req.end();
  });
}

async function requestJsonViaSession(url, headers = {}, sess, timeoutMs = 15000, opts = {}) {
  const target = String(url || '').trim();
  if (!target || !sess || typeof sess.fetch !== 'function') {
    return { ok: false, error: 'session_unavailable' };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await sess.fetch(target, {
      method: 'GET',
      headers: { ...headers },
      credentials: 'include',
      referrer: opts.referrer || undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, text };
    }
    try {
      return { ok: true, status: res.status, data: JSON.parse(text || '{}') };
    } catch {
      return { ok: false, status: res.status, error: 'invalid_json', text };
    }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function requestTextViaSession(url, headers = {}, sess, timeoutMs = 15000, opts = {}) {
  const target = String(url || '').trim();
  if (!target || !sess || typeof sess.fetch !== 'function') {
    return { ok: false, error: 'session_unavailable' };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await sess.fetch(target, {
      method: 'GET',
      headers: { ...headers },
      credentials: 'include',
      referrer: opts.referrer || undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    return {
      ok: !!res.ok,
      status: Number(res.status || 0),
      text,
      error: res.ok ? '' : `HTTP ${Number(res.status || 0)}`,
    };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function extractJsonRootsFromFabHtml(html = '') {
  const roots = [];
  const raw = String(html || '');
  if (!raw) return roots;

  const pushParsed = (chunk) => {
    const src = String(chunk || '').trim();
    if (!src) return;
    if (!(src.startsWith('{') || src.startsWith('['))) return;
    try {
      const parsed = JSON.parse(src);
      if (parsed && typeof parsed === 'object') roots.push(parsed);
    } catch {}
  };

  const nextDataRegex = /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = null;
  while ((match = nextDataRegex.exec(raw))) {
    pushParsed(match[1]);
  }

  const jsonScriptRegex = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = jsonScriptRegex.exec(raw))) {
    pushParsed(match[1]);
  }

  return roots;
}

async function fetchFabLibraryFromLibraryPage(cookieHeader, opts = {}) {
  const url = 'https://www.fab.com/library';
  const headers = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  };
  const sess = typeof fabAuth.getAuthSession === 'function'
    ? fabAuth.getAuthSession()
    : null;

  let page = { ok: false, error: 'session_unavailable' };
  if (sess && typeof sess.fetch === 'function') {
    page = await requestTextViaSession(url, headers, sess, opts.timeoutMs || 20000, {
      referrer: 'https://www.fab.com/library',
    });
  }
  if ((!page || !page.ok) && cookieHeader) {
    const reqHeaders = { ...headers, Cookie: cookieHeader };
    page = await requestText(url, reqHeaders, opts.timeoutMs || 20000);
  }
  if (!page || !page.ok) {
    return {
      ok: false,
      error: String(page?.error || 'library_page_failed'),
      status: Number(page?.status || 0),
      detail: String(page?.text || '').replace(/\s+/g, ' ').slice(0, 240),
    };
  }

  const roots = extractJsonRootsFromFabHtml(page.text);
  const results = [];
  const seen = new Set();
  for (const root of roots) {
    const list = _collectFabEntitlementResults(root);
    for (const item of list) {
      const key = normalizeLibraryUid(
        pickString(item?.uid, item?.listing?.uid, item?.listing?.id, item?.id)
      );
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      results.push(item);
    }
  }

  if (results.length > 0) {
    return { ok: true, results, pages: 1, hasMore: false, source: 'library_html' };
  }

  return {
    ok: false,
    error: 'library_html_no_data',
    status: Number(page?.status || 0),
    detail: String(page?.text || '').replace(/\s+/g, ' ').slice(0, 240),
  };
}

async function fetchFabEntitlementsPage(cursor, cookieHeader, opts = {}) {
  const endpointCandidates = [
    '/i/library/entitlements/search',
    '/i/library/entitlements/search/',
    '/i/library/search',
  ];

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'identity',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    Referer: 'https://www.fab.com/library',
    'X-Requested-With': 'XMLHttpRequest',
  };
  const sess = typeof fabAuth.getAuthSession === 'function'
    ? fabAuth.getAuthSession()
    : null;

  const diagnostics = [];
  for (const endpoint of endpointCandidates) {
    const url = new URL(`https://www.fab.com${endpoint}`);
    url.searchParams.set('sort_by', '-createdAt');
    if (cursor) url.searchParams.set('cursor', cursor);

    if (sess && typeof sess.fetch === 'function') {
      const sessionHeaders = {
        Accept: headers.Accept,
        'Accept-Language': headers['Accept-Language'],
        'X-Requested-With': headers['X-Requested-With'],
      };
      const res = await requestJsonViaSession(
        url.toString(),
        sessionHeaders,
        sess,
        opts.timeoutMs || 15000,
        { referrer: 'https://www.fab.com/library' }
      );
      if (res && res.ok) return res;
      diagnostics.push({
        endpoint,
        status: Number(res?.status || 0),
        error: String(res?.error || '').trim(),
        text: String(res?.text || '').trim(),
      });
    }

    if (!sess || typeof sess.fetch !== 'function') {
      const reqHeaders = { ...headers };
      if (cookieHeader) reqHeaders.Cookie = cookieHeader;
      const fallback = await requestJson(url.toString(), reqHeaders, opts.timeoutMs || 15000);
      if (fallback && fallback.ok) return fallback;
      diagnostics.push({
        endpoint,
        status: Number(fallback?.status || 0),
        error: String(fallback?.error || '').trim(),
        text: String(fallback?.text || '').trim(),
      });
    }
  }

  const best = diagnostics.find((d) => d.status > 0) || diagnostics[0] || {};
  const snippet = String(best?.text || '').replace(/\s+/g, ' ').slice(0, 240);
  const statusNum = Number(best?.status || 0);
  const code = String(best?.error || '').trim();
  return {
    ok: false,
    status: statusNum,
    error: code || (statusNum > 0 ? `HTTP ${statusNum}` : 'request_failed'),
    text: snippet,
  };
}

function extractLibraryItemFromListing(listing) {
  if (!listing || typeof listing !== 'object') return null;
  const listingUid = pickString(listing?.uid, listing?.id);
  const title = pickString(listing?.title, listing?.name, listing?.displayName);
  if (!listingUid || !title) return null;

  const seller = pickString(
    listing?.user?.sellerName,
    listing?.sellerName,
    listing?.seller?.name,
    listing?.creator?.name
  );
  const listingType = pickString(listing?.listingType, listing?.type);
  const createdAt = pickString(listing?.createdAt);
  const listingUrl = `https://www.fab.com/listings/${listingUid}`;
  const assetFormatsRaw = Array.isArray(listing?.assetFormats) ? listing.assetFormats : [];
  const assetFormats = normalizeAssetFormats(assetFormatsRaw);
  const tags = normalizeStringArray(listing?.tags);
  const thumbnails = extractImageUrls(
    listing?.thumbnails ||
      listing?.medias ||
      listing?.images
  );

  return {
    uid: listingUid,
    title,
    seller,
    listingType,
    createdAt,
    listingUrl,
    ueVersions: [],
    distribution: '',
    targetPlatforms: [],
    assetFormats,
    tags,
    thumbnails,
    listingRaw: listing,
  };
}

async function fetchFabProfile(cookieHeader, sess, opts = {}) {
  const url = 'https://www.fab.com/i/users/me';
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    Referer: 'https://www.fab.com/library',
  };
  if (cookieHeader) headers.Cookie = cookieHeader;
  try {
    if (sess && typeof sess.fetch === 'function') {
      const res = await requestJsonViaSession(url, headers, sess, opts.timeoutMs || 10000, {
        referrer: 'https://www.fab.com/library'
      });
      if (res && res.ok && res.data && res.data.displayName) {
        return { ok: true, displayName: res.data.displayName };
      }
    }
    const res = await requestJson(url, headers, opts.timeoutMs || 10000);
    if (res && res.ok && res.data && res.data.displayName) {
      return { ok: true, displayName: res.data.displayName };
    }
  } catch {}
  return { ok: false };
}

async function fetchFabLibraryAll(cookieHeader, opts = {}) {
  const maxPages = Number(opts.maxPages || 200);
  const throttleMs = Number(opts.throttleMs || 0);
  const seen = new Set();
  const results = [];

  let cursor = '';
  let pages = 0;
  let nextCursor = '';

  while (pages < maxPages) {
    const res = await fetchFabEntitlementsPage(cursor, cookieHeader, opts);
    if (!res.ok) {
      if (results.length === 0) {
        const htmlFallback = await fetchFabLibraryFromLibraryPage(cookieHeader, opts);
        if (htmlFallback && htmlFallback.ok) {
          return {
            ok: true,
            results: Array.isArray(htmlFallback.results) ? htmlFallback.results : [],
            pages: Number(htmlFallback.pages || 1),
            hasMore: !!htmlFallback.hasMore,
            source: String(htmlFallback.source || 'library_html'),
          };
        }
      }
      const rawText = String(res?.text || '').trim();
      const textSnippet = rawText ? rawText.replace(/\s+/g, ' ').slice(0, 240) : '';
      const statusNum = Number(res?.status || 0);
      const fallbackError = statusNum > 0 ? `HTTP ${statusNum}` : '';
      return {
        ok: false,
        error: String(res?.error || fallbackError || 'request_failed'),
        detail: textSnippet,
        status: statusNum,
        pages,
      };
    }

    const payload = res.data && typeof res.data === 'object' ? res.data : {};
    const batch = Array.isArray(payload.results)
      ? payload.results
      : (Array.isArray(payload.items) ? payload.items : []);
    results.push(...batch);

    nextCursor = extractFabNextCursor(payload);
    if (!nextCursor) break;
    if (seen.has(nextCursor)) break;
    seen.add(nextCursor);
    cursor = nextCursor;
    pages += 1;

    if (throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, throttleMs));
    }
  }

  return { ok: true, results, pages: pages + 1, hasMore: !!nextCursor };
}


async function handleLibraryRoutes(req, res, url, ctx = {}) {
  const { sendJSON, sendJSONWithEtag, parseBody, logLine } = ctx;
  // Routes Fab Library extraites de server.cjs
  // ---- Fab Library ----
  if (url.pathname === '/agent/library/meta') {
    if (req.method === 'GET') {
      const { indexDoc } = ensureLibrarySplitStorage();
      const items = Array.isArray(indexDoc.items) ? indexDoc.items : [];
      const meta = indexDoc.meta && typeof indexDoc.meta === 'object' ? indexDoc.meta : {};
      return sendJSONWithEtag(req, res, 200, {
        ok: true,
        count: items.length,
        hasItems: items.length > 0,
        meta,
      });
    }
    return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  }

  if (url.pathname === '/agent/library') {
    if (req.method === 'GET') {
      const { indexDoc } = ensureLibrarySplitStorage();
      return sendJSONWithEtag(req, res, 200, {
        ok: true,
        items: Array.isArray(indexDoc.items) ? indexDoc.items : [],
        meta: indexDoc.meta && typeof indexDoc.meta === 'object' ? indexDoc.meta : {},
      });
    }
    return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  }

  if (url.pathname === '/agent/library/item') {
    if (req.method === 'GET') {
      const uid = String(url.searchParams.get('uid') || '').trim();
      const key = normalizeLibraryUid(uid);
    if (!key) return sendJSON(res, 400, { ok: false, error: 'missing_uid' });
    const item = getLibraryItemCached(key, () => {
      const { indexDoc, detailsMap } = ensureLibrarySplitStorage({ requireDetails: true });
      const list = Array.isArray(indexDoc.items) ? indexDoc.items : [];
      const found = list.find((it) => normalizeLibraryUid(it?.uid) === key);
      if (!found) return null;
      const details = detailsMap && typeof detailsMap === 'object' ? detailsMap[key] : null;
      return details && typeof details === 'object' ? { ...found, ...details } : { ...found };
    });
    if (!item) return sendJSON(res, 404, { ok: false, error: 'not_found' });
    return sendJSON(res, 200, { ok: true, item });
  }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const uid = String(body?.uid || body?.listingUid || '').trim();
      const key = normalizeLibraryUid(uid);
      if (!key) return sendJSON(res, 400, { ok: false, error: 'missing_uid' });
      const { indexDoc, detailsMap } = ensureLibrarySplitStorage({ requireDetails: true });
      const list = Array.isArray(indexDoc.items) ? [...indexDoc.items] : [];
      const idx = list.findIndex((it) => normalizeLibraryUid(it?.uid) === key);
      if (idx < 0) return sendJSON(res, 404, { ok: false, error: 'not_found' });

      const nextUser = normalizeLibraryUser(body?.user || {});
      const status = String(nextUser?.status || '').trim().toLowerCase();
      const meta = indexDoc.meta && typeof indexDoc.meta === 'object' ? { ...indexDoc.meta } : {};
      meta.libraryStorage = 'split-v1';
      const ignoreSet = new Set(normalizeLibraryUidList(meta.fabImportIgnore || meta.fabImportIgnored));

      if (status === 'deleted') {
        // Remove the item entirely from the local library and remember it in ignore list
        list.splice(idx, 1);
        if (detailsMap && typeof detailsMap === 'object' && detailsMap[key]) {
          delete detailsMap[key];
        }
        ignoreSet.add(key);
        if (ignoreSet.size > 0) meta.fabImportIgnore = Array.from(ignoreSet);
        else if (meta.fabImportIgnore) delete meta.fabImportIgnore;

        const nextDoc = { ...indexDoc, items: list, meta };
        writeLibraryIndexDocToStore(nextDoc, { onlyIfChanged: true });
        writeLibraryDetailsDocToStore({ items: detailsMap || {}, meta: {} }, { onlyIfChanged: true });
        setLibraryCache(nextDoc, detailsMap);
        return sendJSON(res, 200, { ok: true, deleted: true });
      }

      const nextItem = { ...list[idx], user: nextUser };
      ignoreSet.delete(key);
      if (ignoreSet.size > 0) meta.fabImportIgnore = Array.from(ignoreSet);
      else if (meta.fabImportIgnore) delete meta.fabImportIgnore;

      list[idx] = nextItem;
      const nextDoc = { ...indexDoc, items: list, meta };
      writeLibraryIndexDocToStore(nextDoc, { onlyIfChanged: true });
      setLibraryCache(nextDoc, detailsMap);
      return sendJSON(res, 200, { ok: true, item: nextItem });
    }
    return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  }

  if (url.pathname === '/agent/library/import-remote') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const previewOnly = body?.mode === 'preview' || body?.preview === true;
    await fabAuth.refreshCookiesFromSession();
    const cookieHeader = fabAuth.buildCookieHeader();
    if (!cookieHeader) {
      return sendJSON(res, 401, { ok: false, error: 'fab_not_connected' });
    }
    const fabSession = typeof fabAuth.getAuthSession === 'function'
      ? fabAuth.getAuthSession()
      : null;
    const profile = await fetchFabProfile(cookieHeader, fabSession).catch(() => ({ ok: false }));
    const epicAccount = profile && profile.ok ? pickString(profile.displayName) : '';

    const previewToken = pickString(body?.previewToken, body?.cacheToken, body?.token);
    const cached = !previewOnly && previewToken ? getFabImportCache(previewToken) : null;
    let items = [];
    let found = 0;
    let remotePages = 0;
    let remoteHasMore = false;

    if (cached) {
      items = Array.isArray(cached.items) ? cached.items : [];
      found = Number(cached.found || 0);
      remotePages = Number(cached.pages || 0);
      remoteHasMore = !!cached.hasMore;
    } else {
      const maxPages = Number(body?.maxPages || 200);
      const throttleMs = Number(body?.throttleMs || 0);
    const remote = await fetchFabLibraryAll(cookieHeader, { maxPages, throttleMs });
      if (!remote.ok) {
        const detailMsg = String(remote.detail || remote.error || '').trim();
        return sendJSON(res, 502, {
          ok: false,
          error: 'fab_fetch_failed',
          detail: detailMsg,
          status: remote.status || 0,
        });
      }

      const rawItems = extractLibraryItemsFromEntitlementResults(remote.results);
      const byUid = new Map();

      for (const item of rawItems) {
        const key = normalizeLibraryUid(item?.uid);
        if (!key) continue;
        const prev = byUid.get(key);
        byUid.set(key, prev ? mergeLibraryItems(prev, item) : item);
      }

      items = Array.from(byUid.values());
      found = items.length;
      remotePages = remote.pages || 0;
      remoteHasMore = !!remote.hasMore;
    }
    const { indexDoc, detailsMap } = ensureLibrarySplitStorage({ requireDetails: !previewOnly });
    const existingItems = Array.isArray(indexDoc.items) ? indexDoc.items : [];
    const existingMap = new Map();
    const deletedIgnoredSet = new Set();

    for (const it of existingItems) {
      const key = normalizeLibraryUid(it?.uid);
      if (key) existingMap.set(key, it);
      const status = String(it?.user?.status || '').trim().toLowerCase();
      if (status === 'deleted') deletedIgnoredSet.add(key);
    }

    const storedIgnored = normalizeLibraryUidList(
      indexDoc.meta?.fabImportIgnore || indexDoc.meta?.fabImportIgnored
    );
    const requestedSelected = normalizeLibraryUidList(body?.selectedUids || body?.selected);
    const requestedIgnored = normalizeLibraryUidList(body?.ignoredUids || body?.ignored);
    const requestedVisible = normalizeLibraryUidList(body?.visibleUids || body?.visible);
    const updateIgnore =
      requestedVisible.length > 0 || requestedSelected.length > 0 || requestedIgnored.length > 0;
    const requestedSelectedSet = new Set(requestedSelected);
    const requestedIgnoredSet = new Set(requestedIgnored);
    const requestedVisibleSet = requestedVisible.length
      ? new Set(requestedVisible)
      : new Set([...requestedSelected, ...requestedIgnored]);
      if (previewOnly) {
        const previewNew = [];
        const previewUpdated = [];
        const cacheItems = [];

        for (const item of items) {
          if (epicAccount) item.epicAccount = epicAccount;
          const key = normalizeLibraryUid(item?.uid);
          if (!key) continue;
          const existing = existingMap.get(key);
          const previewItem = {
            uid: pickString(item?.uid),
          title: pickString(item?.title),
          seller: pickString(item?.seller),
          listingType: pickString(item?.listingType),
          listingUrl: pickString(item?.listingUrl),
        };

        if (!existing) {
          previewNew.push({ ...previewItem, status: 'new' });
          cacheItems.push(item);
          continue;
        }

        const userStatus = String(existing?.user?.status || '').trim().toLowerCase();
        const wasDeleted = userStatus === 'deleted';
        const changes = getLibraryItemChangeFlags(existing, item);
        if (Object.keys(changes).length || wasDeleted) {
          previewUpdated.push({ ...previewItem, status: wasDeleted ? 'deleted' : 'modified' });
          cacheItems.push(item);
        }
        if (wasDeleted && normalizeLibraryUid(item?.uid)) {
          deletedIgnoredSet.add(normalizeLibraryUid(item?.uid));
        }
        }

        const previewItems = [...previewNew, ...previewUpdated];
        const token = setFabImportCache(cacheItems, {
          found,
        pages: remotePages,
        hasMore: remoteHasMore,
      });
      const ignoredOut = Array.from(new Set([...storedIgnored, ...deletedIgnoredSet]));
      return sendJSON(res, 200, {
        ok: true,
        items: previewItems,
        found,
        changed: previewItems.length,
        newCount: previewNew.length,
        updatedCount: previewUpdated.length,
        ignored: ignoredOut,
        pages: remotePages,
        hasMore: remoteHasMore,
        token,
      });
    }

    const ignoreSetBase = new Set([...deletedIgnoredSet, ...storedIgnored]);
    let importItems = items;
    if (requestedSelected.length > 0) {
      importItems = items.filter((item) => requestedSelectedSet.has(normalizeLibraryUid(item?.uid)));
    } else if (ignoreSetBase.size > 0) {
      const ignoredSet = ignoreSetBase;
      importItems = items.filter((item) => {
        const key = normalizeLibraryUid(item?.uid);
        return key && !ignoredSet.has(key);
      });
    }

    let nextIgnored = storedIgnored;
    if (updateIgnore && requestedVisibleSet.size > 0) {
      const nextSet = new Set([...storedIgnored, ...deletedIgnoredSet]);
      for (const uid of requestedVisibleSet) {
        if (requestedIgnoredSet.has(uid)) nextSet.add(uid);
        else nextSet.delete(uid);
      }
      nextIgnored = Array.from(nextSet);
    }

    const downloadThumbnails = body?.downloadThumbnails !== false;
    const thumbStats = { cached: 0, reused: 0, missing: 0 };

    if (downloadThumbnails) {
      for (const item of importItems) {
        const res = await cacheLibraryThumbnail(item, {
          download: true,
          cookieHeader,
          session: fabSession,
        });
        if (res.ok && res.path) {
          item.thumbLocal = res.path;
          if (res.reused) thumbStats.reused += 1;
          else thumbStats.cached += 1;
        } else if (res.reason !== 'missing_url') {
          thumbStats.missing += 1;
        }
      }
    }

    let imported = 0;
    let skipped = 0;
    let detailsChanged = false;
    const mergedMap = new Map();
    const now = new Date().toISOString();

    for (const item of importItems) {
      const { index, detail } = splitLibraryItem(item);
      const key = normalizeLibraryUid(index?.uid);
      if (!key) continue;
      if (epicAccount) index.epicAccount = epicAccount;
      if (index.epicAccount && !index.epicAccounts) index.epicAccounts = [index.epicAccount];
      // Ne plus visiter chaque page Fab pour chercher un forum : on se contente des données reçues.

      if (detail.listingRaw || detail.entitlement) {
        const mergedDetail = mergeLibraryDetails(detailsMap[key], detail);
        if (!detailsMap[key] || mergedDetail !== detailsMap[key]) {
          detailsMap[key] = mergedDetail;
          detailsChanged = true;
        }
      }

      const prev = existingMap.get(key);
      if (prev) {
        const mergedIndex = mergeLibraryIndexItems(prev, index);
        const nextUser = mergeUserKeywords(prev?.user, index?.tags);
        if (nextUser && nextUser !== prev.user) {
          mergedIndex.user = nextUser;
        }
        mergedMap.set(key, mergedIndex);
        skipped += 1;
      } else {
        mergedMap.set(key, { ...index, importedAt: now });
        imported += 1;
      }
    }

    for (const [key, it] of existingMap.entries()) {
      if (!mergedMap.has(key)) mergedMap.set(key, it);
    }

      const nextMeta = {
        ...(indexDoc.meta && typeof indexDoc.meta === 'object' ? indexDoc.meta : {}),
        lastImportAt: now,
        lastImportFound: found,
        lastImportImported: imported,
      lastImportSkipped: skipped,
      lastImportSource: 'fab-remote',
      lastImportPages: remotePages,
      lastImportHasMore: remoteHasMore,
      libraryStorage: 'split-v1',
    };

    if (updateIgnore) {
      nextMeta.fabImportIgnore = nextIgnored;
    }

    if (downloadThumbnails && (thumbStats.cached || thumbStats.reused || thumbStats.missing)) {
      nextMeta.lastImportThumbsCached = thumbStats.cached;
      nextMeta.lastImportThumbsReused = thumbStats.reused;
      nextMeta.lastImportThumbsMissing = thumbStats.missing;
    }

    const nextDoc = {
      ...indexDoc,
      items: Array.from(mergedMap.values()),
      meta: nextMeta,
    };

    writeLibraryIndexDocToStore(nextDoc, { onlyIfChanged: true });
    if (detailsChanged) {
      writeLibraryDetailsDocToStore({ items: detailsMap, meta: {} }, { onlyIfChanged: true });
    }
    setLibraryCache(nextDoc, detailsMap);
    cacheLibraryItem.clear();

    const selectedCount = requestedSelected.length > 0
      ? requestedSelected.length
      : importItems.length;
    const ignoredCount = updateIgnore
      ? nextIgnored.length
      : storedIgnored.length;

    logLine({
      level: 'success',
      action: 'library_import_remote',
      message: 'Import distant de la librairie Fab terminé',
      data: {
        found,
        imported,
        skipped,
        selected: selectedCount,
        ignored: ignoredCount,
        pages: remotePages,
        hasMore: remoteHasMore,
        cached: thumbStats.cached,
        reused: thumbStats.reused,
        missing: thumbStats.missing,
      },
    });

    return sendJSON(res, 200, {
      ok: true,
      found,
      imported,
      skipped,
      pages: remotePages,
      hasMore: remoteHasMore,
      cached: thumbStats.cached,
      reused: thumbStats.reused,
      missing: thumbStats.missing,
    });
  }

  return false;
}

module.exports = {
  handleLibraryRoutes,
  invalidateLibraryCache,
  setLibraryCache,
  getFabImportCache,
  setFabImportCache,
};
