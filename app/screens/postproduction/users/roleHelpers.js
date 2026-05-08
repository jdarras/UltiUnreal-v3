export function roleLabel(t, roleName, rolesByKey = new Map()) {
  const role = String(roleName || "").trim();
  if (!role) return "-";
  const roleMeta = rolesByKey.get(role);
  const roleDisplay = String(roleMeta?.displayName || role || "").trim();
  return roleDisplay || role;
}

export function resolveUserDisplayName(entry) {
  return String(entry?.displayName || entry?.username || "").trim() || "-";
}

export function resolveUserProfileLabel(entry, t, rolesByKey = new Map()) {
  const role = String(entry?.role || "").trim();
  if (role) return roleLabel(t, role, rolesByKey);
  return String(entry?.profile || "").trim() || "-";
}

export function resolveUserPhoneValue(entry) {
  return String(entry?.phone || entry?.phone1 || entry?.mobilePhone || "").trim();
}
