import { useEffect, useState } from "react";
import { DEFAULT_NOTIFICATION_PREFS, stringifyNotificationPrefs } from "../userSharedHelpers";

function createEmptyDraft(role = "") {
  return {
    username: "",
    displayName: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    email2: "",
    phone: "",
    phone2: "",
    employmentType: "",
    note: "",
    avatarPath: "",
    language: "fr",
    notificationPrefsJson: stringifyNotificationPrefs(DEFAULT_NOTIFICATION_PREFS),
    mustChangePassword: false,
    role: role || "",
    isActive: true,
  };
}

function useUserEditorFlow({
  roleOptions = [],
  resetPermissionState,
  resetActivityState,
  canManageProjectPermissions = false,
  loadUserProjectPermissions,
  loadUserActivity,
}) {
  const [editorMode, setEditorMode] = useState("list");
  const [editingUserId, setEditingUserId] = useState(0);
  const [draft, setDraft] = useState(() => createEmptyDraft(roleOptions[0] || ""));
  const [editorAvatarError, setEditorAvatarError] = useState("");
  const [editorAvatarLoading, setEditorAvatarLoading] = useState(false);

  const inEditor = editorMode === "create" || editorMode === "edit";
  const isCreate = editorMode === "create";

  useEffect(() => {
    setDraft((prev) => {
      const currentRole = String(prev?.role || "").trim();
      if (currentRole && roleOptions.includes(currentRole)) return prev;
      return {
        ...(prev || {}),
        role: roleOptions[0] || "",
      };
    });
  }, [roleOptions]);

  function resetDraft(nextRole = "") {
    setDraft(createEmptyDraft(nextRole));
    resetPermissionState?.();
    resetActivityState?.();
    setEditorAvatarError("");
    setEditorAvatarLoading(false);
  }

  function openCreate() {
    resetDraft(roleOptions[0] || "");
    setEditingUserId(0);
    setEditorMode("create");
  }

  function closeEditor() {
    setEditorMode("list");
    setEditingUserId(0);
    resetDraft(roleOptions[0] || "");
  }

  function openEdit(entry) {
    const id = Number(entry?.id || 0);
    if (!id) return;
    setDraft({
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
      notificationPrefsJson: stringifyNotificationPrefs(
        entry?.notificationPrefsJson || entry?.notificationPreferences || DEFAULT_NOTIFICATION_PREFS
      ),
      mustChangePassword: entry?.mustChangePassword === true,
      role: String(entry?.role || roleOptions[0] || "").trim(),
      isActive: entry?.isActive !== false,
    });
    resetPermissionState?.();
    resetActivityState?.();
    setEditorAvatarError("");
    setEditorAvatarLoading(false);
    setEditingUserId(id);
    setEditorMode("edit");
    void loadUserActivity?.(id, {
      fromAtLocal: "",
      toAtLocal: "",
      actionType: "all",
      projectRef: "",
      searchQuery: "",
    });
    if (canManageProjectPermissions) {
      void loadUserProjectPermissions?.(id);
    }
  }

  return {
    editorMode,
    setEditorMode,
    editingUserId,
    setEditingUserId,
    draft,
    setDraft,
    editorAvatarError,
    setEditorAvatarError,
    editorAvatarLoading,
    setEditorAvatarLoading,
    inEditor,
    isCreate,
    resetDraft,
    openCreate,
    openEdit,
    closeEditor,
  };
}

export { useUserEditorFlow };
