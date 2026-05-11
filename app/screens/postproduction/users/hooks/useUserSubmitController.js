import { useCallback, useMemo } from "react";

function useUserSubmitController({
  canBanUsers = false,
  usersLoading = false,
  onCreateUser = null,
  onUpdateUser = null,
  closeEditor = null,
  draft = {},
  editorMode = "none",
  editingUserId = 0,
}) {
  const buildUserPayloadFromDraft = useCallback((userDraft = {}, options = {}) => {
    const includeIsActive = options?.includeIsActive === true;
    const includePassword = options?.includePassword === true;
    const payload = {
      displayName: String(userDraft?.displayName || ""),
      firstName: String(userDraft?.firstName || ""),
      lastName: String(userDraft?.lastName || ""),
      email: String(userDraft?.email || ""),
      email2: String(userDraft?.email2 || ""),
      phone: String(userDraft?.phone || ""),
      phone2: String(userDraft?.phone2 || ""),
      mobilePhone: String(userDraft?.phone || ""),
      officePhone: String(userDraft?.phone2 || ""),
      note: String(userDraft?.note || ""),
      avatarPath: String(userDraft?.avatarPath || ""),
      language: String(userDraft?.language || "fr").trim().toLowerCase() === "en" ? "en" : "fr",
      notificationPrefsJson: String(userDraft?.notificationPrefsJson || "").trim(),
      mustChangePassword: userDraft?.mustChangePassword === true,
      role: String(userDraft?.role || ""),
    };
    if (includePassword) {
      const password = String(userDraft?.password || "");
      if (password.trim()) payload.password = password;
    }
    if (includeIsActive && canBanUsers) {
      payload.isActive = userDraft?.isActive !== false;
    }
    return payload;
  }, [canBanUsers]);

  const submitEditor = useCallback(async () => {
    if (editorMode === "create") {
      const payload = buildUserPayloadFromDraft(draft, {
        includeIsActive: false,
        includePassword: true,
      });
      const ok = await onCreateUser?.({
        ...payload,
        isActive: true,
      });
      if (ok !== false) closeEditor?.();
      return;
    }

    if (editorMode === "edit" && editingUserId > 0) {
      const nextPayload = buildUserPayloadFromDraft(draft, {
        includeIsActive: true,
        includePassword: false,
      });
      const ok = await onUpdateUser?.(editingUserId, nextPayload);
      if (ok !== false) closeEditor?.();
    }
  }, [buildUserPayloadFromDraft, draft, editorMode, onCreateUser, closeEditor, editingUserId, onUpdateUser]);

  const isCreate = editorMode === "create";
  const createDisplayName = String(draft?.displayName || "").trim();
  const hasPassword = String(draft?.password || "").trim().length > 0;
  const submitDisabled = useMemo(
    () =>
      usersLoading ||
      !String(draft?.role || "").trim() ||
      !createDisplayName ||
      (isCreate && !hasPassword),
    [usersLoading, draft?.role, createDisplayName, isCreate, hasPassword]
  );

  return {
    buildUserPayloadFromDraft,
    submitEditor,
    submitDisabled,
  };
}

export { useUserSubmitController };
