function useUserEditorActions({
  roleOptions = [],
  loadUserActivity,
  setDraft,
  setEditorAvatarError,
  setEditorAvatarLoading,
  setEditingUserId,
  setEditorMode,
  resetEditorDraft,
  resetActivityState,
}) {
  function resetEditorContext(nextRole = "") {
    resetEditorDraft?.(nextRole);
    resetActivityState?.();
  }

  function openCreate() {
    resetEditorContext(roleOptions[0] || "");
    setEditingUserId?.(0);
    setEditorMode?.("create");
  }

  function openEdit(entry) {
    const id = Number(entry?.id || 0);
    if (!id) return;
    setDraft?.({
      username: String(entry?.username || ""),
      displayName: String(entry?.displayName || ""),
      password: "",
      firstName: String(entry?.firstName || ""),
      lastName: String(entry?.lastName || ""),
      email: String(entry?.email || ""),
      email2: String(entry?.email2 || ""),
      phone: String(entry?.phone1 || entry?.phone || ""),
      phone2: String(entry?.phone2 || entry?.officePhone || ""),
      employmentType: String(entry?.employmentType || ""),
      note: String(entry?.note || ""),
      avatarPath: String(entry?.avatarPath || ""),
      language: String(entry?.language || "fr").trim().toLowerCase() === "en" ? "en" : "fr",
      notificationPrefsJson: String(entry?.notificationPrefsJson || entry?.notificationPreferences || "").trim(),
      mustChangePassword: entry?.mustChangePassword === true,
      role: String(entry?.role || roleOptions[0] || "").trim(),
      isActive: entry?.isActive !== false,
    });
    resetActivityState?.();
    setEditorAvatarError?.("");
    setEditorAvatarLoading?.(false);
    setEditingUserId?.(id);
    setEditorMode?.("edit");
    void loadUserActivity?.(id, {
      fromAtLocal: "",
      toAtLocal: "",
      actionType: "all",
      projectRef: "",
      searchQuery: "",
    });
  }

  function closeEditor() {
    setEditorMode?.("list");
    setEditingUserId?.(0);
    resetEditorContext(roleOptions[0] || "");
  }

  return {
    openCreate,
    openEdit,
    closeEditor,
  };
}

export { useUserEditorActions };
