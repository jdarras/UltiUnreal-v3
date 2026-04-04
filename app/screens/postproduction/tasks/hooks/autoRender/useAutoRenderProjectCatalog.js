import { useEffect, useRef, useState } from "react";
import { safeT } from "../../../shared/helpers";

export function useAutoRenderProjectCatalog({
  t,
  selectedAutoRenderProjectRef = "",
  normalizedProjectOptions = [],
  onLoadProjectUnrealCatalog = null,
} = {}) {
  const [autoRenderProjectCatalog, setAutoRenderProjectCatalog] = useState(null);
  const [autoRenderProjectCatalogLoading, setAutoRenderProjectCatalogLoading] = useState(false);
  const [autoRenderProjectCatalogError, setAutoRenderProjectCatalogError] = useState("");

  const loadProjectUnrealCatalogRef = useRef(onLoadProjectUnrealCatalog);
  const autoRenderProjectCatalogCacheRef = useRef(new Map());

  useEffect(() => {
    loadProjectUnrealCatalogRef.current = onLoadProjectUnrealCatalog;
    autoRenderProjectCatalogCacheRef.current.clear();
  }, [onLoadProjectUnrealCatalog]);

  useEffect(() => {
    autoRenderProjectCatalogCacheRef.current.clear();
  }, [normalizedProjectOptions]);

  useEffect(() => {
    const projectRef = String(selectedAutoRenderProjectRef || "").trim();
    const loader = loadProjectUnrealCatalogRef.current;
    if (!projectRef || typeof loader !== "function") {
      setAutoRenderProjectCatalog(null);
      setAutoRenderProjectCatalogLoading(false);
      setAutoRenderProjectCatalogError("");
      return;
    }
    const cacheKey = projectRef.toLowerCase();
    const cached = autoRenderProjectCatalogCacheRef.current.get(cacheKey);
    if (cached && typeof cached === "object") {
      setAutoRenderProjectCatalog(cached);
      setAutoRenderProjectCatalogLoading(false);
      setAutoRenderProjectCatalogError("");
      return;
    }
    let cancelled = false;
    setAutoRenderProjectCatalogLoading(true);
    setAutoRenderProjectCatalogError("");
    (async () => {
      try {
        const loaded = await Promise.resolve(loader(projectRef));
        if (cancelled) return;
        const safeCatalog = loaded && typeof loaded === "object" ? loaded : {};
        const normalizedCatalog = {
          levels: Array.isArray(safeCatalog.levels) ? safeCatalog.levels : [],
          sequences: Array.isArray(safeCatalog.sequences) ? safeCatalog.sequences : [],
          presets: Array.isArray(safeCatalog.presets) ? safeCatalog.presets : [],
          wrcPresets: Array.isArray(safeCatalog.wrcPresets) ? safeCatalog.wrcPresets : [],
        };
        autoRenderProjectCatalogCacheRef.current.set(cacheKey, normalizedCatalog);
        setAutoRenderProjectCatalog(normalizedCatalog);
      } catch (e) {
        if (cancelled) return;
        setAutoRenderProjectCatalog(null);
        setAutoRenderProjectCatalogError(String(
          e?.message
          || safeT(t, "postprod.tasks.form.renderMode.catalogError", "Impossible de charger les modes de rendu Unreal.")
        ));
      } finally {
        if (!cancelled) setAutoRenderProjectCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAutoRenderProjectRef, t]);

  return {
    autoRenderProjectCatalog,
    autoRenderProjectCatalogLoading,
    autoRenderProjectCatalogError,
  };
}

export default useAutoRenderProjectCatalog;
