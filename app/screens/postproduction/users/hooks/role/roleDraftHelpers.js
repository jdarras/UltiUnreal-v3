const DEFAULT_ROLE_DRAFT = Object.freeze({
  key: "",
  displayName: "",
  note: "",
  canUseLiveMode: true,
  canUsePostprodMode: true,
  canValidate: false,
  canSyncScenes: false,
  canManageUsers: false,
  canManageRoles: false,
  canManageForms: false,
  canManageMachines: false,
  canManageConfiguration: false,
  canBanUsers: false,
  canManageProjectPermissions: false,
  canLaunchLiveProjects: true,
  canLaunchProjects: true,
  canLaunchRenders: true,
  canViewResources: true,
  canCreateTasks: true,
  canAssignRenderRequests: false,
  canEditProjects: true,
  canManageLayouts: true,
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
    canUseLiveMode: role?.canUseLiveMode !== false,
    canUsePostprodMode: role?.canUsePostprodMode !== false,
    canValidate: role?.canValidate === true,
    canSyncScenes: role?.canSyncScenes === true,
    canManageUsers: role?.canManageUsers === true,
    canManageRoles: role?.canManageRoles === true,
    canManageForms: role?.canManageForms === true,
    canManageMachines: role?.canManageMachines === true,
    canManageConfiguration: role?.canManageConfiguration === true,
    canBanUsers: role?.canBanUsers === true,
    canManageProjectPermissions: role?.canManageProjectPermissions === true,
    canLaunchLiveProjects: role?.canLaunchLiveProjects !== false,
    canLaunchProjects: role?.canLaunchProjects !== false,
    canLaunchRenders: role?.canLaunchRenders !== false,
    canViewResources: role?.canViewResources === true,
    canCreateTasks: role?.canCreateTasks === true,
    canAssignRenderRequests: role?.canAssignRenderRequests === true,
    canEditProjects: role?.canEditProjects === true,
    canManageLayouts: role?.canManageLayouts === true,
    manageableRoles: Array.isArray(role?.manageableRoles) ? role.manageableRoles : [],
  };
}

export function buildRolePayloadFromDraft(roleDraft = {}) {
  const canManageUsers = roleDraft?.canManageUsers === true;
  const canLaunchRenders = roleDraft?.canLaunchRenders !== false;
  return {
    displayName: String(roleDraft?.displayName || ""),
    note: String(roleDraft?.note || ""),
    canUseLiveMode: roleDraft?.canUseLiveMode !== false,
    canUsePostprodMode: roleDraft?.canUsePostprodMode !== false,
    // Permission legacy backend: on l'aligne sur le privilège unique visible dans l'UI.
    canValidate: canLaunchRenders,
    canSyncScenes: roleDraft?.canSyncScenes === true,
    canManageUsers,
    canManageRoles: roleDraft?.canManageRoles === true,
    canManageForms: roleDraft?.canManageForms === true,
    canManageMachines: roleDraft?.canManageMachines === true,
    canManageConfiguration: roleDraft?.canManageConfiguration === true,
    canBanUsers: canManageUsers && roleDraft?.canBanUsers === true,
    canManageProjectPermissions: canManageUsers && roleDraft?.canManageProjectPermissions === true,
    canLaunchLiveProjects: roleDraft?.canLaunchLiveProjects !== false,
    canLaunchProjects: roleDraft?.canLaunchProjects !== false,
    canLaunchRenders,
    canViewResources: roleDraft?.canViewResources === true,
    canCreateTasks: roleDraft?.canCreateTasks === true,
    canAssignRenderRequests: roleDraft?.canAssignRenderRequests === true,
    canEditProjects: roleDraft?.canEditProjects === true,
    canManageLayouts: roleDraft?.canManageLayouts === true,
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
