function normalizeProjectOptions(projectOptions) {
  return Array.isArray(projectOptions) ? projectOptions : [];
}

function buildProjectLabelByAnyKey(projectOptions) {
  const map = new Map();
  const options = Array.isArray(projectOptions) ? projectOptions : [];
  for (const project of options) {
    const ref = String(project?.ref || "").trim();
    const id = String(project?.id || "").trim();
    const name = String(project?.name || "").trim();
    const label = name || id || ref;
    for (const rawKey of [ref, id, name]) {
      const key = String(rawKey || "").trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, label);
    }
  }
  return map;
}

function buildProjectLookup(selectedProjectRef) {
  const out = new Set();
  const key = String(selectedProjectRef || "").trim().toLowerCase();
  if (key) out.add(key);
  return out;
}

function filterVisibleForms(renderForms, projectLookup) {
  const list = Array.isArray(renderForms) ? renderForms : [];
  if (!(projectLookup instanceof Set) || projectLookup.size <= 0) return list;
  return list.filter((form) => {
    const key = String(form?.projectName || "").trim().toLowerCase();
    if (!key) return false;
    return projectLookup.has(key);
  });
}

function selectedFormProjectRef(visibleForms, selectedFormId) {
  const id = Number(selectedFormId || 0);
  if (!Number.isFinite(id) || id <= 0) return "";
  const list = Array.isArray(visibleForms) ? visibleForms : [];
  const match = list.find((form) => Number(form?.id || 0) === id);
  return String(match?.projectName || "").trim();
}

function formProjectLabel(form, selectedProjectRef, projectLabelByAnyKey) {
  const raw = String(form?.projectName || selectedProjectRef || "").trim();
  if (!raw) return "-";
  return String(projectLabelByAnyKey?.get?.(raw.toLowerCase()) || raw);
}

export {
  normalizeProjectOptions,
  buildProjectLabelByAnyKey,
  buildProjectLookup,
  filterVisibleForms,
  selectedFormProjectRef,
  formProjectLabel,
};
