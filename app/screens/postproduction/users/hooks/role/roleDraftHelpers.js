export const DEFAULT_ROLE_DRAFT = Object.freeze({
  key: "",
  displayName: "",
  note: "",
  canValidate: false,
  canSyncScenes: false,
  canManageUsers: false,
  canManageRoles: false,
  canManageForms: false,
  canManageMachines: false,
  canBanUsers: false,
  canManageProjectPermissions: false,
  canLaunchProjects: true,
  canLaunchRenders: true,
  manageableRoles: [],
});

export function createEmptyRoleDraft() {
  return {
    ...DEFAULT_ROLE_DRAFT,
    manageableRoles: [],
  };
}

export function buildRoleDraftFromRole(role) {
  const roleKey = String(role?.key || "").trim();
  return {
    ...DEFAULT_ROLE_DRAFT,
    key: roleKey,
    displayName: String(role?.displayName || roleKey),
    note: String(role?.note || ""),
    canValidate: role?.canValidate === true,
    canSyncScenes: role?.canSyncScenes === true,
    canManageUsers: role?.canManageUsers === true,
    canManageRoles: role?.canManageRoles === true,
    canManageForms: role?.canManageForms === true,
    canManageMachines: role?.canManageMachines === true,
    canBanUsers: role?.canBanUsers === true,
    canManageProjectPermissions: role?.canManageProjectPermissions === true,
    canLaunchProjects: role?.canLaunchProjects !== false,
    canLaunchRenders: role?.canLaunchRenders !== false,
    manageableRoles: Array.isArray(role?.manageableRoles) ? role.manageableRoles : [],
  };
}

export function buildRolePayloadFromDraft(roleDraft = {}) {
  const canManageUsers = roleDraft?.canManageUsers === true;
  return {
    displayName: String(roleDraft?.displayName || ""),
    note: String(roleDraft?.note || ""),
    canValidate: roleDraft?.canValidate === true,
    canSyncScenes: roleDraft?.canSyncScenes === true,
    canManageUsers,
    canManageRoles: roleDraft?.canManageRoles === true,
    canManageForms: roleDraft?.canManageForms === true,
    canManageMachines: roleDraft?.canManageMachines === true,
    canBanUsers: canManageUsers && roleDraft?.canBanUsers === true,
    canManageProjectPermissions: canManageUsers && roleDraft?.canManageProjectPermissions === true,
    canLaunchProjects: roleDraft?.canLaunchProjects !== false,
    canLaunchRenders: roleDraft?.canLaunchRenders !== false,
    manageableRoles: canManageUsers
      ? (Array.isArray(roleDraft?.manageableRoles) ? roleDraft.manageableRoles : [])
      : [],
  };
}

export function computeRoleUsersKey({
  isCreate = false,
  draft = null,
  editingRoleKey = "",
} = {}) {
  if (isCreate) return String(draft?.key || draft?.displayName || "").replace(/\s+/g, " ").trim();
  return String(editingRoleKey || "").trim();
}

export default {
  DEFAULT_ROLE_DRAFT,
  createEmptyRoleDraft,
  buildRoleDraftFromRole,
  buildRolePayloadFromDraft,
  computeRoleUsersKey,
};
