import { useMemo, useState } from "react";
import { resolveUserDisplayName } from "../roleHelpers";
import { useRoleAutosave } from "./role/useRoleAutosave";
import {
  buildRoleDraftFromRole,
  buildRolePayloadFromDraft,
  computeRoleUsersKey,
  createEmptyRoleDraft,
} from "./role/roleDraftHelpers";
import { rolePermissionsSummary } from "./role/roleSummaryHelpers";

export function useRoleManagementCardController({
  t,
  roles = [],
  rolesLoading = false,
  onCreateRole = null,
  onUpdateRole = null,
  users = [],
} = {}) {
  const roleRows = useMemo(() => (
    Array.isArray(roles)
      ? [...roles].sort((a, b) => String(a?.key || "").localeCompare(String(b?.key || "")))
      : []
  ), [roles]);

  const allRoleKeys = useMemo(
    () => roleRows.map((row) => String(row?.key || "").trim()).filter(Boolean),
    [roleRows]
  );

  const [editorMode, setEditorMode] = useState("list");
  const [editingRoleKey, setEditingRoleKey] = useState("");
  const [draft, setDraft] = useState(() => createEmptyRoleDraft());

  function resetDraft() {
    setDraft(createEmptyRoleDraft());
  }

  function openCreate() {
    resetDraft();
    setEditingRoleKey("");
    setEditorMode("create");
  }

  function openEdit(role) {
    const roleKey = String(role?.key || "").trim();
    if (!roleKey) return;
    setDraft(buildRoleDraftFromRole(role));
    setEditingRoleKey(roleKey);
    setEditorMode("edit");
  }

  function closeEditor() {
    setEditorMode("list");
    setEditingRoleKey("");
    resetDraft();
  }

  function toggleDraftManageable(targetRole) {
    const target = String(targetRole || "").trim();
    if (!target) return;
    setDraft((prev) => {
      const arr = Array.isArray(prev?.manageableRoles) ? prev.manageableRoles : [];
      const nextManageable = arr.includes(target)
        ? arr.filter((x) => x !== target)
        : [...arr, target];
      return {
        ...(prev || {}),
        manageableRoles: nextManageable,
      };
    });
  }

  async function submitEditor() {
    const computedRoleKey = String(draft?.key || draft?.displayName || "").replace(/\s+/g, " ").trim();
    const payload = buildRolePayloadFromDraft(draft);

    if (editorMode === "create") {
      const ok = await onCreateRole?.({
        key: computedRoleKey,
        ...payload,
      });
      if (ok !== false) closeEditor();
      return;
    }

    if (editorMode === "edit" && editingRoleKey) {
      const ok = await onUpdateRole?.(editingRoleKey, payload);
      if (ok !== false) closeEditor();
    }
  }

  const inEditor = editorMode === "create" || editorMode === "edit";
  const isCreate = editorMode === "create";
  const roleUsersKey = useMemo(
    () => computeRoleUsersKey({ isCreate, draft, editingRoleKey }),
    [isCreate, draft, editingRoleKey]
  );

  const usersForRole = useMemo(() => {
    const target = String(roleUsersKey || "").trim().toLowerCase();
    if (!target) return [];
    const list = Array.isArray(users) ? users : [];
    return list
      .filter((entry) => String(entry?.role || "").trim().toLowerCase() === target)
      .sort((a, b) => resolveUserDisplayName(a).localeCompare(resolveUserDisplayName(b)));
  }, [users, roleUsersKey]);

  const editorManageableCandidates = allRoleKeys.filter((candidate) => {
    if (!candidate) return false;
    if (isCreate) return true;
    return candidate !== editingRoleKey;
  });

  const submitDisabled = rolesLoading || !String(draft?.displayName || "").trim();
  const {
    roleAutosaveBusy,
    roleAutosaveError,
    roleAutosaveInfo,
  } = useRoleAutosave({
    t,
    editorMode,
    editingRoleKey,
    draft,
    rolesLoading,
    onUpdateRole,
    buildRolePayloadFromDraft,
  });

  const roleEditorPanelProps = {
    t,
    isCreate,
    rolesLoading,
    closeEditor,
    draft,
    setDraft,
    editorManageableCandidates,
    toggleDraftManageable,
    roleUsersKey,
    usersForRole,
    submitDisabled,
    submitEditor,
    roleAutosaveBusy,
    roleAutosaveError,
    roleAutosaveInfo,
  };

  const roleListPanelProps = {
    t,
    roleRows,
    rolesLoading,
    rolePermissionsSummary: (role) => rolePermissionsSummary(t, role),
    openEdit,
  };

  return {
    inEditor,
    openCreate,
    roleEditorPanelProps,
    roleListPanelProps,
  };
}

export default useRoleManagementCardController;
