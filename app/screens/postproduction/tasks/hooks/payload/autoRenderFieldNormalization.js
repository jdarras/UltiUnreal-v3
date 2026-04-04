export function normalizeAutoRenderFormFieldValue(field, rawValue) {
  const inputKind = String(field?.inputKind || "").trim().toLowerCase();
  const valueType = String(field?.valueType || "").trim().toLowerCase();
  if (inputKind === "checkbox" || valueType === "boolean") {
    return rawValue === true;
  }
  if (inputKind === "integer" || valueType === "integer") {
    const n = Number(rawValue);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (inputKind === "number" || valueType === "number") {
    const n = Number(rawValue);
    return Number.isFinite(n) ? n : null;
  }
  if (inputKind === "vector2" || valueType === "vector2") {
    const normalizeNum = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    let x = null;
    let y = null;
    if (Array.isArray(rawValue)) {
      x = normalizeNum(rawValue[0]);
      y = normalizeNum(rawValue[1]);
    } else if (rawValue && typeof rawValue === "object") {
      x = normalizeNum(rawValue.x ?? rawValue.X ?? rawValue.pitch ?? rawValue.Pitch ?? rawValue.roll ?? rawValue.Roll);
      y = normalizeNum(rawValue.y ?? rawValue.Y ?? rawValue.yaw ?? rawValue.Yaw);
    } else if (typeof rawValue === "string") {
      const parsed = {};
      const matches = String(rawValue || "").matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
      for (const match of matches) {
        const key = String(match?.[1] || "").trim().toLowerCase();
        const value = normalizeNum(match?.[2]);
        if (!key || value == null) continue;
        parsed[key] = value;
      }
      x = parsed.x ?? parsed.pitch ?? parsed.roll ?? null;
      y = parsed.y ?? parsed.yaw ?? null;
    }
    if (x == null || y == null) return "__invalid_vector__";
    return { x, y };
  }
  if (inputKind === "vector3" || valueType === "vector3") {
    const normalizeNum = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    let x = null;
    let y = null;
    let z = null;
    if (Array.isArray(rawValue)) {
      x = normalizeNum(rawValue[0]);
      y = normalizeNum(rawValue[1]);
      z = normalizeNum(rawValue[2]);
    } else if (rawValue && typeof rawValue === "object") {
      x = normalizeNum(rawValue.x ?? rawValue.X ?? rawValue.pitch ?? rawValue.Pitch ?? rawValue.roll ?? rawValue.Roll);
      y = normalizeNum(rawValue.y ?? rawValue.Y ?? rawValue.yaw ?? rawValue.Yaw);
      z = normalizeNum(rawValue.z ?? rawValue.Z);
    } else if (typeof rawValue === "string") {
      const parsed = {};
      const matches = String(rawValue || "").matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
      for (const match of matches) {
        const key = String(match?.[1] || "").trim().toLowerCase();
        const value = normalizeNum(match?.[2]);
        if (!key || value == null) continue;
        parsed[key] = value;
      }
      x = parsed.x ?? parsed.pitch ?? parsed.roll ?? null;
      y = parsed.y ?? parsed.yaw ?? null;
      z = parsed.z ?? null;
    }
    if (x == null || y == null || z == null) return "__invalid_vector__";
    return { x, y, z };
  }
  if (inputKind === "json" || valueType === "json") {
    if (rawValue == null || rawValue === "") return null;
    if (typeof rawValue === "object") return rawValue;
    try {
      return JSON.parse(String(rawValue || "").trim());
    } catch {
      return "__invalid_json__";
    }
  }
  return String(rawValue ?? "").trim();
}

export function isAutoRenderFormFieldMissing(field, normalizedValue) {
  if (field?.isRequired !== true) return false;
  if (normalizedValue == null) return true;
  if (normalizedValue === "__invalid_json__") return true;
  if (normalizedValue === "__invalid_vector__") return true;
  if (typeof normalizedValue === "string") return String(normalizedValue || "").trim().length <= 0;
  if (typeof normalizedValue === "number") return !Number.isFinite(normalizedValue);
  return false;
}
