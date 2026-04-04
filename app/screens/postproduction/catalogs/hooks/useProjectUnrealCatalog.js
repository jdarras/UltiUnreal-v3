import { useEffect, useMemo, useState } from "react";
import { safeT } from "../../shared/helpers";

function normalizeAssetPath(entry) {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
  if (typeof entry !== "object") return "";
  return String(entry?.assetPath || entry?.path || entry?.name || "").trim();
}

function normalizeAssetLabel(entry) {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") {
    const raw = String(entry).trim();
    return raw.split("/").filter(Boolean).pop() || raw;
  }
  if (typeof entry !== "object") return "";
  const direct = String(entry?.name || entry?.displayName || "").trim();
  if (direct) return direct;
  const raw = normalizeAssetPath(entry);
  return raw.split("/").filter(Boolean).pop() || raw;
}

export function useProjectUnrealCatalog({
  t,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  onLoadProjectUnrealCatalog = null,
} = {}) {
  const [projectCatalog, setProjectCatalog] = useState(null);
  const [projectCatalogLoading, setProjectCatalogLoading] = useState(false);
  const [projectCatalogError, setProjectCatalogError] = useState("");

  useEffect(() => {
    const projectRef = String(selectedProjectRef || selectedFormProjectRef || "").trim();
    if (!projectRef || typeof onLoadProjectUnrealCatalog !== "function") {
      setProjectCatalog(null);
      setProjectCatalogLoading(false);
      setProjectCatalogError("");
      return;
    }
    let cancelled = false;
    setProjectCatalogLoading(true);
    setProjectCatalogError("");
    (async () => {
      try {
        const loaded = await Promise.resolve(onLoadProjectUnrealCatalog(projectRef));
        if (cancelled) return;
        const safeCatalog = loaded && typeof loaded === "object" ? loaded : {};
        setProjectCatalog({
          levels: Array.isArray(safeCatalog.levels) ? safeCatalog.levels : [],
          sequences: Array.isArray(safeCatalog.sequences) ? safeCatalog.sequences : [],
          presets: Array.isArray(safeCatalog.presets) ? safeCatalog.presets : [],
          wrcPresets: Array.isArray(safeCatalog.wrcPresets) ? safeCatalog.wrcPresets : [],
        });
      } catch (e) {
        if (cancelled) return;
        setProjectCatalog(null);
        setProjectCatalogError(
          String(e?.message || safeT(t, "postprod.data.forms.error.catalog", "Lecture du catalogue Unreal impossible."))
        );
      } finally {
        if (!cancelled) setProjectCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectRef, selectedFormProjectRef, onLoadProjectUnrealCatalog, t]);

  const projectCatalogLevelOptions = useMemo(() => {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(projectCatalog?.levels) ? projectCatalog.levels : [];
    for (const entry of list) {
      const value = normalizeAssetPath(entry);
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value, label: normalizeAssetLabel(entry) || value });
    }
    return out.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [projectCatalog]);

  const projectCatalogSequenceOptions = useMemo(() => {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(projectCatalog?.sequences) ? projectCatalog.sequences : [];
    for (const entry of list) {
      const value = normalizeAssetPath(entry);
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value, label: normalizeAssetLabel(entry) || value });
    }
    return out.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [projectCatalog]);

  const projectCatalogWrcPresetOptions = useMemo(() => {
    const byValue = new Map();
    const list = Array.isArray(projectCatalog?.wrcPresets) ? projectCatalog.wrcPresets : [];
    for (const entry of list) {
      const name = String(entry?.name || "").trim();
      const assetPath = String(entry?.assetPath || "").trim();
      const value = assetPath || name;
      if (!value) continue;
      const dedupeKey = String(value || "").trim().toLowerCase();
      if (!byValue.has(dedupeKey)) {
        byValue.set(dedupeKey, {
          value,
          label: name && assetPath ? `${name} (${assetPath})` : (name || assetPath),
        });
      }
    }
    return Array.from(byValue.values()).sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  }, [projectCatalog]);

  return {
    projectCatalog,
    projectCatalogLoading,
    projectCatalogError,
    projectCatalogLevelOptions,
    projectCatalogSequenceOptions,
    projectCatalogWrcPresetOptions,
  };
}

export default useProjectUnrealCatalog;
