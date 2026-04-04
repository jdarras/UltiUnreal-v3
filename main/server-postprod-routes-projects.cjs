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
    SYSTEM_MAINTENANCE_ROLE,
    sanitizeSyncSource,
    sanitizeSyncResult,
    normalizeSyncDetails,
    nowIso,
    parseRenderPayloadJson,
    audit,
  } = options;

  if (!req || !res || !pathname) return false;

  if (pathname === '/agent/postprod/projects') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const actorRole = resolveRoleInput(auth?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const usageModeFilters = parseProjectUsageModeFilters(url?.searchParams);
    const projects = listPostprodProjects(sharedStore, usageModeFilters, stmts, actorRole);
    sendJSON(res, 200, {
      ok: true,
      projects,
      filters: {
        usageMode: usageModeFilters,
        visibilityPolicy: getPostprodProjectVisibilityPolicy(actorRole),
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
            if (String(loadedMeta?.wrcName || '').trim()) break;
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

    appendFallbackWrc(projectMeta?.wrcName, 'project_meta');
    appendFallbackWrc(projectResolved?.project?.wrcName, 'project_resolved');
    appendFallbackWrc(projectEntry?.wrcName, 'project_entry');

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
    const requestedPresetName = String(
      url?.searchParams?.get('preset')
      || url?.searchParams?.get('presetName')
    ).trim();
    if (!requestedPresetName) {
      sendJSON(res, 400, { ok: false, error: 'missing_preset_name' });
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
    const rcPortQuery = Number(url?.searchParams?.get('port') || 0);
    const rcPort = Number.isFinite(rcPortQuery) && rcPortQuery > 0
      ? Math.trunc(rcPortQuery)
      : (
        Number.isFinite(Number(commonConfig?.rcHttpPort))
          ? Math.max(1, Math.trunc(Number(commonConfig.rcHttpPort)))
          : 30010
      );
    const requestHost = parseHostFromRequestHeader(req?.headers?.host);
    const hostCandidates = [];
    const seenHostCandidate = new Set();
    const appendHostCandidate = (rawHost) => {
      const host = normalizeHostCandidate(rawHost);
      if (!host) return;
      const key = host.toLowerCase();
      if (seenHostCandidate.has(key)) return;
      seenHostCandidate.add(key);
      hostCandidates.push(host);
    };
    const hostFromQuery = String(url?.searchParams?.get('host') || '').trim();
    appendHostCandidate(hostFromQuery);
    appendHostCandidate(requestHost);
    appendHostCandidate(commonConfig?.serverIp);
    const hostsConfig = readHostsServerConfigFile(hostsServerFile);
    if (hostsConfig && typeof hostsConfig === 'object') {
      for (const [hostKey, hostRawEntry] of Object.entries(hostsConfig)) {
        const hostEntry = hostRawEntry && typeof hostRawEntry === 'object' ? hostRawEntry : {};
        const renderEnabled = hostEntry?.renderEnabled !== false;
        const eligible = hostEntry?.eligible !== false;
        if (!renderEnabled && !eligible) continue;
        appendHostCandidate(hostEntry?.ip);
        appendHostCandidate(hostEntry?.host);
        appendHostCandidate(hostKey);
      }
    }
    appendHostCandidate('127.0.0.1');
    appendHostCandidate('localhost');

    const fetchedPreset = await fetchWrcPresetPayloadFromHosts({
      hosts: hostCandidates,
      rcPort,
      presetName: requestedPresetName,
      presetNames: presetCandidates,
      timeoutMs: 3000,
    });
    if (!fetchedPreset.ok) {
      sendJSON(res, 502, {
        ok: false,
        error: fetchedPreset.error || 'wrc_preset_unreachable',
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

    let fields = buildRenderFormFieldsFromWrcPreset(fetchedPreset.payload);
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
    sendJSON(res, 200, {
      ok: true,
      project: projectResolved.project,
      usageMode: String(projectResolved.usageMode || ''),
      presetName: resolvedPresetName || String(requestedPresetName || ''),
      rcPort,
      endpoint: fetchedPreset.endpoint || null,
      fields,
      fallbackSource: fallbackSource || undefined,
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

    if (actorRole !== SYSTEM_MAINTENANCE_ROLE) {
      if (actorPerms.canSyncScenes !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_sync' });
        return true;
      }
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

