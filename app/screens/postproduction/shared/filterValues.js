function normalizeMultiFilterValues(value = []) {
  const source = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const out = [];
  for (const entry of source) {
    const normalized = String(entry || "").trim().toLowerCase();
    if (!normalized || normalized === "all" || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export {
  normalizeMultiFilterValues,
};
