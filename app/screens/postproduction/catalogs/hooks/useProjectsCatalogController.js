import { useCallback, useMemo, useState } from "react";
import { safeT } from "../../shared/helpers";
import { usePersistedViewMode } from "../../shared/usePersistedViewMode";

export function useProjectsCatalogController({
  t,
  projects = [],
  tasks = [],
  onLoadProjectRenderTemplates = null,
  onSyncProject = null,
  onLoadProjectDataTables = null,
  onOpenLinkedTasks = null,
} = {}) {
  const PROJECTS_VIEW_STORAGE_KEY = "uu_postprod_projects_view";
  const [usageModeFilter, setUsageModeFilter] = useState("all");
  const [linkedTasksFilter, setLinkedTasksFilter] = useState("all");
  const [projectOps, setProjectOps] = useState({});
  const { viewMode, setViewMode } = usePersistedViewMode({
    storageKey: PROJECTS_VIEW_STORAGE_KEY,
    allowedModes: ["thumbs", "cards", "list"],
    fallbackMode: "cards",
  });

  const normalizedProjects = useMemo(() => {
    const linkedCountsByProjectRef = new Map();
    const taskList = Array.isArray(tasks) ? tasks : [];
    for (const task of taskList) {
      const refsRaw = Array.isArray(task?.projectRefs) ? task.projectRefs : [];
      if (refsRaw.length === 0) continue;
      const uniqueRefs = new Set(
        refsRaw
          .map((ref) => String(ref || "").trim())
          .filter(Boolean)
      );
      for (const ref of uniqueRefs) {
        linkedCountsByProjectRef.set(
          ref,
          Number(linkedCountsByProjectRef.get(ref) || 0) + 1
        );
      }
    }

    const list = Array.isArray(projects) ? projects : [];
    return list
      .map((project) => ({
        id: String(project?.id || "").trim(),
        name: String(project?.name || "").trim(),
        code: String(project?.code || "").trim(),
        usageMode: String(project?.usageMode || project?.metaUsageMode || "").trim(),
        linkedTasksCount: (() => {
          const idRef = String(project?.id || "").trim();
          const nameRef = String(project?.name || "").trim();
          let total = 0;
          if (idRef) total += Number(linkedCountsByProjectRef.get(idRef) || 0);
          if (nameRef && nameRef !== idRef) total += Number(linkedCountsByProjectRef.get(nameRef) || 0);
          return total;
        })(),
      }))
      .filter((project) => project.id || project.name)
      .sort((a, b) => String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || "")));
  }, [projects, tasks]);

  const filteredProjects = useMemo(() => {
    let list = normalizedProjects;
    if (usageModeFilter !== "all") {
      list = list.filter((project) => project.usageMode === usageModeFilter);
    }
    if (linkedTasksFilter === "with_tasks") {
      list = list.filter((project) => Number(project?.linkedTasksCount || 0) > 0);
    } else if (linkedTasksFilter === "without_tasks") {
      list = list.filter((project) => Number(project?.linkedTasksCount || 0) <= 0);
    }
    return list;
  }, [normalizedProjects, usageModeFilter, linkedTasksFilter]);

  const setProjectOpState = useCallback((projectRef, nextPartial) => {
    const ref = String(projectRef || "").trim();
    if (!ref) return;
    setProjectOps((prev) => ({
      ...(prev || {}),
      [ref]: {
        ...(prev?.[ref] || {}),
        ...(nextPartial && typeof nextPartial === "object" ? nextPartial : {}),
      },
    }));
  }, []);

  const handleProjectSync = useCallback(async (project) => {
    const ref = String(project?.id || project?.name || "").trim();
    if (!ref || !onSyncProject) return;
    setProjectOpState(ref, { syncing: true, error: "" });
    try {
      const sync = await onSyncProject(ref, {
        source: "manual",
        result: "ok",
      });
      setProjectOpState(ref, {
        syncing: false,
        error: "",
        syncedAt: String(sync?.syncedAt || new Date().toISOString()).trim(),
      });
    } catch (e) {
      const message = String(
        e?.message || safeT(t, "postprod.projects.error.sync", "Synchronisation impossible.")
      ).trim();
      setProjectOpState(ref, {
        syncing: false,
        error: message || safeT(t, "postprod.projects.error.sync", "Synchronisation impossible."),
      });
    }
  }, [onSyncProject, setProjectOpState, t]);

  const handleLoadProjectTemplates = useCallback(async (project) => {
    const ref = String(project?.id || project?.name || "").trim();
    if (!ref || !onLoadProjectRenderTemplates) return;
    setProjectOpState(ref, { loadingTemplates: true, error: "" });
    try {
      const templates = await onLoadProjectRenderTemplates(ref);
      const count = Array.isArray(templates) ? templates.length : 0;
      setProjectOpState(ref, {
        loadingTemplates: false,
        error: "",
        templatesCount: count,
      });
    } catch (e) {
      const message = String(
        e?.message || safeT(t, "postprod.projects.error.templates", "Chargement des templates impossible.")
      ).trim();
      setProjectOpState(ref, {
        loadingTemplates: false,
        error: message || safeT(t, "postprod.projects.error.templates", "Chargement des templates impossible."),
      });
    }
  }, [onLoadProjectRenderTemplates, setProjectOpState, t]);

  const handleLoadProjectTables = useCallback(async (project) => {
    const ref = String(project?.id || project?.name || "").trim();
    if (!ref || !onLoadProjectDataTables) return;
    setProjectOpState(ref, { loadingTables: true, error: "" });
    try {
      const tables = await onLoadProjectDataTables(ref);
      const count = Array.isArray(tables) ? tables.length : 0;
      setProjectOpState(ref, {
        loadingTables: false,
        error: "",
        tablesCount: count,
      });
    } catch (e) {
      const message = String(
        e?.message || safeT(t, "postprod.projects.error.tables", "Chargement des tables impossible.")
      ).trim();
      setProjectOpState(ref, {
        loadingTables: false,
        error: message || safeT(t, "postprod.projects.error.tables", "Chargement des tables impossible."),
      });
    }
  }, [onLoadProjectDataTables, setProjectOpState, t]);

  const openProjectLinkedTasks = useCallback((project) => {
    if (typeof onOpenLinkedTasks !== "function") return;
    const ref = String(project?.id || project?.name || "").trim();
    if (!ref) return;
    onOpenLinkedTasks({ type: "project", ref });
  }, [onOpenLinkedTasks]);

  return {
    usageModeFilter,
    setUsageModeFilter,
    linkedTasksFilter,
    setLinkedTasksFilter,
    viewMode,
    setViewMode,
    projectOps,
    normalizedProjects,
    filteredProjects,
    handleProjectSync,
    handleLoadProjectTemplates,
    handleLoadProjectTables,
    openProjectLinkedTasks,
  };
}
