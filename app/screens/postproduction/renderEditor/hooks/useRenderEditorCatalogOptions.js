import { useEffect, useMemo } from "react";
import {
  hasResourceFilterOption,
  normalizeProjectOptions,
  normalizeRenderTemplateOptions,
  normalizeRenderWorkers,
  normalizeResourceOptions,
  sanitizeSelectedResourceRefs,
} from "./catalog/renderEditorCatalogOptionsHelpers";

function useRenderEditorCatalogOptions({
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
    return normalizeRenderWorkers(renderWorkers);
  }, [renderWorkers]);

  // Toutes les stations capables (non-excluded) — inclut offline et busy
  // La vue "now" filtre sur availableNow ; la vue "scheduled" utilise la liste complète
  const availableRenderWorkers = useMemo(
    () => normalizedRenderWorkers.filter((entry) => entry.isCapable),
    [normalizedRenderWorkers]
  );

  const normalizedProjectOptions = useMemo(() => {
    return normalizeProjectOptions(projectOptions);
  }, [projectOptions]);

  const normalizedRenderTemplateOptions = useMemo(() => {
    return normalizeRenderTemplateOptions(renderTemplates);
  }, [renderTemplates]);

  const normalizedResourceOptions = useMemo(() => {
    return normalizeResourceOptions(resourceOptions);
  }, [resourceOptions]);

  useEffect(() => {
    const allowed = new Set(normalizedResourceOptions.map((entry) => entry.ref));
    if (typeof setSelectedResourceRefs === "function") {
      setSelectedResourceRefs((prev) => sanitizeSelectedResourceRefs(prev, selectedResourceRefs, allowed));
    }
  }, [normalizedResourceOptions, setSelectedResourceRefs, selectedResourceRefs]);

  useEffect(() => {
    if (String(listResourceFilter || "").trim() === "all") return;
    const exists = hasResourceFilterOption(normalizedResourceOptions, listResourceFilter);
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

export { useRenderEditorCatalogOptions };
