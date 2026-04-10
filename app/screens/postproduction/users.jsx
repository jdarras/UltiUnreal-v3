import { useEffect } from "react";
import { safeT } from "./shared/helpers";
import { AuthCard } from "./users/AuthCard";
import { ProfileCard } from "./users/ProfileCard";
import { RoleManagementCard } from "./users/RoleManagementCard";
import { UserToolbar } from "./users/UserToolbar";
import { UserBrowsePanel } from "./users/components/UserBrowsePanel";
import { UserEditorPanel } from "./users/components/UserEditorPanel";
import { useUserManagementCardController } from "./users/hooks/useUserManagementCardController";

function UserManagementCard({
  t,
  tabKey = "",
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
  onOpenActivityTarget = null,
}) {
  const {
    inEditor,
    closeEditor,
    roleOptionsLength,
    toolbarProps,
    editorPanelProps,
    browsePanelProps,
  } = useUserManagementCardController({
    t,
    manageableRoles,
    canBanUsers,
    canManageProjectPermissions,
    roles,
    users,
    usersLoading,
    usersError,
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

  useEffect(() => {
    if (inEditor) closeEditor();
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="uu-section">
      <UserToolbar {...toolbarProps} />

      {usersError ? <div className="uu-msg error mt-12">{usersError}</div> : null}

      {!usersError && roleOptionsLength === 0 ? (
        <div className="uu-msg warn mt-12">
          {safeT(t, "postprod.users.error.noManageableRole", "Aucun role autorise pour cette session.")}
        </div>
      ) : null}

      {inEditor ? (
        <UserEditorPanel {...editorPanelProps} onOpenActivityTarget={onOpenActivityTarget} />
      ) : (
        <UserBrowsePanel {...browsePanelProps} />
      )}
    </section>
  );
}

export {
  AuthCard,
  ProfileCard,
  UserManagementCard,
  RoleManagementCard,
};
