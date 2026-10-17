function getVisibleLiveFields(fields = []) {
  const list = Array.isArray(fields) ? fields : [];
  return list
    .filter((field) => field?.isVisible !== false)
    .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
}

function resolveLiveFieldInputKind(field = {}) {
  const rawInputKind = String(field?.inputKind || "text").trim().toLowerCase();
  const valueType = String(field?.valueType || "").trim().toLowerCase();
  if (rawInputKind === "text" && valueType === "integer") return "integer";
  if (rawInputKind === "text" && (valueType === "vector2" || valueType === "vector3")) return valueType;
  return rawInputKind;
}

function resolveSafeColorValue(value) {
  const colorValue = String(value || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorValue) ? colorValue : "#ffffff";
}

export {
  getVisibleLiveFields,
  resolveLiveFieldInputKind,
  resolveSafeColorValue,
};
