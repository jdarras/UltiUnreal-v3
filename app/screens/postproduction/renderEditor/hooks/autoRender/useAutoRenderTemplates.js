import { useEffect, useMemo } from "react";
import { normalizeAssetLabel, normalizeAssetPath, toProjectAliasSet } from "./utils";

function normalizeTemplateLookupToken(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\\/g, "/").toLowerCase();
}

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

    let result;
    if (dbTemplates.length > 0) {
      result = dbTemplates;
    } else {
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
      result = out;
    }

    const allowedPresets = Array.isArray(selectedAutoRenderForm?.allowedPresets)
      ? selectedAutoRenderForm.allowedPresets
      : [];
    if (allowedPresets.length > 0) {
      const allowedSet = new Set(allowedPresets.map((v) => String(v).toLowerCase()));
      result = result.filter((entry) => {
        const pn = String(entry?.presetName || "").toLowerCase();
        const op = String(entry?.outputProfile || "").toLowerCase();
        return allowedSet.has(pn) || allowedSet.has(op);
      });
    }

    return result;
  }, [
    selectedAutoRenderProjectRef,
    normalizedRenderTemplateOptions,
    projectOptionByRef,
    autoRenderProjectCatalog,
    selectedAutoRenderForm,
  ]);

  const selectedAutoRenderTemplate = useMemo(() => {
    const selectedKey = String(autoRenderTemplateId || "").trim();
    if (!selectedKey) return null;
    const selectedToken = normalizeTemplateLookupToken(selectedKey);
    const byKey = renderTemplatesForSelectedAutoForm.find((entry) => String(entry?.key || "").trim() === selectedKey) || null;
    if (byKey) return byKey;
    const selectedId = Number(selectedKey);
    if (Number.isFinite(selectedId) && selectedId > 0) {
      return renderTemplatesForSelectedAutoForm.find((entry) => Number(entry?.id || 0) === Math.trunc(selectedId)) || null;
    }
    if (!selectedToken) return null;
    return renderTemplatesForSelectedAutoForm.find((entry) => {
      const candidateTokens = [
        entry?.key,
        entry?.templateName,
        entry?.outputProfile,
        entry?.presetName,
        entry?.label,
      ].map((value) => normalizeTemplateLookupToken(value)).filter(Boolean);
      return candidateTokens.includes(selectedToken);
    }) || null;
  }, [renderTemplatesForSelectedAutoForm, autoRenderTemplateId]);

  useEffect(() => {
    const currentKey = String(autoRenderTemplateId || "").trim();
    const resolvedKey = String(selectedAutoRenderTemplate?.key || "").trim();
    if (!currentKey || !resolvedKey || currentKey === resolvedKey) return;
    if (typeof setAutoRenderTemplateId === "function") {
      setAutoRenderTemplateId(resolvedKey);
    }
  }, [autoRenderTemplateId, selectedAutoRenderTemplate, setAutoRenderTemplateId]);

  useEffect(() => {
    const options = Array.isArray(renderTemplatesForSelectedAutoForm) ? renderTemplatesForSelectedAutoForm : [];
    if (options.length <= 0) return;
    const currentKey = String(autoRenderTemplateId || "").trim();
    if (!currentKey) return;
    const exists = options.some((entry) => String(entry?.key || "").trim() === currentKey);
    if (exists) return;
    const currentId = Number(currentKey);
    if (Number.isFinite(currentId) && currentId > 0) {
      const existsById = options.some((entry) => Number(entry?.id || 0) === Math.trunc(currentId));
      if (existsById) return;
    }
    const currentToken = normalizeTemplateLookupToken(currentKey);
    if (currentToken) {
      const existsByToken = options.some((entry) => {
        const candidateTokens = [
          entry?.key,
          entry?.templateName,
          entry?.outputProfile,
          entry?.presetName,
          entry?.label,
        ].map((value) => normalizeTemplateLookupToken(value)).filter(Boolean);
        return candidateTokens.includes(currentToken);
      });
      if (existsByToken) return;
    }
    if (typeof setAutoRenderTemplateId === "function") {
      setAutoRenderTemplateId("");
    }
  }, [renderTemplatesForSelectedAutoForm, autoRenderTemplateId, setAutoRenderTemplateId]);

  return {
    renderTemplatesForSelectedAutoForm,
    selectedAutoRenderTemplate,
  };
}
