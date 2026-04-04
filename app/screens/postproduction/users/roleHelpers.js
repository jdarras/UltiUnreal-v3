import { safeT } from "../shared/helpers";

const KNOWN_ROLE_TO_KEY = {
  Maintenance: "maintenance",
  "Responsable Fabrication": "responsableFabrication",
  Integrateur: "integrateur",
  Operateur: "operateur",
  Graphiste: "graphiste",
  Journaliste: "journaliste",
};

export function roleLabel(t, roleName, rolesByKey = new Map()) {
  const role = String(roleName || "").trim();
  if (!role) return "-";
  const roleMeta = rolesByKey.get(role);
  const roleDisplay = String(roleMeta?.displayName || role || "").trim();
  const key = KNOWN_ROLE_TO_KEY[role];
  if (key) {
    return safeT(t, `postprod.roles.${key}`, roleDisplay || role);
  }
  return roleDisplay || role;
}

export function resolveUserDisplayName(entry) {
  return String(entry?.displayName || entry?.username || "").trim() || "-";
}

export function resolveUserProfileLabel(entry, t, rolesByKey = new Map()) {
  const role = String(entry?.role || "").trim();
  return String(entry?.profile || "").trim() || roleLabel(t, role, rolesByKey);
}

export function resolveUserPhoneValue(entry) {
  return String(entry?.phone || entry?.phone1 || entry?.mobilePhone || "").trim();
}

