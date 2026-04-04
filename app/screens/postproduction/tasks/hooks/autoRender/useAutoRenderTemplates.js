import { useEffect, useMemo } from "react";
import { normalizeAssetLabel, normalizeAssetPath, toProjectAliasSet } from "./utils";

export function useAutoRenderTemplates({
  selectedAutoRenderProjectRef = "",
  projectOptionByRef = new Map(),
  autoRenderProjectCatalog = null,
  normalizedRenderTemplateOptions = [],
  autoRenderTemplateId = "",
  setAutoRenderTemplateId = null,
  selectedAutoRenderForm = null,
} = {}) {
  const renderTemplatesForSelectedAutoForm = useMemo(() => {
    const projectRef = String(selectedAutoRenderProjectRef || "").trim();
    if (!projectRef) return [];
    const projectLower = projectRef.toLowerCase();
    const projectAliases = toProjectAliasSet(projectRef, projectOptionByRef);

    const dbTemplates = normalizedRenderTemplateOptions.filter((entry) => {
      const projectName = String(entry?.projectName || "").trim().toLowerCase();
      if (!projectName) return false;
      return projectAliases.has(projectName);
    });
    if (dbTemplates.length > 0) return dbTemplates;

    const catalogPresets = Array.isArray(autoRenderProjectCatalog?.presets) ? autoRenderProjectCatalog.presets : [];
    const seen = new Set();
    const out = [];
    for (const preset of catalogPresets) {
      const assetPath = normalizeAssetPath(preset);
      const label = normalizeAssetLabel(preset);
      const templateName = String(label || "").trim();
      if (!templateName) continue;
      const dedupeKey = String(assetPath || templateName).trim().toLowerCase();
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push({
        id: 0,
        key: `catalog:${projectLower}:${dedupeKey}`,
        source: "catalog",
        projectName: projectRef,
        templateName,
        outputProfile: assetPath,
        presetName: templateName,
        mapName: "",
        sequenceName: "",
        label: templateName,
      });
    }
    out.sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || "")));
    return out;
  }, [
    selectedAutoRenderProjectRef,
    normalizedRenderTemplateOptions,
    projectOptionByRef,
    autoRenderProjectCatalog,
  ]);

  const selectedAutoRenderTemplate = useMemo(() => {
    const selectedKey = String(autoRenderTemplateId || "").trim();
    if (!selectedKey) return null;
    const byKey = renderTemplatesForSelectedAutoForm.find((entry) => String(entry?.key || "").trim() === selectedKey) || null;
    if (byKey) return byKey;
    const selectedId = Number(selectedKey);
    if (Number.isFinite(selectedId) && selectedId > 0) {
      return renderTemplatesForSelectedAutoForm.find((entry) => Number(entry?.id || 0) === Math.trunc(selectedId)) || null;
    }
    return null;
  }, [renderTemplatesForSelectedAutoForm, autoRenderTemplateId]);

  useEffect(() => {
    const options = Array.isArray(renderTemplatesForSelectedAutoForm) ? renderTemplatesForSelectedAutoForm : [];
    if (options.length <= 0) {
      if (String(autoRenderTemplateId || "").trim() && typeof setAutoRenderTemplateId === "function") {
        setAutoRenderTemplateId("");
      }
      return;
    }
    const currentKey = String(autoRenderTemplateId || "").trim();
    if (currentKey) {
      const exists = options.some((entry) => String(entry?.key || "").trim() === currentKey);
      if (exists) return;
      const currentId = Number(currentKey);
      if (Number.isFinite(currentId) && currentId > 0) {
        const existsById = options.some((entry) => Number(entry?.id || 0) === Math.trunc(currentId));
        if (existsById) return;
      }
    }
    const formTemplateName = String(selectedAutoRenderForm?.templateName || "").trim().toLowerCase();
    const formOutputProfile = String(selectedAutoRenderForm?.outputProfile || "").trim().toLowerCase();
    let preferred = null;
    if (formTemplateName) {
      preferred = options.find((entry) => String(entry?.templateName || "").trim().toLowerCase() === formTemplateName) || null;
    }
    if (!preferred && formOutputProfile) {
      preferred = options.find((entry) => String(entry?.outputProfile || "").trim().toLowerCase() === formOutputProfile) || null;
    }
    const fallback = preferred || options[0] || null;
    if (typeof setAutoRenderTemplateId === "function") {
      setAutoRenderTemplateId(String(fallback?.key || ""));
    }
  }, [renderTemplatesForSelectedAutoForm, autoRenderTemplateId, selectedAutoRenderForm, setAutoRenderTemplateId]);

  return {
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
  };
}

export default useAutoRenderTemplates;
