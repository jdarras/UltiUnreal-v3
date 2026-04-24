export function normalizeAssetPath(entry) {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
  if (typeof entry !== "object") return "";
  return String(entry?.assetPath || entry?.path || entry?.name || "").trim();
}

export function normalizeAssetLabel(entry) {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") {
    const raw = String(entry).trim();
    return raw.split("/").filter(Boolean).pop() || raw;
  }
  if (typeof entry !== "object") return "";
  const direct = String(entry?.name || entry?.displayName || "").trim();
  if (direct) return direct;
  const raw = normalizeAssetPath(entry);
  return raw.split("/").filter(Boolean).pop() || raw;
}

export function toProjectAliasSet(projectRef, projectOptionByRef) {
  const aliases = new Set([projectRef.toLowerCase()]);
  const option = projectOptionByRef.get(projectRef);
  if (!option) return aliases;
  const label = String(option?.label || "").trim().toLowerCase();
  const id = String(option?.id || "").trim().toLowerCase();
  const name = String(option?.name || "").trim().toLowerCase();
  if (label) aliases.add(label);
  if (id) aliases.add(id);
  if (name) aliases.add(name);
  return aliases;
}

export function resolveProjectRefFromForm(form, projectOptionByRef, projectLookupByAny) {
  const rawProject = String(form?.projectName || "").trim();
  if (!rawProject) return "";
  const direct = projectOptionByRef.get(rawProject);
  if (direct?.ref) return String(direct.ref || "").trim();
  const byAny = projectLookupByAny.get(rawProject.toLowerCase());
  if (byAny?.ref) return String(byAny.ref || "").trim();
  return rawProject;
}
