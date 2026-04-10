function createResourcesCatalogHelpers(deps = {}) {
  const {
    safeParseObjectJson = (value, fallback = {}) => {
      const raw = String(value || '').trim();
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
      } catch {
        return fallback;
      }
    },
    normalizeJsonValueWithSize = (value) => ({ ok: true, json: JSON.stringify(value || {}) }),
    nowIso = () => new Date().toISOString(),
    addTaskRefAlias = () => {},
    MAX_RESOURCE_CODE_LEN = 120,
    MAX_RESOURCE_TYPE_LEN = 120,
    MAX_RESOURCE_TITLE_LEN = 220,
    MAX_RESOURCE_SOURCE_PATH_LEN = 1024,
    MAX_RESOURCE_METADATA_BYTES = 256 * 1024,
  } = deps;

  function sanitizeResourceIndexCode(value, fallback = '') {
    const raw = String(value || '').trim();
    const safe = raw || String(fallback || '').trim();
    return safe.slice(0, MAX_RESOURCE_CODE_LEN);
  }

  function sanitizeResourceIndexType(value, fallback = '') {
    const raw = String(value || '').trim();
    const safe = raw || String(fallback || '').trim();
    return safe.slice(0, MAX_RESOURCE_TYPE_LEN);
  }

  function sanitizeResourceIndexTitle(value, fallback = '') {
    const raw = String(value || '').trim();
    const safe = raw || String(fallback || '').trim();
    return safe.slice(0, MAX_RESOURCE_TITLE_LEN);
  }

  function sanitizeResourceIndexSourcePath(value) {
    return String(value || '').trim().slice(0, MAX_RESOURCE_SOURCE_PATH_LEN);
  }

  function normalizeResourceIndexMetadataForStorage(item) {
    const source = item && typeof item === 'object' ? item : {};
    const uid = sanitizeResourceIndexCode(source.uid || source.listingUid || '', '');
    const title = sanitizeResourceIndexTitle(
      source.title || source.name || source.displayName || uid || '',
      uid
    );
    const type = sanitizeResourceIndexType(source.type || source.listingType || source.kind || '');
    const sourcePath = sanitizeResourceIndexSourcePath(source.sourcePath || source.path || '');
    const metadata = {
      uid: uid || title,
      listingUid: uid || title,
      title: title || uid,
      name: title || uid,
      displayName: title || uid,
      type,
      listingType: type,
      sourcePath,
      path: sourcePath,
      seller: String(source.seller || '').trim(),
      listingUrl: String(source.listingUrl || '').trim(),
      thumbLocal: String(source.thumbLocal || source.thumbnailLocal || '').trim(),
      thumbnailUrl: String(source.thumbnailUrl || source.thumbUrl || '').trim(),
      thumbUrl: String(source.thumbUrl || source.thumbnailUrl || '').trim(),
      thumbnails: Array.isArray(source.thumbnails) ? source.thumbnails : [],
      ueVersions: Array.isArray(source.ueVersions) ? source.ueVersions : [],
      targetPlatforms: Array.isArray(source.targetPlatforms) ? source.targetPlatforms : [],
      assetFormats: Array.isArray(source.assetFormats) ? source.assetFormats : [],
      distribution: String(source.distribution || '').trim(),
    };
    if (source.user && typeof source.user === 'object') {
      metadata.user = source.user;
    }
    const normalizedMeta = normalizeJsonValueWithSize(metadata, {
      fallbackValue: {},
      maxBytes: MAX_RESOURCE_METADATA_BYTES,
      invalidError: 'invalid_resource_metadata',
      tooLargeError: 'resource_metadata_too_large',
    });
    if (!normalizedMeta.ok) {
      const fallback = {
        uid: uid || title,
        listingUid: uid || title,
        title: title || uid,
        name: title || uid,
        displayName: title || uid,
        type,
        listingType: type,
        sourcePath,
        path: sourcePath,
      };
      return { metadata: fallback, metadataJson: JSON.stringify(fallback) };
    }
    return {
      metadata,
      metadataJson: normalizedMeta.json,
    };
  }

  function buildPostprodResourcePayload(row) {
    const metadata = safeParseObjectJson(row?.metadata_json, {});
    const code = sanitizeResourceIndexCode(row?.code || '');
    const title = sanitizeResourceIndexTitle(metadata?.title || row?.title || code, code);
    const uid = sanitizeResourceIndexCode(metadata?.uid || metadata?.listingUid || code, title);
    const type = sanitizeResourceIndexType(metadata?.type || metadata?.listingType || row?.type || '');
    const sourcePath = sanitizeResourceIndexSourcePath(
      metadata?.sourcePath || metadata?.path || row?.source_path || ''
    );
    return {
      ...metadata,
      uid: uid || title,
      listingUid: uid || title,
      code: code || uid || title,
      title: title || uid,
      name: title || uid,
      displayName: title || uid,
      type,
      listingType: type,
      sourcePath,
      path: sourcePath,
      thumbLocal: String(metadata?.thumbLocal || '').trim(),
      thumbnailUrl: String(metadata?.thumbnailUrl || metadata?.thumbUrl || '').trim(),
      thumbUrl: String(metadata?.thumbUrl || metadata?.thumbnailUrl || '').trim(),
      thumbnails: Array.isArray(metadata?.thumbnails) ? metadata.thumbnails : [],
      seller: String(metadata?.seller || '').trim(),
      listingUrl: String(metadata?.listingUrl || '').trim(),
      createdAt: String(row?.created_at || '').trim(),
      updatedAt: String(row?.updated_at || '').trim(),
    };
  }

  function syncResourcesIndexFromLibrary(stmts, sharedStore, { now = nowIso() } = {}) {
    if (!stmts || typeof stmts.upsertResourceIndexByCode?.run !== 'function') {
      return { ok: false, error: 'resources_index_unavailable', processed: 0, inserted: 0, updated: 0 };
    }
    if (!sharedStore || typeof sharedStore.loadLibraryIndexDoc !== 'function') {
      return { ok: false, error: 'library_unavailable', processed: 0, inserted: 0, updated: 0 };
    }
    let libraryDoc = null;
    try {
      libraryDoc = sharedStore.loadLibraryIndexDoc();
    } catch {
      libraryDoc = null;
    }
    const items = Array.isArray(libraryDoc?.items) ? libraryDoc.items : [];
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    for (const item of items) {
      const normalized = normalizeResourceIndexMetadataForStorage(item);
      const code = sanitizeResourceIndexCode(
        item?.uid || item?.listingUid || normalized?.metadata?.uid || normalized?.metadata?.title || '',
        normalized?.metadata?.title || ''
      );
      const title = sanitizeResourceIndexTitle(
        normalized?.metadata?.title || item?.title || item?.name || '',
        code
      );
      if (!code || !title) continue;
      const type = sanitizeResourceIndexType(
        normalized?.metadata?.type || item?.type || item?.listingType || ''
      );
      const sourcePath = sanitizeResourceIndexSourcePath(
        normalized?.metadata?.sourcePath || item?.sourcePath || item?.path || ''
      );
      const existing = stmts.findResourceIndexByCode.get(code);
      stmts.upsertResourceIndexByCode.run(
        code,
        type,
        title,
        sourcePath,
        normalized.metadataJson,
        String(existing?.created_at || now),
        now
      );
      processed += 1;
      if (existing) updated += 1;
      else inserted += 1;
    }
    return { ok: true, processed, inserted, updated, totalSource: items.length };
  }

  function buildResourceTaskRefCatalog(stmts) {
    const aliasToCanonical = new Map();
    const rows = Array.isArray(stmts?.listResourceIndexTaskRefs?.all?.())
      ? stmts.listResourceIndexTaskRefs.all()
      : [];
    for (const row of rows) {
      const code = sanitizeResourceIndexCode(row?.code || '');
      const title = sanitizeResourceIndexTitle(row?.title || '', code);
      const canonical = code || title;
      if (!canonical) continue;
      addTaskRefAlias(aliasToCanonical, canonical, canonical);
      addTaskRefAlias(aliasToCanonical, code, canonical);
      addTaskRefAlias(aliasToCanonical, title, canonical);
    }
    return aliasToCanonical;
  }

  function listPostprodResources(stmts) {
    if (!stmts || typeof stmts.listResourcesIndex?.all !== 'function') return [];
    const rows = stmts.listResourcesIndex.all();
    return (Array.isArray(rows) ? rows : []).map(buildPostprodResourcePayload);
  }

  function resolvePostprodResourceByRef(stmts, value) {
    const resourceRef = String(value || '').trim();
    if (!resourceRef) return { ok: false, error: 'invalid_resource_id' };
    if (!stmts || typeof stmts.findResourceIndexByRef?.get !== 'function') {
      return { ok: false, error: 'resource_not_found' };
    }

    const row = stmts.findResourceIndexByRef.get(resourceRef, resourceRef);
    if (row) return { ok: true, item: buildPostprodResourcePayload(row) };
    return { ok: false, error: 'resource_not_found' };
  }

  return {
    sanitizeResourceIndexCode,
    sanitizeResourceIndexType,
    sanitizeResourceIndexTitle,
    sanitizeResourceIndexSourcePath,
    normalizeResourceIndexMetadataForStorage,
    buildPostprodResourcePayload,
    syncResourcesIndexFromLibrary,
    buildResourceTaskRefCatalog,
    listPostprodResources,
    resolvePostprodResourceByRef,
  };
}

module.exports = { createResourcesCatalogHelpers };

