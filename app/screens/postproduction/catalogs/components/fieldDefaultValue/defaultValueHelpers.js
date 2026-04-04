export function persistOnBlur(onPersistEditableFields) {
  if (typeof onPersistEditableFields === "function") {
    void onPersistEditableFields();
  }
}

export function updateDefaultValue(onUpdateEditableField, fieldKey, defaultValue, options = undefined) {
  if (typeof onUpdateEditableField !== "function") return;
  onUpdateEditableField(fieldKey, { defaultValue }, options);
}

export function normalizeColor(valueRaw) {
  const value = String(valueRaw || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#ffffff";
}

export function normalizeText(valueRaw) {
  return String(valueRaw ?? "").replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ");
}

export function normalizeNumeric(valueRaw) {
  const n = Number(valueRaw);
  return Number.isFinite(n) ? n : "";
}

export function normalizeInteger(valueRaw) {
  const n = Number(valueRaw);
  return Number.isFinite(n) ? Math.trunc(n) : "";
}

