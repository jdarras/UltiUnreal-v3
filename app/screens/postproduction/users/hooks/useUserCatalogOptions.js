import { useMemo } from "react";

function useUserCatalogOptions({
  roles = [],
  manageableRoles = [],
  projects = [],
}) {
  const rolesByKey = useMemo(() => {
    const map = new Map();
    for (const row of Array.isArray(roles) ? roles : []) {
      const key = String(row?.key || "").trim();
      if (!key) continue;
      map.set(key, row);
    }
    return map;
  }, [roles]);

  const roleOptions = useMemo(() => {
    const allowed = new Set(
      (Array.isArray(manageableRoles) ? manageableRoles : [])
        .map((r) => String(r || "").trim())
        .filter(Boolean)
    );
    if (allowed.size === 0) return [];
    if (rolesByKey.size === 0) {
      return Array.from(allowed);
    }
    return Array.from(rolesByKey.keys()).filter((roleKey) => allowed.has(roleKey));
  }, [manageableRoles, rolesByKey]);

  const manageableSet = useMemo(() => new Set(roleOptions), [roleOptions]);

  const projectOptions = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .map((project) => ({
        ref: String(project?.id || project?.name || "").trim(),
        id: String(project?.id || "").trim(),
        name: String(project?.name || "").trim(),
        code: String(project?.code || "").trim(),
        usageMode: String(project?.usageMode || project?.metaUsageMode || "").trim(),
      }))
      .filter((project) => project.ref && project.usageMode === "auto_render")
      .sort((a, b) => String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || "")));
  }, [projects]);

  return {
    rolesByKey,
    roleOptions,
    manageableSet,
    projectOptions,
  };
}

export { useUserCatalogOptions };
