import { useUserManagementData } from "./userManagement/useUserManagementData";
import {
  buildUserBrowsePanelProps,
  buildUserEditorPanelProps,
  buildUserToolbarProps,
} from "./userManagement/buildUserManagementPanelProps";

export function useUserManagementCardController({
  t,
  manageableRoles = [],
  canBanUsers = false,
  canManageProjectPermissions = false,
  roles = [],
  users = [],
  usersLoading = false,
  usersError = "",
  projects = [],
  projectsLoading = false,
  onCreateUser = null,
  onUpdateUser = null,
  onDeleteUser = null,
  onUpdateUserProjectPermissions = null,
  onLoadUserActivity = null,
  onLoadUserProjectPermissions = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  onEditorModeChange = null,
  onNotify = null,
} = {}) {
  const data = useUserManagementData({
    t,
    manageableRoles,
    canBanUsers,
    canManageProjectPermissions,
    roles,
    users,
    usersLoading,
    projects,
    projectsLoading,
    onCreateUser,
    onUpdateUser,
    onDeleteUser,
    onUpdateUserProjectPermissions,
    onLoadUserActivity,
    onLoadUserProjectPermissions,
    editUserIdRequest,
    onEditUserIdHandled,
    onEditorModeChange,
    onNotify,
  });

  const toolbarProps = buildUserToolbarProps({ t, data });
  const editorPanelProps = buildUserEditorPanelProps({ t, data });
  const browsePanelProps = buildUserBrowsePanelProps({ t, data });

  return {
    inEditor: data.inEditor,
    closeEditor: data.closeEditor,
    roleOptionsLength: data.roleOptionsLength,
    usersError,
    toolbarProps,
    editorPanelProps,
    browsePanelProps,
  };
}
