export function normalizeLiveOptionList(field) {
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

export function inferFieldValueTypeFromInputKind(inputKindRaw) {
  const inputKind = String(inputKindRaw || "").trim().toLowerCase();
  if (inputKind === "checkbox") return "boolean";
  if (inputKind === "number") return "number";
  if (inputKind === "integer") return "integer";
  if (inputKind === "vector2") return "vector2";
  if (inputKind === "vector3") return "vector3";
  if (inputKind === "color") return "color";
  if (inputKind === "date") return "date";
  if (inputKind === "json") return "json";
  if (inputKind === "select") return "enum";
  if (inputKind === "image") return "image";
  if (inputKind === "video") return "video";
  return "string";
}

export function normalizeVectorDefaultForInput(rawValue, dimensions = 3) {
  const dims = dimensions === 2 ? 2 : 3;
  const asNumberOrEmpty = (value) => {
    if (value === "" || value == null) return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  };
  const parseFromString = (textValue) => {
    const parsed = {};
    const matches = String(textValue || "").matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
    for (const match of matches) {
      const key = String(match?.[1] || "").trim().toLowerCase();
      const n = asNumberOrEmpty(match?.[2]);
      if (!key || n === "") continue;
      parsed[key] = n;
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
    x = asNumberOrEmpty(src[0]);
    y = asNumberOrEmpty(src[1]);
    z = asNumberOrEmpty(src[2]);
  } else if (src && typeof src === "object") {
    x = asNumberOrEmpty(src.x ?? src.X ?? src.pitch ?? src.Pitch ?? src.roll ?? src.Roll);
    y = asNumberOrEmpty(src.y ?? src.Y ?? src.yaw ?? src.Yaw);
    z = asNumberOrEmpty(src.z ?? src.Z);
  }
  return dims === 2 ? { x, y } : { x, y, z };
}

