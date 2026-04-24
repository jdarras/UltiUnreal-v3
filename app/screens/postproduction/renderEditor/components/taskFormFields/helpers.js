function normalizeAutoRenderFormOptions(field) {
  const source = Array.isArray(field?.options) ? field.options : [];
  const out = [];
  const seen = new Set();
  for (const entry of source) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const value = String(entry?.value ?? entry?.id ?? "").trim();
      const label = String(entry?.label ?? value).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({ value, label: label || value });
    } else {
      const value = String(entry ?? "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({ value, label: value });
    }
  }
  return out;
}

function normalizeAutoRenderVectorUiValue(rawValue, dimensions = 3) {
  const dims = dimensions === 2 ? 2 : 3;
  const asString = (value) => {
    if (value == null || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "";
  };
  const parseFromString = (textValue) => {
    const parsed = {};
    const matches = String(textValue || "").matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
    for (const match of matches) {
      const key = String(match?.[1] || "").trim().toLowerCase();
      const value = asString(match?.[2]);
      if (!key || !value) continue;
      parsed[key] = value;
    }
    return parsed;
  };
  let src = rawValue;
  if (typeof src === "string") {
    const txt = String(src || "").trim();
    if (txt) {
      try {
        src = JSON.parse(txt);
      } catch {
        src = parseFromString(txt);
      }
    }
  }
  let x = "";
  let y = "";
  let z = "";
  if (Array.isArray(src)) {
    x = asString(src[0]);
    y = asString(src[1]);
    z = asString(src[2]);
  } else if (src && typeof src === "object") {
    x = asString(src.x ?? src.X ?? src.pitch ?? src.Pitch ?? src.roll ?? src.Roll);
    y = asString(src.y ?? src.Y ?? src.yaw ?? src.Yaw);
    z = asString(src.z ?? src.Z);
  }
  return dims === 2 ? { x, y } : { x, y, z };
}

function resolveTaskFormInputKind(field) {
  const rawInputKind = String(field?.inputKind || "text").trim().toLowerCase();
  const valueType = String(field?.valueType || "").trim().toLowerCase();
  if (rawInputKind === "text" && valueType === "integer") return "integer";
  if (rawInputKind === "text" && (valueType === "vector2" || valueType === "vector3")) return valueType;
  return rawInputKind;
}

function sanitizeInlineTextValue(rawValue) {
  return String(rawValue ?? "").replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ");
}

export {
  normalizeAutoRenderFormOptions,
  normalizeAutoRenderVectorUiValue,
  resolveTaskFormInputKind,
  sanitizeInlineTextValue,
};
