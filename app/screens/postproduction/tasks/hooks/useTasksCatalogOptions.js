import { useEffect, useMemo } from "react";

function useTasksCatalogOptions({
  renderWorkers = [],
  projectOptions = [],
  renderTemplates = [],
  resourceOptions = [],
  selectedResourceRefs = [],
  setSelectedResourceRefs = null,
  listResourceFilter = "all",
  setListResourceFilter = null,
}) {
  const normalizedRenderWorkers = useMemo(() => {
    const list = Array.isArray(renderWorkers) ? renderWorkers : [];
    const byKey = new Map();
    for (const entry of list) {
      const workerKey = String(entry?.workerKey || entry?.worker_key || "").trim();
      if (!workerKey) continue;
      const dedupeKey = workerKey.toLowerCase();
      const displayName = String(
        entry?.displayName ||
          entry?.display_name ||
          entry?.workerKey ||
          entry?.worker_key ||
          ""
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
    return [...byKey.values()].sort((a, b) =>
      String(a.displayName || "").localeCompare(String(b.displayName || ""))
    );
  }, [renderWorkers]);

  const availableRenderWorkers = useMemo(
    () => normalizedRenderWorkers.filter((entry) => entry.isOnline && entry.canRender),
    [normalizedRenderWorkers]
  );

  const normalizedProjectOptions = useMemo(() => {
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
      .filter((entry) => entry.ref && entry.usageMode === "auto_render")
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [projectOptions]);

  const normalizedRenderTemplateOptions = useMemo(() => {
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
          presetName ||
          templateName ||
          outputProfile ||
          (id > 0 ? `Template #${id}` : "")
        ).trim();
        const key =
          id > 0
            ? `id:${id}`
            : `db:${projectName.toLowerCase()}:${(
                templateName ||
                outputProfile ||
                presetName ||
                label ||
                "template"
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
      .filter(
        (entry) =>
          entry.id > 0 &&
          entry.projectName &&
          (entry.templateName || entry.outputProfile || entry.label)
      )
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [renderTemplates]);

  const normalizedResourceOptions = useMemo(() => {
    const list = Array.isArray(resourceOptions) ? resourceOptions : [];
    return list
      .map((entry) => ({
        ref: String(entry?.ref || "").trim(),
        label: String(entry?.label || entry?.ref || "").trim(),
      }))
      .filter((entry) => entry.ref)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [resourceOptions]);

  useEffect(() => {
    const allowed = new Set(normalizedResourceOptions.map((entry) => entry.ref));
    if (typeof setSelectedResourceRefs === "function") {
      setSelectedResourceRefs((prev) => (Array.isArray(prev) ? prev : selectedResourceRefs).filter((ref) => allowed.has(ref)));
    }
  }, [normalizedResourceOptions, setSelectedResourceRefs, selectedResourceRefs]);

  useEffect(() => {
    if (String(listResourceFilter || "").trim() === "all") return;
    const exists = normalizedResourceOptions.some(
      (entry) => String(entry?.ref || "").trim() === String(listResourceFilter || "").trim()
    );
    if (!exists && typeof setListResourceFilter === "function") {
      setListResourceFilter("all");
    }
  }, [listResourceFilter, normalizedResourceOptions, setListResourceFilter]);

  return {
    normalizedRenderWorkers,
    availableRenderWorkers,
    normalizedProjectOptions,
    normalizedRenderTemplateOptions,
    normalizedResourceOptions,
  };
}

export { useTasksCatalogOptions };
