function reindexSortOrder(source) {
  const list = Array.isArray(source) ? source : [];
  return list.map((entry, idx) => ({ ...(entry && typeof entry === "object" ? entry : {}), sortOrder: idx + 1 }));
}

function normalizeFieldDefaultByInputKind(inputKind, value, normalizeVectorDefaultForInput) {
  const kind = String(inputKind || "text").trim().toLowerCase();
  if (kind === "checkbox") return value === true;
  if (kind === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  }
  if (kind === "integer") {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : "";
  }
  if (kind === "vector2") return normalizeVectorDefaultForInput(value, 2);
  if (kind === "vector3") return normalizeVectorDefaultForInput(value, 3);
  if (kind === "color") {
    const colorRaw = String(value || "").trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorRaw) ? colorRaw : "#ffffff";
  }
  if (kind === "json") {
    if (value == null || value === "") return {};
    return value;
  }
  return value == null ? "" : String(value);
}

function updateFieldList({
  source,
  fieldKey,
  patchOrUpdater,
  inferFieldValueTypeFromInputKind,
  normalizeVectorDefaultForInput,
}) {
  const list = Array.isArray(source) ? source : [];
  return list.map((entry) => {
    const currentKey = String(entry?.fieldKey || "").trim();
    if (currentKey !== fieldKey) return entry;
    const patch =
      typeof patchOrUpdater === "function"
        ? patchOrUpdater(entry) || {}
        : patchOrUpdater || {};
    const next = { ...(entry || {}), ...(patch || {}) };
    if (Object.prototype.hasOwnProperty.call(patch || {}, "inputKind")) {
      const nextInputKind = String(next?.inputKind || "text").trim().toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(patch || {}, "valueType")) {
        next.valueType = inferFieldValueTypeFromInputKind(nextInputKind);
      }
      if (!Object.prototype.hasOwnProperty.call(patch || {}, "defaultValue")) {
        next.defaultValue = normalizeFieldDefaultByInputKind(
          nextInputKind,
          next.defaultValue,
          normalizeVectorDefaultForInput
        );
      }
    }
    return next;
  });
}

function moveFieldList({ source, fieldKey, direction = 1 }) {
  const list = Array.isArray(source) ? [...source] : [];
  if (list.length <= 1) return list;
  list.sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
  const index = list.findIndex((entry) => String(entry?.fieldKey || "").trim() === fieldKey);
  if (index < 0) return list;
  const target = index + (direction > 0 ? 1 : -1);
  if (target < 0 || target >= list.length) return list;
  const current = list[index];
  list[index] = list[target];
  list[target] = current;
  return reindexSortOrder(list);
}

function removeFieldFromList({ source, fieldKey }) {
  const list = Array.isArray(source) ? source : [];
  const filtered = list.filter((entry) => String(entry?.fieldKey || "").trim() !== fieldKey);
  return reindexSortOrder(filtered);
}

function normalizeFieldsForPersist(fieldsRaw) {
  const source = Array.isArray(fieldsRaw) ? fieldsRaw : [];
  const sorted = source.slice().sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
  return reindexSortOrder(sorted);
}

export {
  normalizeFieldsForPersist,
  updateFieldList,
  moveFieldList,
  removeFieldFromList,
};
