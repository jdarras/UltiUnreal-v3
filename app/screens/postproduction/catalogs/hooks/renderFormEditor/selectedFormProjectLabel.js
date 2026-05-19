export function resolveSelectedFormProjectDisplayLabel({
  selectedForm = null,
  selectedProjectRef = "",
  projectLabelByAnyKey = new Map(),
} = {}) {
  const raw = String(selectedForm?.projectName || selectedProjectRef || "").trim();
  if (!raw) return "";
  const direct = projectLabelByAnyKey.get(raw.toLowerCase());
  return String(direct || raw);
}
