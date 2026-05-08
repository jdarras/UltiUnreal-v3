'use strict';

async function handlePostprodProjectRoutes(options = {}) {
  const {
    req,
    res,
    url,
    pathname = '',
    parseBody,
    sendJSON,
    requireSession,
    resolveRoleInput,
    rolesCache,
    DEFAULT_FALLBACK_ROLE,
    parseProjectUsageModeFilters,
    listPostprodProjects,
    sharedStore,
    stmts,
    getPostprodProjectVisibilityPolicy,
    resolveProjectForApi,
    normalizeTaskRefLookup,
    buildRenderTemplatePayload,
    resolveProjectCatalogEntry,
    scanUnrealProjectCatalogFromUproject,
    readCommonServerConfigFile,
    commonServerFile,
    parseHostFromRequestHeader,
    normalizeHostCandidate,
    readHostsServerConfigFile,
    hostsServerFile,
    fetchWrcPresetPayloadFromHosts,
    buildRenderFormFieldsFromWrcPreset,
    resolveWrcPresetPayloadRoot,
    fetchWrcObjectPropertyFromHost,
    extractWrcLayoutFieldIds,
    buildRenderFormFieldsFromWrcLayoutFieldIds,
    logLine,
    fetchWrcPresetPropertyMetadataValueFromHost,
    isLikelyOpaqueWrcIdentifier,
    sanitizeRenderFormFieldLabel,
    fetchWrcPresetPropertyPayloadFromHost,
    extractWrcPropertyValueFromPresetPropertyPayload,
    normalizeRenderFormFieldValueType,
    normalizeRenderFormFieldInputKind,
    normalizeRenderFormDefaultValueFromWrc,
    normalizeSingleLineDefaultText,
    pickReadableWrcIdentifier,
    rolePermissions,
    sanitizeProjectRef,
    sanitizeSyncSource,
    sanitizeSyncResult,
    normalizeSyncDetails,
    nowIso,
    parseRenderPayloadJson,
    audit,
  } = options;

  if (!req || !res || !pathname) return false;

  const normalizePresetKey = (value) => String(value || '').trim();
  const normalizeSnapshotRenderFormFields = (rawFields = []) => {
    const list = Array.isArray(rawFields) ? rawFields : [];
    const out = [];
    for (const rawField of list) {
      if (!rawField || typeof rawField !== 'object' || Array.isArray(rawField)) continue;
      out.push({ ...rawField });
    }
    return out;
  };

  const buildPresetLookupCandidates = (rawValues = []) => {
    const out = [];
    const seen = new Set();
    const append = (rawValue) => {
      const value = normalizePresetKey(rawValue);
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(value);
    };
    const list = Array.isArray(rawValues) ? rawValues : [rawValues];
    for (const entry of list) {
      append(entry);
      const displayMatch = /^([^()]+?)\s*\((\/Game\/[^)]+)\)\s*$/i.exec(String(entry || ''));
      if (displayMatch) {
        append(displayMatch[1]);
        append(displayMatch[2]);
      }
      const withGamePath = /\((\/Game\/[^)]+)\)\s*$/i.exec(String(entry || ''));
      if (withGamePath?.[1]) append(withGamePath[1]);
      if (String(entry || '').startsWith('/Game/')) {
        const shortName = String(entry).split('.').pop()?.split('/').pop();
        append(shortName);
      }
    }
    return out;
  };

  const resolvePresetSnapshotFromProjectDoc = (projectIdRaw, presetCandidatesRaw = []) => {
    const projectId = normalizePresetKey(projectIdRaw);
    if (!projectId || !sharedStore || typeof sharedStore.readProjectDoc !== 'function') return null;
    try {
      const doc = sharedStore.readProjectDoc(projectId) || {};
      const presets = doc && typeof doc.presets === 'object' ? doc.presets : {};
      const lookup = new Map();
      for (const [rawKey, rawRecord] of Object.entries(presets)) {
        const key = normalizePresetKey(rawKey);
        if (!key) continue;
        lookup.set(key.toLowerCase(), { key, rawRecord });
      }
      const candidates = buildPresetLookupCandidates(presetCandidatesRaw);
      for (const candidate of candidates) {
        const match = lookup.get(candidate.toLowerCase());
        if (!match) continue;
        const record = match.rawRecord && typeof match.rawRecord === 'object' ? match.rawRecord : {};
        const payload = (
          record.data && typeof record.data === 'object'
            ? record.data
            : (record.payload && typeof record.payload === 'object' ? record.payload : null)
        );
        if (!payload) continue;
        const cachedFields = normalizeSnapshotRenderFormFields(
          record.renderFormFields
          || record.render_form_fields
          || record.fields
        );
        return {
          key: match.key,
          payload,
          fetchedAt: String(record.fetchedAt || record.ts || '').trim() || null,
          cachedFields,
        };
      }
    } catch {}
    return null;
  };

  const writePresetSnapshotToProjectDoc = (
    projectIdRaw,
    presetCandidatesRaw = [],
    payload = null,
    fields = null
  ) => {
    const projectId = normalizePresetKey(projectIdRaw);
    if (!projectId || !payload || typeof payload !== 'object') return false;
    if (!sharedStore || typeof sharedStore.readProjectDoc !== 'function' || typeof sharedStore.writeProjectDoc !== 'function') {
      return false;
    }
    const candidates = buildPresetLookupCandidates(presetCandidatesRaw);
    if (candidates.length <= 0) return false;
    try {
      const doc = sharedStore.readProjectDoc(projectId) || {};
      const presets = doc.presets && typeof doc.presets === 'object' ? doc.presets : {};
      const fetchedAt = new Date().toISOString();
      const normalizedFields = normalizeSnapshotRenderFormFields(fields);
      for (const key of candidates) {
        const previousRecord = presets[key] && typeof presets[key] === 'object' ? presets[key] : {};
        const nextRecord = {
          ...previousRecord,
          data: payload,
          fetchedAt,
        };
        // Keep last known importable fields if current payload has none (e.g. preset loaded on wrong level).
        if (normalizedFields.length > 0) {
          nextRecord.renderFormFields = normalizedFields;
        }
        presets[key] = nextRecord;
      }
      doc.presets = presets;
      sharedStore.writeProjectDoc(projectId, doc);
      return true;
    } catch {}
    return false;
  };

  if (pathname === '/agent/postprod/projects') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const actorRole = resolveRoleInput(auth?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const actorPerms = rolePermissions(actorRole, rolesCache);
    const usageModeFilters = parseProjectUsageModeFilters(url?.searchParams);
    const projects = listPostprodProjects(sharedStore, usageModeFilters, stmts, actorPerms);
    sendJSON(res, 200, {
      ok: true,
      projects,
      filters: {
        usageMode: usageModeFilters,
        visibilityPolicy: getPostprodProjectVisibilityPolicy(actorPerms),
      },
    });
    return true;
  }

  const projectRenderTemplatesMatch = /^\/agent\/postprod\/projects\/([^/]+)\/render-templates$/.exec(pathname);
  if (projectRenderTemplatesMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    let rawProjectRef = '';
    try {
      rawProjectRef = decodeURIComponent(String(projectRenderTemplatesMatch[1] || ''));
    } catch {
      rawProjectRef = String(projectRenderTemplatesMatch[1] || '');
    }
    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return true;
    }
    const candidates = new Set();
    const pushCandidate = (value) => {
      const normalized = normalizeTaskRefLookup(value);
      if (normalized) candidates.add(normalized);
    };
    pushCandidate(rawProjectRef);
    pushCandidate(projectResolved.projectRef);
    pushCandidate(projectResolved?.project?.id);
    pushCandidate(projectResolved?.project?.name);
    pushCandidate(projectResolved?.project?.code);
    const templates = stmts.listRenderTemplates
      .all()
      .map((row) => buildRenderTemplatePayload(row, rolesCache))
      .filter((tpl) => candidates.has(normalizeTaskRefLookup(tpl?.projectName)));
    sendJSON(res, 200, {
      ok: true,
      project: projectResolved.project,
      usageMode: String(projectResolved.usageMode || ''),
      templates,
    });
    return true;
  }

  const projectUnrealCatalogMatch = /^\/agent\/postprod\/projects\/([^/]+)\/unreal-catalog$/.exec(pathname);
  if (projectUnrealCatalogMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    let rawProjectRef = '';
    try {
      rawProjectRef = decodeURIComponent(String(projectUnrealCatalogMatch[1] || ''));
    } catch {
      rawProjectRef = String(projectUnrealCatalogMatch[1] || '');
    }
    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return true;
    }
    const projectEntry = (
      resolveProjectCatalogEntry(sharedStore, projectResolved.projectRef || rawProjectRef, stmts)
      || resolveProjectCatalogEntry(sharedStore, rawProjectRef, stmts)
    );
    const uprojectPath = String(projectEntry?.uprojectPath || '').trim();
    if (!uprojectPath) {
      sendJSON(res, 400, { ok: false, error: 'missing_project_uproject_path' });
      return true;
    }
    const catalogResult = scanUnrealProjectCatalogFromUproject(uprojectPath);
    if (!catalogResult.ok) {
      sendJSON(res, Number(catalogResult.status || 400), {
        ok: false,
        error: String(catalogResult.error || 'project_unreal_catalog_failed'),
      });
      return true;
    }
    let catalog = catalogResult.catalog && typeof catalogResult.catalog === 'object'
      ? { ...catalogResult.catalog }
      : { levels: [], sequences: [], presets: [], wrcPresets: [], stats: null };
    let projectMeta = {};
    if (sharedStore && typeof sharedStore.readProjectMeta === 'function') {
      const metaCandidates = [
        projectResolved?.project?.id,
        projectResolved?.project?.code,
        projectResolved?.project?.name,
        projectResolved?.projectRef,
        rawProjectRef,
      ];
      const seenMetaCandidate = new Set();
      for (const candidate of metaCandidates) {
        const key = String(candidate || '').trim();
        if (!key) continue;
        const normalized = key.toLowerCase();
        if (seenMetaCandidate.has(normalized)) continue;
        seenMetaCandidate.add(normalized);
        try {
          const loadedMeta = sharedStore.readProjectMeta(key) || {};
          if (loadedMeta && typeof loadedMeta === 'object' && Object.keys(loadedMeta).length > 0) {
            projectMeta = loadedMeta;
            const hasWrc = Array.isArray(loadedMeta?.wrcNames)
              ? loadedMeta.wrcNames.length > 0
              : !!String(loadedMeta?.wrcName || '').trim();
            if (hasWrc) break;
          }
        } catch {}
      }
    }

    const fallbackWrcEntries = [];
    const appendFallbackWrc = (rawName, source = 'fallback') => {
      const value = String(rawName || '').trim();
      if (!value) return;
      fallbackWrcEntries.push({
        name: value,
        assetPath: value,
        relativePath: '',
        source,
      });
    };

    const resolveFirstWrc = (obj) => {
      if (!obj) return '';
      if (Array.isArray(obj.wrcNames) && obj.wrcNames.length > 0) return String(obj.wrcNames[0] || '').trim();
      return String(obj.wrcName || '').trim();
    };
    appendFallbackWrc(resolveFirstWrc(projectMeta), 'project_meta');
    appendFallbackWrc(resolveFirstWrc(projectResolved?.project), 'project_resolved');
    appendFallbackWrc(resolveFirstWrc(projectEntry), 'project_entry');

    if (fallbackWrcEntries.length <= 0) {
      const catalogPresets = Array.isArray(catalog?.presets) ? catalog.presets : [];
      for (const entry of catalogPresets) {
        const name = String(entry?.name || '').trim();
        const assetPath = String(entry?.assetPath || '').trim();
        const rel = String(entry?.relativePath || '').trim().toLowerCase();
        const key = `${name} ${assetPath} ${rel}`.toLowerCase();
        if (
          key.includes('remotecontrol')
          || key.includes('remote_control')
          || key.includes('/wrc/')
          || key.includes('wrc_')
          || key.includes('wrc-')
        ) {
          appendFallbackWrc(name || assetPath, 'catalog_preset_heuristic');
        }
      }
    }

    const catalogHasDetectedWrc = Array.isArray(catalog?.wrcPresets) && catalog.wrcPresets.length > 0;
    if (fallbackWrcEntries.length > 0 && !catalogHasDetectedWrc) {
      const currentWrcPresets = Array.isArray(catalog?.wrcPresets) ? [...catalog.wrcPresets] : [];
      const dedupe = new Set(
        currentWrcPresets.map((entry) => {
          const name = String(entry?.name || '').trim().toLowerCase();
          const assetPath = String(entry?.assetPath || '').trim().toLowerCase();
          return `${name}|${assetPath}`;
        })
      );
      for (const fallbackEntry of fallbackWrcEntries) {
        const name = String(fallbackEntry?.name || '').trim();
        const assetPath = String(fallbackEntry?.assetPath || '').trim();
        const key = `${name.toLowerCase()}|${assetPath.toLowerCase()}`;
        if (!name && !assetPath) continue;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        currentWrcPresets.push({
          name,
          assetPath,
          relativePath: String(fallbackEntry?.relativePath || '').trim(),
          source: String(fallbackEntry?.source || 'fallback').trim(),
        });
      }
      currentWrcPresets.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      catalog = { ...catalog, wrcPresets: currentWrcPresets };
    }
    sendJSON(res, 200, {
      ok: true,
      project: projectResolved.project,
      usageMode: String(projectResolved.usageMode || ''),
      catalog,
    });
    return true;
  }

  const projectWrcFieldsMatch = /^\/agent\/postprod\/projects\/([^/]+)\/wrc-fields$/.exec(pathname);
  if (projectWrcFieldsMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    let rawProjectRef = '';
    try {
      rawProjectRef = decodeURIComponent(String(projectWrcFieldsMatch[1] || ''));
    } catch {
      rawProjectRef = String(projectWrcFieldsMatch[1] || '');
    }
    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return true;
    }

    const commonConfig = readCommonServerConfigFile(commonServerFile);
    const requestedWrcFile = String(
      url?.searchParams?.get('wrcFile')
      || url?.searchParams?.get('preset')
      || url?.searchParams?.get('presetName')
    ).trim();
    const refreshRaw = String(
      url?.searchParams?.get('refreshSnapshot')
      || url?.searchParams?.get('refresh')
      || ''
    ).trim().toLowerCase();
    const refreshSnapshot = (
      refreshRaw === '1'
      || refreshRaw === 'true'
      || refreshRaw === 'yes'
      || refreshRaw === 'oui'
    );
    // wrcFile is the individual WRC filename (e.g. "MyPreset" or "/Game/..."); also used as presetName for RC queries
    const requestedPresetName = requestedWrcFile;
    if (!requestedPresetName) {
      sendJSON(res, 400, { ok: false, error: 'missing_wrc_file' });
      return true;
    }
    const presetCandidates = [];
    const presetCandidatesSeen = new Set();
    const appendPresetCandidate = (rawValue) => {
      const value = String(rawValue || '').trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (presetCandidatesSeen.has(key)) return;
      presetCandidatesSeen.add(key);
      presetCandidates.push(value);
    };
    appendPresetCandidate(requestedPresetName);
    const presetDisplayMatch = /^([^()]+?)\s*\((\/Game\/[^)]+)\)\s*$/i.exec(requestedPresetName);
    if (presetDisplayMatch) {
      appendPresetCandidate(String(presetDisplayMatch[1] || '').trim());
      appendPresetCandidate(String(presetDisplayMatch[2] || '').trim());
    }
    const presetPathMatch = /\((\/Game\/[^)]+)\)\s*$/i.exec(requestedPresetName);
    if (presetPathMatch?.[1]) {
      appendPresetCandidate(String(presetPathMatch[1] || '').trim());
    }
    if (requestedPresetName.startsWith('/Game/')) {
      const shortName = String(requestedPresetName).split('.').pop()?.split('/').pop();
      appendPresetCandidate(shortName);
    }
    const projectEntry = (
      resolveProjectCatalogEntry(sharedStore, projectResolved.projectRef || rawProjectRef, stmts)
      || resolveProjectCatalogEntry(sharedStore, rawProjectRef, stmts)
    );
    const uprojectPath = String(projectEntry?.uprojectPath || '').trim();
    if (uprojectPath) {
      const catalogResult = scanUnrealProjectCatalogFromUproject(uprojectPath);
      if (catalogResult?.ok) {
        const wrcList = Array.isArray(catalogResult?.catalog?.wrcPresets) ? catalogResult.catalog.wrcPresets : [];
        const requestedLower = requestedPresetName.toLowerCase();
        for (const entry of wrcList) {
          const name = String(entry?.name || '').trim();
          const assetPath = String(entry?.assetPath || '').trim();
          const nameLower = name.toLowerCase();
          const assetLower = assetPath.toLowerCase();
          const isMatch = (
            requestedLower === nameLower
            || requestedLower === assetLower
            || (requestedLower && assetLower.endsWith(`.${requestedLower}`))
            || (requestedLower && assetLower.endsWith(`/${requestedLower}`))
          );
          if (!isMatch) continue;
          appendPresetCandidate(assetPath);
          appendPresetCandidate(name);
        }
      }
    }
    const projectIdForSnapshot = projectResolved.project?.id || projectResolved.project?.name || rawProjectRef;
    const sendSnapshotFieldsResponse = ({
      snapshot = null,
      usingLastKnownPreset = false,
      rawError = '',
      rcPort = null,
      endpoint = null,
      fallbackSource = 'snapshot_cache',
      attempts = [],
      hostsTried = [],
      includeFetchDetails = false,
    } = {}) => {
      if (!snapshot?.payload) return false;
      let cachedFields = buildRenderFormFieldsFromWrcPreset(snapshot.payload, requestedWrcFile);
      let effectiveFallbackSource = String(fallbackSource || 'snapshot_cache').trim() || 'snapshot_cache';
      if (
        (!Array.isArray(cachedFields) || cachedFields.length <= 0)
        && Array.isArray(snapshot?.cachedFields)
        && snapshot.cachedFields.length > 0
      ) {
        cachedFields = snapshot.cachedFields.map((field) => {
          const row = field && typeof field === 'object' ? { ...field } : {};
          if (!String(row.wrcFile || '').trim()) row.wrcFile = requestedWrcFile;
          return row;
        });
        effectiveFallbackSource = 'snapshot_fields_cache';
      }
      const payload = {
        ok: true,
        project: projectResolved.project,
        usageMode: String(projectResolved.usageMode || ''),
        wrcFile: requestedWrcFile,
        presetName: snapshot.key || requestedWrcFile,
        fields: cachedFields,
        fallbackSource: effectiveFallbackSource,
        fromCache: true,
        fromSnapshot: true,
        usingLastKnownPreset: usingLastKnownPreset === true,
        refreshedFromUnreal: false,
        fetchedAt: snapshot.fetchedAt,
      };
      if (endpoint) payload.endpoint = endpoint;
      if (Number.isFinite(Number(rcPort)) && Number(rcPort) > 0) payload.rcPort = Math.trunc(Number(rcPort));
      if (rawError) payload.rawError = String(rawError);
      if (includeFetchDetails) {
        payload.hostsTried = Array.isArray(hostsTried) ? hostsTried : [];
        payload.attempts = Array.isArray(attempts) ? attempts.slice(-25) : [];
      }
      sendJSON(res, 200, payload);
      return true;
    };
    const snapshotCandidates = [requestedWrcFile, ...presetCandidates];
    const initialSnapshot = resolvePresetSnapshotFromProjectDoc(projectIdForSnapshot, snapshotCandidates);
    if (!refreshSnapshot) {
      if (sendSnapshotFieldsResponse({ snapshot: initialSnapshot, fallbackSource: 'snapshot_cache' })) {
        return true;
      }
      sendJSON(res, 404, {
        ok: false,
        error: 'wrc_preset_unreachable_no_snapshot',
        presetName: requestedPresetName,
        presetCandidates,
      });
      return true;
    }

    const rcPortQuery = Number(url?.searchParams?.get('port') || 0);
    const rcPort = Number.isFinite(rcPortQuery) && rcPortQuery > 0
      ? Math.trunc(rcPortQuery)
      : (
        Number.isFinite(Number(commonConfig?.rcHttpPort))
          ? Math.max(1, Math.trunc(Number(commonConfig.rcHttpPort)))
          : 30010
      );
    const requestHost = parseHostFromRequestHeader(req?.headers?.host);
    const primaryHostCandidates = [];
    const seenPrimaryHostCandidate = new Set();
    const allHostCandidates = [];
    const seenAllHostCandidate = new Set();
    const appendHostCandidate = (rawHost) => {
      const host = normalizeHostCandidate(rawHost);
      if (!host) return;
      const primaryKey = host.toLowerCase();
      if (!seenPrimaryHostCandidate.has(primaryKey)) {
        seenPrimaryHostCandidate.add(primaryKey);
        primaryHostCandidates.push(host);
      }
    };
    const appendAllHostCandidate = (rawHost) => {
      const host = normalizeHostCandidate(rawHost);
      if (!host) return;
      const key = host.toLowerCase();
      if (seenAllHostCandidate.has(key)) return;
      seenAllHostCandidate.add(key);
      allHostCandidates.push(host);
    };
    const hostFromQuery = String(url?.searchParams?.get('host') || '').trim();
    appendHostCandidate(hostFromQuery);
    appendHostCandidate(requestHost);
    appendHostCandidate(commonConfig?.serverIp);
    appendHostCandidate('127.0.0.1');
    appendHostCandidate('localhost');

    for (const host of primaryHostCandidates) appendAllHostCandidate(host);
    const hostsConfig = readHostsServerConfigFile(hostsServerFile);
    if (hostsConfig && typeof hostsConfig === 'object') {
      for (const [hostKey, hostRawEntry] of Object.entries(hostsConfig)) {
        const hostEntry = hostRawEntry && typeof hostRawEntry === 'object' ? hostRawEntry : {};
        const avail = hostEntry?.renderAvailability;
        // Migration : exclure les hosts marqués 'excluded' ou les anciens hosts non-eligibles
        if (avail === 'excluded') continue;
        if (!avail && hostEntry?.eligible === false && hostEntry?.renderEnabled === false) continue;
        appendAllHostCandidate(hostEntry?.ip);
        appendAllHostCandidate(hostEntry?.host);
        appendAllHostCandidate(hostKey);
      }
    }
    const hasSnapshotForQuickFallback = !!initialSnapshot?.payload;
    const hostCandidates = hasSnapshotForQuickFallback
      ? primaryHostCandidates.slice(0, 2)
      : allHostCandidates;
    const fetchTimeoutMs = hasSnapshotForQuickFallback ? 800 : 3000;

    const fetchedPreset = await fetchWrcPresetPayloadFromHosts({
      hosts: hostCandidates,
      rcPort,
      presetName: requestedPresetName,
      presetNames: presetCandidates,
      timeoutMs: fetchTimeoutMs,
    });
    if (!fetchedPreset.ok) {
      const cachedSnapshot = resolvePresetSnapshotFromProjectDoc(projectIdForSnapshot, snapshotCandidates);
      if (sendSnapshotFieldsResponse({
        snapshot: cachedSnapshot,
        usingLastKnownPreset: true,
        rawError: String(fetchedPreset.error || ''),
        rcPort,
        endpoint: null,
        fallbackSource: 'snapshot_cache',
        attempts: fetchedPreset?.attempts,
        hostsTried: hostCandidates,
        includeFetchDetails: true,
      })) {
        return true;
      }
      const baseError = String(fetchedPreset.error || 'wrc_preset_unreachable');
      const noSnapshotError = (
        baseError === 'wrc_preset_unreachable'
        || baseError === 'wrc_fetch_failed'
        || baseError === 'wrc_timeout'
        || baseError.startsWith('wrc_http_')
      )
        ? 'wrc_preset_unreachable_no_snapshot'
        : baseError;
      sendJSON(res, 502, {
        ok: false,
        error: noSnapshotError,
        rawError: baseError,
        presetName: requestedPresetName,
        presetCandidates,
        rcPort,
        hostsTried: hostCandidates,
        attempts: Array.isArray(fetchedPreset?.attempts)
          ? fetchedPreset.attempts.slice(-25)
          : [],
      });
      return true;
    }

    let fields = buildRenderFormFieldsFromWrcPreset(fetchedPreset.payload, requestedWrcFile);
    let fallbackSource = '';
    const resolvedPresetName = String(fetchedPreset?.endpoint?.presetName || requestedPresetName).trim();
    const endpointHost = String(fetchedPreset?.endpoint?.host || '').trim();
    if (fields.length <= 0) {
      const payloadRoot = resolveWrcPresetPayloadRoot(fetchedPreset.payload);
      const presetObjectPath = String(payloadRoot?.Path || payloadRoot?.path || '').trim();
      if (presetObjectPath && endpointHost) {
        const layoutResult = await fetchWrcObjectPropertyFromHost({
          host: endpointHost,
          rcPort,
          objectPath: presetObjectPath,
          propertyName: 'Layout',
          timeoutMs: 3000,
        });
        if (layoutResult.ok) {
          const layoutFieldIds = extractWrcLayoutFieldIds(layoutResult.value);
          if (layoutFieldIds.length > 0) {
            fields = buildRenderFormFieldsFromWrcLayoutFieldIds(layoutFieldIds);
            fallbackSource = 'layout_fields';
            logLine({
              level: 'info',
              src: 'postprod',
              action: 'wrc_fields_layout_fallback',
              message: 'Import WRC fallback via layout fields',
              project: projectResolved.project,
              presetName: String(fetchedPreset?.endpoint?.presetName || requestedPresetName),
              count: Number(layoutFieldIds.length || 0),
            });
          }
        }
      }
    }
    if (fields.length > 0 && endpointHost && resolvedPresetName) {
      const enrichedFields = [];
      const propertyDetailCache = new Map();
      for (const field of fields) {
        const row = field && typeof field === 'object' ? { ...field } : field;
        const propertyCandidatesRaw = [
          row?.fieldLabel,
          row?.payloadKey,
          row?.fieldKey,
          String(row?.sourcePath || '').split('.').pop(),
        ];
        const propertyCandidates = [];
        const seenCandidates = new Set();
        for (const candidateRaw of propertyCandidatesRaw) {
          const candidate = String(candidateRaw || '').trim();
          if (!candidate) continue;
          const key = candidate.toLowerCase();
          if (seenCandidates.has(key)) continue;
          seenCandidates.add(key);
          propertyCandidates.push(candidate);
        }

        const sourcePath = String(row?.sourcePath || '').trim();
        const layoutFieldId = sourcePath.toLowerCase().startsWith('layout.')
          ? String(sourcePath.slice('layout.'.length)).trim()
          : '';
        if (fallbackSource === 'layout_fields' && layoutFieldId) {
          const widgetMetaResult = await fetchWrcPresetPropertyMetadataValueFromHost({
            host: endpointHost,
            rcPort,
            presetName: resolvedPresetName,
            propertyName: layoutFieldId,
            metadataKey: 'Widget',
            timeoutMs: 2000,
          });
          const widgetHint = String(widgetMetaResult?.value || '').trim();
          if (widgetHint) {
            const key = widgetHint.toLowerCase();
            if (!seenCandidates.has(key)) {
              seenCandidates.add(key);
              propertyCandidates.push(widgetHint);
            }
            if (isLikelyOpaqueWrcIdentifier(row?.fieldLabel)) {
              row.fieldLabel = sanitizeRenderFormFieldLabel(widgetHint, row?.fieldKey || 'field');
            }
          }
        }
        let propertyPayload = null;
        for (const candidate of propertyCandidates) {
          const cacheKey = `${resolvedPresetName.toLowerCase()}::${candidate.toLowerCase()}`;
          if (propertyDetailCache.has(cacheKey)) {
            propertyPayload = propertyDetailCache.get(cacheKey);
          } else {
            const propertyResult = await fetchWrcPresetPropertyPayloadFromHost({
              host: endpointHost,
              rcPort,
              presetName: resolvedPresetName,
              propertyName: candidate,
              timeoutMs: 3000,
            });
            propertyPayload = propertyResult.ok ? propertyResult.payload : null;
            propertyDetailCache.set(cacheKey, propertyPayload);
          }
          if (propertyPayload && typeof propertyPayload === 'object') break;
        }
        if (propertyPayload && typeof propertyPayload === 'object') {
          const defaultRaw = extractWrcPropertyValueFromPresetPropertyPayload(propertyPayload);
          if (defaultRaw !== undefined) {
            let valueType = normalizeRenderFormFieldValueType(row?.valueType, 'string');
            let inputKind = normalizeRenderFormFieldInputKind(row?.inputKind, 'text');
            if (defaultRaw && typeof defaultRaw === 'object' && valueType === 'string') {
              valueType = 'json';
              inputKind = 'json';
            }
            let nextDefault = normalizeRenderFormDefaultValueFromWrc(valueType, defaultRaw);
            if (inputKind === 'text' && typeof nextDefault === 'string') {
              nextDefault = normalizeSingleLineDefaultText(nextDefault);
            }
            row.inputKind = inputKind;
            row.valueType = valueType;
            row.defaultValue = nextDefault;
          }
          const desc = propertyPayload.ExposedPropertyDescription && typeof propertyPayload.ExposedPropertyDescription === 'object'
            ? propertyPayload.ExposedPropertyDescription
            : (
              propertyPayload.exposedPropertyDescription && typeof propertyPayload.exposedPropertyDescription === 'object'
                ? propertyPayload.exposedPropertyDescription
                : {}
            );
          const descLabel = sanitizeRenderFormFieldLabel(
            pickReadableWrcIdentifier(
              desc.DisplayName,
              desc.displayName,
              desc?.UnderlyingProperty?.DisplayName,
              desc?.UnderlyingProperty?.displayName,
              desc?.UnderlyingProperty?.Name,
              desc?.UnderlyingProperty?.name,
              row?.fieldLabel
            ),
            row?.fieldKey || 'field'
          );
          if (descLabel) {
            row.fieldLabel = descLabel;
          }
        }
        enrichedFields.push(row);
      }
      fields = enrichedFields;
    }
    // Save preset snapshot to project doc for offline use
    if (projectIdForSnapshot && fetchedPreset.payload) {
      const snapshotSaved = writePresetSnapshotToProjectDoc(
        projectIdForSnapshot,
        [requestedWrcFile, resolvedPresetName, ...presetCandidates],
        fetchedPreset.payload,
        fields
      );
      if (!snapshotSaved) {
        logLine({
          level: 'warn',
          src: 'postprod',
          action: 'wrc_fields_snapshot_failed',
          message: 'Unable to persist WRC snapshot in project doc',
          wrcFile: requestedWrcFile,
        });
      }
    }

    sendJSON(res, 200, {
      ok: true,
      project: projectResolved.project,
      usageMode: String(projectResolved.usageMode || ''),
      wrcFile: requestedWrcFile,
      presetName: resolvedPresetName || requestedWrcFile,
      rcPort,
      endpoint: fetchedPreset.endpoint || null,
      fields,
      fallbackSource: fallbackSource || undefined,
      refreshedFromUnreal: true,
      fromSnapshot: false,
      usingLastKnownPreset: false,
      fromCache: false,
    });
    return true;
  }

  const projectSyncMatch = /^\/agent\/postprod\/projects\/([^/]+)\/sync$/.exec(pathname);
  if (projectSyncMatch) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;

    let rawProjectRef = '';
    try {
      rawProjectRef = decodeURIComponent(String(projectSyncMatch[1] || ''));
    } catch {
      rawProjectRef = String(projectSyncMatch[1] || '');
    }
    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return true;
    }

    const actorRole = resolveRoleInput(auth?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const actorPerms = rolePermissions(actorRole, rolesCache);
    const actorUserId = Number(auth?.session?.user_id || 0);
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || rawProjectRef);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return true;
    }

    if (actorPerms.canSyncScenes !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_sync' });
      return true;
    }
    if (actorPerms.canManageProjectPermissions !== true) {
      const projectRole = stmts.findProjectUserRole.get(actorUserId, projectRef);
      const canSyncProject = Number(projectRole?.is_referent) === 1 && Number(projectRole?.can_sync) === 1;
      if (!canSyncProject) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_project_sync_not_referent' });
        return true;
      }
    }

    const body = await parseBody(req);
    const source = sanitizeSyncSource(body?.source || 'manual');
    const result = sanitizeSyncResult(body?.result || 'ok');
    const detailsPayload = normalizeSyncDetails(body?.details ?? body?.payload ?? {});
    if (!detailsPayload.ok) {
      sendJSON(res, 400, { ok: false, error: detailsPayload.error || 'invalid_sync_details' });
      return true;
    }

    const syncedAt = nowIso();
    stmts.insertSyncEvent.run(
      projectRef,
      actorUserId,
      source,
      result,
      detailsPayload.json,
      syncedAt
    );

    if (projectResolved?.project?.id && sharedStore && typeof sharedStore.readProjectMeta === 'function' && typeof sharedStore.writeProjectMeta === 'function') {
      try {
        const prevMeta = sharedStore.readProjectMeta(projectResolved.project.id) || {};
        const nextMeta = {
          ...prevMeta,
          syncedAt,
        };
        sharedStore.writeProjectMeta(projectResolved.project.id, nextMeta, { onlyIfChanged: true });
      } catch {}
    }

    const recentEvents = stmts.listSyncEventsByProjectId
      .all(projectRef, 1)
      .map((row) => ({
        id: Number(row?.id || 0),
        projectId: String(row?.project_id || ''),
        byUserId: Number(row?.by_user_id || 0),
        source: String(row?.source || ''),
        result: String(row?.result || ''),
        details: parseRenderPayloadJson(row?.details_json),
        syncedAt: row?.synced_at || null,
      }));
    const syncEvent = recentEvents[0] || {
      id: 0,
      projectId: projectRef,
      byUserId: actorUserId,
      source,
      result,
      details: parseRenderPayloadJson(detailsPayload.json),
      syncedAt,
    };

    audit(
      actorUserId,
      'project_sync',
      {
        projectId: projectRef,
        source,
        result,
      },
      'project',
      projectRef
    );

    sendJSON(res, 200, {
      ok: true,
      project: projectResolved.project,
      sync: syncEvent,
    });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodProjectRoutes,
};
