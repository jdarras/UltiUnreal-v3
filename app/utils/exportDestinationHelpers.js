// Normalisation des destinations d'export (options affichées, valeurs choisies,
// identifiants enregistrés), commune à l'éditeur de tâche et au détail d'un
// rendu. Auparavant recopiée à l'identique dans plusieurs fichiers.

export function normalizeExportDestinationOptions(options = []) {
  const source = Array.isArray(options) ? options : [];
  const out = [];
  const seen = new Set();
  for (const entry of source) {
    const rawValue = entry?.value ?? entry?.id ?? "";
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(entry?.label || entry?.name || rawValue || "").trim();
    out.push({
      value,
      label: label || value,
    });
  }
  return out;
}

export function normalizeExportDestinationValues(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const out = [];
  const seen = new Set();
  for (const rawValue of source) {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function normalizeExportDestinationIds(value) {
  const src = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/[,\r\n;]+/g) : []);
  const out = [];
  const seen = new Set();
  for (const raw of src) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
