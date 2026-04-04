import { useEffect, useMemo } from "react";
import { resolveProjectRefFromForm } from "./utils";

export function useAutoRenderLookupMaps({
  normalizedProjectOptions = [],
  renderForms = [],
  availableRenderWorkers = [],
  setAutoRenderWorkerKey = null,
  autoRenderFormId = "",
  setAutoRenderFormId = null,
} = {}) {
  const projectOptionByRef = useMemo(() => {
    const map = new Map();
    for (const option of normalizedProjectOptions) {
      map.set(option.ref, option);
    }
    return map;
  }, [normalizedProjectOptions]);

  const projectLookupByAny = useMemo(() => {
    const map = new Map();
    const push = (key, option) => {
      const normalized = String(key || "").trim().toLowerCase();
      if (!normalized) return;
      if (!map.has(normalized)) map.set(normalized, option);
    };
    for (const option of normalizedProjectOptions) {
      push(option.ref, option);
      push(option.id, option);
      push(option.name, option);
      push(option.label, option);
    }
    return map;
  }, [normalizedProjectOptions]);

  const filteredAutoRenderForms = useMemo(() => {
    const allowedProjects = new Set(
      normalizedProjectOptions
        .map((entry) => String(entry?.ref || "").trim())
        .filter(Boolean)
    );
    const list = Array.isArray(renderForms) ? renderForms : [];
    return list.filter((entry) => {
      if (entry?.isActive === false) return false;
      const rawProject = String(entry?.projectName || "").trim();
      if (!rawProject) return false;
      const direct = projectOptionByRef.get(rawProject);
      if (direct) return allowedProjects.has(String(direct.ref || "").trim());
      const byAny = projectLookupByAny.get(rawProject.toLowerCase());
      if (byAny) return allowedProjects.has(String(byAny.ref || "").trim());
      return allowedProjects.has(rawProject);
    }).sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [renderForms, projectOptionByRef, projectLookupByAny, normalizedProjectOptions]);

  useEffect(() => {
    const allowedWorkers = new Set(availableRenderWorkers.map((entry) => String(entry?.workerKey || "").trim()));
    if (typeof setAutoRenderWorkerKey === "function") {
      setAutoRenderWorkerKey((prev) => (allowedWorkers.has(String(prev || "").trim()) ? String(prev || "").trim() : ""));
    }
  }, [availableRenderWorkers, setAutoRenderWorkerKey]);

  useEffect(() => {
    const allowed = new Set(
      filteredAutoRenderForms
        .map((entry) => String(entry?.id || "").trim())
        .filter(Boolean)
    );
    if (typeof setAutoRenderFormId === "function") {
      setAutoRenderFormId((prev) => (allowed.has(String(prev || "").trim()) ? String(prev || "").trim() : ""));
    }
  }, [filteredAutoRenderForms, setAutoRenderFormId]);

  useEffect(() => {
    const current = String(autoRenderFormId || "").trim();
    if (current) return;
    const firstForm = filteredAutoRenderForms[0];
    const nextFormId = String(firstForm?.id || "").trim();
    if (!nextFormId) return;
    if (typeof setAutoRenderFormId === "function") {
      setAutoRenderFormId(nextFormId);
    }
  }, [autoRenderFormId, filteredAutoRenderForms, setAutoRenderFormId]);

  const selectedAutoRenderForm = useMemo(
    () => filteredAutoRenderForms.find((entry) => String(entry?.id || "") === String(autoRenderFormId || "")) || null,
    [filteredAutoRenderForms, autoRenderFormId]
  );

  const selectedAutoRenderProjectRef = useMemo(
    () => resolveProjectRefFromForm(selectedAutoRenderForm, projectOptionByRef, projectLookupByAny),
    [selectedAutoRenderForm, projectOptionByRef, projectLookupByAny]
  );

  return {
    projectOptionByRef,
    projectLookupByAny,
    filteredAutoRenderForms,
    selectedAutoRenderForm,
    selectedAutoRenderProjectRef,
  };
}

export default useAutoRenderLookupMaps;
