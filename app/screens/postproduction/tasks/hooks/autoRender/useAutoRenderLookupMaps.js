import { useEffect, useMemo } from "react";
import { resolveProjectRefFromForm } from "./utils";

export function useAutoRenderLookupMaps({
  normalizedProjectOptions = [],
  renderForms = [],
  availableRenderWorkers = [],
  autoRenderProjectRef = "",
  setAutoRenderProjectRef = null,
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
    const selectedProjectRaw = String(autoRenderProjectRef || "").trim();
    const selectedProjectOption = selectedProjectRaw
      ? (
        projectOptionByRef.get(selectedProjectRaw)
        || projectLookupByAny.get(selectedProjectRaw.toLowerCase())
        || null
      )
      : null;
    const selectedProjectRef = String(selectedProjectOption?.ref || selectedProjectRaw).trim();
    const list = Array.isArray(renderForms) ? renderForms : [];
    if (!selectedProjectRef) return [];
    return list.filter((entry) => {
      if (entry?.isActive === false) return false;
      const rawProject = String(entry?.projectName || "").trim();
      if (!rawProject) return false;
      let resolvedProjectRef = rawProject;
      const direct = projectOptionByRef.get(rawProject);
      if (direct) {
        resolvedProjectRef = String(direct.ref || "").trim();
      } else {
        const byAny = projectLookupByAny.get(rawProject.toLowerCase());
        if (byAny) resolvedProjectRef = String(byAny.ref || "").trim();
      }
      if (!resolvedProjectRef) return false;
      if (!allowedProjects.has(resolvedProjectRef)) return false;
      return resolvedProjectRef === selectedProjectRef;
    }).sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [
    renderForms,
    projectOptionByRef,
    projectLookupByAny,
    normalizedProjectOptions,
    autoRenderProjectRef,
  ]);

  useEffect(() => {
    if (typeof setAutoRenderProjectRef !== "function") return;
    setAutoRenderProjectRef((prev) => {
      const current = String(prev || "").trim();
      if (!current) return "";
      const direct = projectOptionByRef.get(current)
        || projectLookupByAny.get(current.toLowerCase())
        || null;
      return String(direct?.ref || "").trim();
    });
  }, [projectOptionByRef, projectLookupByAny, setAutoRenderProjectRef]);

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


  const selectedAutoRenderForm = useMemo(
    () => filteredAutoRenderForms.find((entry) => String(entry?.id || "") === String(autoRenderFormId || "")) || null,
    [filteredAutoRenderForms, autoRenderFormId]
  );

  useEffect(() => {
    if (typeof setAutoRenderProjectRef !== "function") return;
    const currentFormId = String(autoRenderFormId || "").trim();
    if (!currentFormId) return;
    const currentForm = filteredAutoRenderForms.find((entry) => String(entry?.id || "").trim() === currentFormId) || null;
    const resolvedProjectRef = resolveProjectRefFromForm(currentForm, projectOptionByRef, projectLookupByAny);
    if (!resolvedProjectRef) return;
    setAutoRenderProjectRef((prev) => {
      const current = String(prev || "").trim();
      return current === resolvedProjectRef ? current : resolvedProjectRef;
    });
  }, [
    autoRenderFormId,
    filteredAutoRenderForms,
    projectOptionByRef,
    projectLookupByAny,
    setAutoRenderProjectRef,
  ]);

  const selectedAutoRenderProjectRef = useMemo(
    () => {
      const explicitProjectRef = String(autoRenderProjectRef || "").trim();
      if (explicitProjectRef) return explicitProjectRef;
      return resolveProjectRefFromForm(selectedAutoRenderForm, projectOptionByRef, projectLookupByAny);
    },
    [autoRenderProjectRef, selectedAutoRenderForm, projectOptionByRef, projectLookupByAny]
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
