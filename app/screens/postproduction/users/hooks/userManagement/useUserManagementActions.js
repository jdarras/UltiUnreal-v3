import { useCallback, useMemo, useState } from "react";
import { safeT } from "../../../shared/helpers";
import { useConfirmDialogState } from "../../../catalogs/hooks/useConfirmDialogState";
import { useUserAutosave } from "../useUserAutosave";
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
  onDeleteUser = null,
  onNotify = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  state = {},
} = {}) {
  const {
    roleOptions,
    orderedUsers,
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
    draft,
    setDraft,
    editorMode,
    editingUserId,
    setEditorAvatarError,
    setEditorAvatarLoading,
    rolesByKey,
    editorInputFocused,
    autosavePulse,
    openCreate,
    openEdit,
    closeEditor,
  } = state;

  const [deleteUserBusy, setDeleteUserBusy] = useState(false);

  const editingEntry = useMemo(
    () =>
      Array.isArray(orderedUsers)
        ? orderedUsers.find((entry) => Number(entry?.id || 0) === Number(editingUserId || 0)) || null
        : null,
    [orderedUsers, editingUserId]
  );

  const deleteUserTargetName = useMemo(
    () =>
      String(
        editingEntry?.displayName
        || draft?.displayName
        || editingEntry?.username
        || ""
      ).trim(),
    [editingEntry, draft?.displayName]
  );

  const deleteDialog = useConfirmDialogState({
    canOpen: () =>
      editorMode === "edit"
      && Number(editingUserId || 0) > 0
      && typeof onDeleteUser === "function"
      && !deleteUserBusy,
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
    editorInputFocused,
    autosavePulse,
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

  const requestDeleteUser = useCallback(() => {
    if (deleteUserBusy) return;
    deleteDialog.openDialog();
  }, [deleteUserBusy, deleteDialog]);

  const confirmDeleteUser = useCallback(async () => {
    if (deleteUserBusy || typeof onDeleteUser !== "function") return;
    const targetUserId = Number(editingUserId || 0);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) return;
    setDeleteUserBusy(true);
    try {
      const ok = await onDeleteUser(targetUserId);
      if (ok === false) return;
      deleteDialog.closeDialog();
      closeEditor?.();
    } finally {
      setDeleteUserBusy(false);
    }
  }, [deleteUserBusy, onDeleteUser, editingUserId, deleteDialog, closeEditor]);

  const onChangePassword = useCallback(async (newPassword) => {
    const targetUserId = Number(editingUserId || 0);
    if (editorMode !== "edit" || !Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new Error(
        safeT(t, "postprod.users.error.userNotFound", "Utilisateur introuvable.")
      );
    }
    if (typeof onUpdateUser !== "function") {
      throw new Error(
        safeT(t, "postprod.profile.form.passwordChangeFailed", "Échec du changement de mot de passe.")
      );
    }
    const password = String(newPassword || "");
    if (password.length < 4) {
      throw new Error(
        safeT(t, "postprod.users.error.invalidPassword", "Mot de passe invalide (minimum 4 caractères).")
      );
    }
    const ok = await onUpdateUser(targetUserId, { password });
    if (ok === false) {
      throw new Error(
        safeT(t, "postprod.profile.form.passwordChangeFailed", "Échec du changement de mot de passe.")
      );
    }
  }, [editingUserId, editorMode, onUpdateUser, t]);

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
    canDeleteUser: editorMode === "edit" && Number(editingUserId || 0) > 0 && typeof onDeleteUser === "function",
    deleteUserTargetName,
    requestDeleteUser,
    cancelDeleteUser: deleteDialog.closeDialog,
    confirmDeleteUser,
    deleteDialogOpen: deleteDialog.open,
    deleteDialogConfirmRef: deleteDialog.confirmRef,
    deleteUserBusy,
    onChangePassword,
  };
}
