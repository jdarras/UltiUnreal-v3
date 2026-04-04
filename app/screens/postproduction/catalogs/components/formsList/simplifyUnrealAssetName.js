function simplifyUnrealAssetName(valueRaw) {
  const raw = String(valueRaw || "").trim();
  if (!raw) return "-";
  const tail = raw.split("/").filter(Boolean).pop() || raw;
  const objectName = tail.split(".").filter(Boolean)[0] || tail;
  return String(objectName || "").trim() || "-";
}

export { simplifyUnrealAssetName };
