import { useEffect, useMemo } from "react";
import { buildProjectFilterOptions } from "./renderListUtils";

export function useRenderProjectFilterOptions({
  detectedRenders = [],
  projectFilter = "all",
  setProjectFilter = null,
} = {}) {
  const projectFilterOptions = useMemo(
    () => buildProjectFilterOptions(detectedRenders),
    [detectedRenders]
  );

  useEffect(() => {
    const current = String(projectFilter || "").trim().toLowerCase();
    if (!current || current === "all") return;
    const exists = projectFilterOptions.some((entry) => String(entry?.key || "").trim().toLowerCase() === current);
    if (!exists && typeof setProjectFilter === "function") {
      setProjectFilter("all");
    }
  }, [projectFilter, projectFilterOptions, setProjectFilter]);

  return { projectFilterOptions };
}

export default useRenderProjectFilterOptions;

