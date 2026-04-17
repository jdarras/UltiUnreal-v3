const RENDER_AVAILABILITY_VALID = ['capable', 'busy', 'excluded'];

function resolveWorkerRenderAvailability(entry) {
  if (RENDER_AVAILABILITY_VALID.includes(entry?.renderAvailability)) return entry.renderAvailability;
  if (entry?.canRender === false) return 'excluded';
  return 'capable';
}

function normalizeRenderWorkers(renderWorkers = []) {
  const list = Array.isArray(renderWorkers) ? renderWorkers : [];
  const byKey = new Map();

  for (const entry of list) {
    const workerKey = String(entry?.workerKey || entry?.worker_key || "").trim();
    if (!workerKey) continue;

    const dedupeKey = workerKey.toLowerCase();
    const displayName = String(
      entry?.displayName
      || entry?.display_name
      || entry?.workerKey
      || entry?.worker_key
      || ""
    ).trim();

    const renderAvailability = resolveWorkerRenderAvailability(entry);
    const isOnline = entry?.isOnline !== false;
    const normalized = {
      workerKey,
      displayName: displayName || workerKey,
      isOnline,
      canRender: renderAvailability !== 'excluded', // backward compat alias
      renderAvailability,
      isCapable: renderAvailability !== 'excluded',
      availableNow: isOnline && renderAvailability !== 'excluded',
    };

    if (!byKey.has(dedupeKey)) {
      byKey.set(dedupeKey, normalized);
      continue;
    }

    const prev = byKey.get(dedupeKey);
    const mergedIsOnline = !!(prev?.isOnline || normalized.isOnline);
    const mergedAvail = (() => {
      // Prefer 'busy' or 'capable' over 'excluded' when merging duplicates
      if (prev?.renderAvailability !== 'excluded') return prev.renderAvailability;
      return normalized.renderAvailability;
    })();
    byKey.set(dedupeKey, {
      workerKey: String(prev?.workerKey || normalized.workerKey).trim() || normalized.workerKey,
      displayName: String(prev?.displayName || "").trim() || normalized.displayName,
      isOnline: mergedIsOnline,
      canRender: mergedAvail !== 'excluded',
      renderAvailability: mergedAvail,
      isCapable: mergedAvail !== 'excluded',
      availableNow: mergedIsOnline && mergedAvail !== 'excluded',
    });
  }

  // Second pass: dedup by displayName — same physical machine registered with different keys
  const score = (e) => {
    if (e.isOnline && e.renderAvailability === 'capable') return 3;
    if (e.isOnline && e.renderAvailability === 'busy') return 2;
    if (e.isOnline) return 1;
    return 0;
  };
  const byName = new Map();
  for (const entry of byKey.values()) {
    const nameKey = String(entry.displayName || "").toLowerCase();
    if (!byName.has(nameKey)) {
      byName.set(nameKey, entry);
      continue;
    }
    const prev = byName.get(nameKey);
    const winner = score(entry) > score(prev) ? entry : prev;
    const mergedIsOnline = !!(prev.isOnline || entry.isOnline);
    byName.set(nameKey, {
      ...winner,
      isOnline: mergedIsOnline,
      availableNow: mergedIsOnline && winner.renderAvailability !== 'excluded',
    });
  }

  return [...byName.values()].sort((a, b) => (
    String(a.displayName || "").localeCompare(String(b.displayName || ""))
  ));
}

function normalizeProjectOptions(projectOptions = []) {
  const list = Array.isArray(projectOptions) ? projectOptions : [];
  return list
    .map((entry) => ({
      ref: String(entry?.ref || "").trim(),
      label: String(entry?.label || entry?.ref || "").trim(),
      id: String(entry?.id || "").trim(),
      name: String(entry?.name || "").trim(),
      usageMode: String(entry?.usageMode || "").trim(),
      uprojectPath: String(entry?.uprojectPath || entry?.uproject || "").trim(),
    }))
    .filter((entry) => entry.ref && (entry.usageMode === "auto_render" || entry.usageMode === "live_auto_render"))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeRenderTemplateOptions(renderTemplates = []) {
  const list = Array.isArray(renderTemplates) ? renderTemplates : [];
  return list
    .map((entry) => {
      const idRaw = Number(entry?.id || 0);
      const id = Number.isFinite(idRaw) && idRaw > 0 ? Math.trunc(idRaw) : 0;
      const projectName = String(entry?.projectName || "").trim();
      const templateName = String(entry?.templateName || "").trim();
      const outputProfile = String(entry?.outputProfile || "").trim();
      const presetName = String(entry?.name || "").trim();
      const mapName = String(entry?.mapName || "").trim();
      const sequenceName = String(entry?.sequenceName || "").trim();
      const label = (
        presetName
        || templateName
        || outputProfile
        || (id > 0 ? `Template #${id}` : "")
      ).trim();
      const key = id > 0
        ? `id:${id}`
        : `db:${projectName.toLowerCase()}:${(
          templateName
          || outputProfile
          || presetName
          || label
          || "template"
        ).toLowerCase()}`;

      return {
        id,
        key,
        source: "db",
        projectName,
        templateName,
        outputProfile,
        presetName,
        mapName,
        sequenceName,
        label,
      };
    })
    .filter((entry) => (
      entry.id > 0
      && entry.projectName
      && (entry.templateName || entry.outputProfile || entry.label)
    ))
    .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
}

function normalizeResourceOptions(resourceOptions = []) {
  const list = Array.isArray(resourceOptions) ? resourceOptions : [];
  return list
    .map((entry) => ({
      ref: String(entry?.ref || "").trim(),
      label: String(entry?.label || entry?.ref || "").trim(),
    }))
    .filter((entry) => entry.ref)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function sanitizeSelectedResourceRefs(previousRefs, selectedResourceRefs, allowedRefs = new Set()) {
  const source = Array.isArray(previousRefs) ? previousRefs : selectedResourceRefs;
  if (!Array.isArray(source)) return [];
  return source.filter((ref) => allowedRefs.has(ref));
}

function hasResourceFilterOption(normalizedResourceOptions = [], listResourceFilter = "all") {
  const target = String(listResourceFilter || "").trim();
  return normalizedResourceOptions.some((entry) => String(entry?.ref || "").trim() === target);
}

export {
  normalizeRenderWorkers,
  normalizeProjectOptions,
  normalizeRenderTemplateOptions,
  normalizeResourceOptions,
  sanitizeSelectedResourceRefs,
  hasResourceFilterOption,
};

export default normalizeRenderWorkers;
