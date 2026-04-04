import { useUserAutosave } from "../useUserAutosave";
import { useUserEditorActions } from "../useUserEditorActions";
import { useUserListSortController } from "../useUserListSortController";
import { useUserAvatarUpload } from "../useUserAvatarUpload";
import { useUserSubmitController } from "../useUserSubmitController";
import { useUserExternalEditRequest } from "../useUserExternalEditRequest";
import { useUserEditorViewModel } from "../useUserEditorViewModel";

export function useUserManagementActions({
  t,
  canBanUsers = false,
  usersLoading = false,
  onCreateUser = null,
  onUpdateUser = null,
  onNotify = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  state = {},
} = {}) {
  const {
    roleOptions,
    projectOptions,
    selectedPermissionProjectRef,
    setSelectedPermissionProjectRef,
    canManageProjectPermissions = false,
    loadUserProjectPermissions,
    loadUserActivity,
    setDraft,
    setEditorAvatarError,
    setEditorAvatarLoading,
    setEditingUserId,
    setEditorMode,
    resetEditorDraft,
    resetPermissionState,
    resetActivityState,
    orderedUsers,
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
    draft,
    editorMode,
    editingUserId,
    rolesByKey,
  } = state;

  const {
    openCreate,
    openEdit,
    closeEditor,
  } = useUserEditorActions({
    roleOptions,
    projectOptions,
    selectedPermissionProjectRef,
    setSelectedPermissionProjectRef,
    canManageProjectPermissions,
    loadUserProjectPermissions,
    loadUserActivity,
    setDraft,
    setEditorAvatarError,
    setEditorAvatarLoading,
    setEditingUserId,
    setEditorMode,
    resetEditorDraft,
    resetPermissionState,
    resetActivityState,
  });

  useUserExternalEditRequest({
    editUserIdRequest,
    orderedUsers,
    openEdit,
    onEditUserIdHandled,
  });

  const { onSelectEditorAvatar } = useUserAvatarUpload({
    t,
    setDraft,
    setEditorAvatarError,
    setEditorAvatarLoading,
    onNotify,
  });

  const { handleListSort, listSortArrowFor } = useUserListSortController({
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
  });

  const { buildUserPayloadFromDraft, submitEditor, submitDisabled } = useUserSubmitController({
    canBanUsers,
    usersLoading,
    onCreateUser,
    onUpdateUser,
    closeEditor,
    draft,
    editorMode,
    editingUserId,
  });

  const {
    userAutosaveBusy,
    userAutosaveError,
    userAutosaveInfo,
  } = useUserAutosave({
    t,
    editorMode,
    editingUserId,
    usersLoading,
    onUpdateUser,
    buildUserPayloadFromDraft,
    draft,
  });

  const {
    canCreate,
    selectedProfile,
    editorAvatarPath,
    editorAvatarSrc,
    editorAvatarInitials,
  } = useUserEditorViewModel({
    t,
    roleOptions,
    draft,
    rolesByKey,
  });

  return {
    openCreate,
    openEdit,
    closeEditor,
    onSelectEditorAvatar,
    handleListSort,
    listSortArrowFor,
    submitEditor,
    submitDisabled,
    userAutosaveBusy,
    userAutosaveError,
    userAutosaveInfo,
    canCreate,
    selectedProfile,
    editorAvatarPath,
    editorAvatarSrc,
    editorAvatarInitials,
  };
}

export default useUserManagementActions;
