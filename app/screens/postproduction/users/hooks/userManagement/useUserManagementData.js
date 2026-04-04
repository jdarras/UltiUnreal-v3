import { buildUserManagementDataOutput } from "./buildUserManagementDataOutput";
import { useUserManagementActions } from "./useUserManagementActions";
import { useUserManagementState } from "./useUserManagementState";

export function useUserManagementData({
  t,
  manageableRoles = [],
  canBanUsers = false,
  canManageProjectPermissions = false,
  roles = [],
  users = [],
  usersLoading = false,
  projects = [],
  projectsLoading = false,
  projectsError = "",
  onCreateUser = null,
  onUpdateUser = null,
  onUpdateUserProjectPermissions = null,
  onLoadUserActivity = null,
  onLoadUserProjectPermissions = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  onEditorModeChange = null,
  onNotify = null,
} = {}) {
  const state = useUserManagementState({
    t,
    manageableRoles,
    canManageProjectPermissions,
    roles,
    users,
    projects,
    onLoadUserActivity,
    onLoadUserProjectPermissions,
    onUpdateUserProjectPermissions,
    onEditorModeChange,
  });

  const actions = useUserManagementActions({
    t,
    canBanUsers,
    usersLoading,
    onCreateUser,
    onUpdateUser,
    onNotify,
    editUserIdRequest,
    onEditUserIdHandled,
    state: {
      ...state,
      canManageProjectPermissions,
    },
  });

  return buildUserManagementDataOutput({
    state,
    actions,
    usersLoading,
    canBanUsers,
    canManageProjectPermissions,
    projectsLoading,
    projectsError,
    onUpdateUserProjectPermissions,
  });
}

export default useUserManagementData;
