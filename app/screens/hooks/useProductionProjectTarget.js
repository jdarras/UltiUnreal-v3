import { useCallback, useMemo } from "react";

function useProductionProjectTarget({
  projectsList = [],
  activeId = "",
  activeName = "",
  common = null,
  hosts = [],
  localIp = "",
  getOnlineMap = async () => ({}),
} = {}) {
  const activeProjectWrcName = useMemo(() => {
    const projectId = String(activeId || "").trim();
    const projectName = String(activeName || "").trim();
    const list = Array.isArray(projectsList) ? projectsList : [];
    const byId = projectId
      ? list.find((project) => String(project?.id || "").trim() === projectId)
      : null;
    const byName =
      !byId && projectName
        ? list.find(
            (project) =>
              String(project?.name || "").trim().toLowerCase() ===
              projectName.toLowerCase()
          )
        : null;
    const project = byId || byName;
    const wrcNames = Array.isArray(project?.wrcNames)
      ? project.wrcNames
      : project?.wrcName
      ? [project.wrcName]
      : [];
    return String(wrcNames[0] || "").trim();
  }, [projectsList, activeId, activeName]);

  const effectivePresetName = useMemo(() => {
    return String(activeProjectWrcName || "").trim() || "RemoteControlPreset";
  }, [activeProjectWrcName]);

  const commonForProject = useMemo(() => {
    if (common && typeof common === "object") {
      return {
        ...common,
        webRemoteControlName: effectivePresetName,
      };
    }
    return { webRemoteControlName: effectivePresetName };
  }, [common, effectivePresetName]);

  const target = useMemo(() => {
    const resolvedLocalIp = String(localIp || "").trim();
    const localHost =
      (hosts || []).find((host) => resolvedLocalIp && host?.ip === resolvedLocalIp) ||
      (hosts || []).find((host) => host?.ip && host.ip === resolvedLocalIp);

    const ip = localHost?.ip || resolvedLocalIp || hosts[0]?.ip || "127.0.0.1";
    const port = Number(common?.rcHttpPort || 30010);
    const preset = effectivePresetName;
    return { ip, port, preset };
  }, [hosts, common, localIp, effectivePresetName]);

  const isTargetUnrealRunning = useCallback(async () => {
    try {
      const map = await getOnlineMap();
      const targetIp = String(target?.ip || "").trim();
      const resolvedLocalIp = String(localIp || "").trim();
      const candidates = [targetIp, resolvedLocalIp, "127.0.0.1"]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      for (const ip of candidates) {
        const entry = map && typeof map === "object" ? map[ip] : null;
        if (entry && typeof entry.unrealRunning === "boolean") {
          return entry.unrealRunning;
        }
      }
    } catch {
      // ignore and fallback below
    }
    return false;
  }, [getOnlineMap, localIp, target?.ip]);

  return {
    effectivePresetName,
    commonForProject,
    target,
    isTargetUnrealRunning,
  };
}

export { useProductionProjectTarget };
