function createEmptyPermissionDraft() {
  return {
    isReferent: false,
    canValidate: false,
    canSync: false,
    canLaunchRender: false,
    canEditData: false,
  };
}

function normalizePermissionDraft(source = null) {
  if (!source || typeof source !== "object") return createEmptyPermissionDraft();
  return {
    isReferent: source.isReferent === true,
    canValidate: source.canValidate === true,
    canSync: source.canSync === true,
    canLaunchRender: source.canLaunchRender === true,
    canEditData: source.canEditData === true,
  };
}

function buildPermissionSummaryRows(projectOptions = [], projectPermissionsByRef = {}) {
  return (Array.isArray(projectOptions) ? projectOptions : []).map((project) => {
    const ref = String(project?.ref || "").trim();
    const perms = ref ? (projectPermissionsByRef?.[ref] || null) : null;
    return {
      ref,
      project,
      ...normalizePermissionDraft(perms),
    };
  });
}

function countPermissionOverrides(rows = []) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    row.isReferent || row.canValidate || row.canSync || row.canLaunchRender || row.canEditData
  ).length;
}

function filterPermissionSummaryRows(rows = [], search = "", scope = "all") {
  const needle = String(search || "").trim().toLowerCase();
  const normalizedScope = String(scope || "all").trim();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const hasOverride = row.isReferent || row.canValidate || row.canSync || row.canLaunchRender || row.canEditData;
    if (normalizedScope === "overrides" && !hasOverride) return false;
    if (normalizedScope === "without_overrides" && hasOverride) return false;
    if (!needle) return true;
    const haystack = [
      row?.project?.name,
      row?.project?.id,
      row?.project?.code,
      row?.ref,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(needle);
  });
}

export {
  buildPermissionSummaryRows,
  countPermissionOverrides,
  createEmptyPermissionDraft,
  filterPermissionSummaryRows,
  normalizePermissionDraft,
};
