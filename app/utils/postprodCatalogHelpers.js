function normalizeTaskCatalogOptions(entries = []) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    const ref = String(entry?.ref || "").trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    const id = String(entry?.id || "").trim();
    const name = String(entry?.name || "").trim();
    const usageMode = String(entry?.usageMode || "").trim();
    const uprojectPath = String(entry?.uprojectPath || "").trim();
    const metaStatus = String(entry?.metaStatus || "").trim();
    out.push({
      ref,
      label: String(entry?.label || ref).trim() || ref,
      id,
      name,
      usageMode,
      uprojectPath,
      metaStatus,
    });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

function mapTaskProjectOptions(payload = {}) {
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  return normalizeTaskCatalogOptions(
    projects.map((project) => {
      const id = String(project?.id || "").trim();
      const name = String(project?.name || "").trim();
      const usageMode = String(project?.metaUsageMode || project?.usageMode || "").trim();
      const uprojectPath = String(project?.uprojectPath || project?.uproject || '').trim();
      const metaStatus = String(project?.metaStatus || project?.status || "").trim();
      return {
        ref: id || name,
        label: name || id,
        id: id || '',
        name: name || '',
        uprojectPath,
        usageMode: usageMode || '',
        metaStatus: metaStatus || '',
      };
    })
  );
}

function mapTaskResourceOptions(payload = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return normalizeTaskCatalogOptions(
    items.map((item) => {
      const uid = String(item?.uid || item?.listingUid || "").trim();
      const title = String(item?.title || item?.name || item?.displayName || "").trim();
      return {
        ref: uid || title,
        label: title && uid ? `${title} [${uid}]` : (title || uid),
      };
    })
  );
}

function mapRenderExportDestinationOptions(commonCfg = {}, unnamedLabel = "") {
  const entries = Array.isArray(commonCfg?.renderExportDestinations)
    ? commonCfg.renderExportDestinations
    : (
      Array.isArray(commonCfg?.render_export_destinations)
        ? commonCfg.render_export_destinations
        : []
    );
  const out = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.isActive === false) continue;
    const id = String(entry?.id || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const rawLabel = String(entry?.name || entry?.label || "").trim();
    const looksTechnicalId = /^dest-\d+$/i.test(rawLabel || id);
    const fallbackLabel = String(unnamedLabel || "").trim();
    const label = rawLabel && !looksTechnicalId
      ? rawLabel
      : (fallbackLabel || id);
    out.push({ value: id, label });
  }
  out.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  return out;
}

export {
  normalizeTaskCatalogOptions,
  mapTaskProjectOptions,
  mapTaskResourceOptions,
  mapRenderExportDestinationOptions,
};
