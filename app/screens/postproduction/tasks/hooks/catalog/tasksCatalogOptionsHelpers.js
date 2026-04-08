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

    const normalized = {
      workerKey,
      displayName: displayName || workerKey,
      isOnline: entry?.isOnline !== false,
      canRender: entry?.canRender !== false,
    };

    if (!byKey.has(dedupeKey)) {
      byKey.set(dedupeKey, normalized);
      continue;
    }

    const prev = byKey.get(dedupeKey);
    byKey.set(dedupeKey, {
      workerKey: String(prev?.workerKey || normalized.workerKey).trim() || normalized.workerKey,
      displayName: String(prev?.displayName || "").trim() || normalized.displayName,
      isOnline: !!(prev?.isOnline || normalized.isOnline),
      canRender: !!(prev?.canRender || normalized.canRender),
    });
  }

  return [...byKey.values()].sort((a, b) => (
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
