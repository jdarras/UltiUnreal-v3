import { useEffect, useMemo, useRef, useState } from "react";
import { useUsersPreferences } from "../useUsersPreferences";
import { useUserCollections } from "../useUserCollections";
import { useUserActivity } from "../useUserActivity";
import { useUserProjectPermissions } from "../useUserProjectPermissions";
import { useUserEditorFlow } from "../useUserEditorFlow";
import { useUserCatalogOptions } from "../useUserCatalogOptions";
import { USER_LIST_SORT_COLUMNS } from "../../userSharedHelpers";

export function useUserManagementState({
  t,
  manageableRoles = [],
  canManageProjectPermissions = false,
  roles = [],
  users = [],
  projects = [],
  onLoadUserActivity = null,
  onLoadUserProjectPermissions = null,
  onUpdateUserProjectPermissions = null,
  onEditorModeChange = null,
} = {}) {
  const {
    rolesByKey,
    roleOptions,
    manageableSet,
    projectOptions,
  } = useUserCatalogOptions({
    roles,
    manageableRoles,
    projects,
  });

  const {
    viewMode,
    setViewMode,
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
  } = useUsersPreferences({
    allowedSortColumns: USER_LIST_SORT_COLUMNS,
    defaultViewMode: "list",
    defaultSortMode: "lastName",
    defaultSortDir: "asc",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const editorAvatarInputRef = useRef(null);

  const {
    editorMode,
    setEditorMode,
    editingUserId,
    setEditingUserId,
    draft,
    setDraft,
    editorAvatarError: _editorAvatarError,
    setEditorAvatarError,
    editorAvatarLoading,
    setEditorAvatarLoading,
    inEditor,
    isCreate,
    resetDraft: resetEditorDraft,
  } = useUserEditorFlow({
    roleOptions,
  });

  const {
    selectedPermissionProjectRef,
    setSelectedPermissionProjectRef,
    permissionDraft,
    setPermissionDraft,
    permissionLoading,
    permissionSaving,
    permissionError,
    setPermissionError,
    permissionInfo,
    setPermissionInfo,
    permissionTableSearch,
    setPermissionTableSearch,
    permissionTableScope,
    setPermissionTableScope,
    selectedPermissionProject,
    permissionSummaryRows,
    permissionOverridesCount,
    filteredPermissionSummaryRows,
    resetPermissionState,
    loadUserProjectPermissions,
    submitProjectPermissions,
  } = useUserProjectPermissions({
    t,
    canManageProjectPermissions,
    editorMode,
    projectOptions,
    onLoadUserProjectPermissions,
    onUpdateUserProjectPermissions,
  });

  const {
    activityLoading,
    activityError,
    activityFromAtLocal,
    setActivityFromAtLocal,
    activityToAtLocal,
    setActivityToAtLocal,
    activityActionType,
    setActivityActionType,
    activityProjectRef,
    setActivityProjectRef,
    activitySearchQuery,
    setActivitySearchQuery,
    activitySearchDebounceRef,
    resetActivityState,
    loadUserActivity,
    editingActivities,
    filteredEditingActivities,
    editingSummary,
    editingTypeSummary,
  } = useUserActivity({
    t,
    isCreate,
    editingUserId,
    onLoadUserActivity,
  });

  const {
    orderedUsers,
    groupedUsersByProfile,
    sortedUsersForList,
  } = useUserCollections({
    users,
    searchQuery,
    t,
    rolesByKey,
    listSortMode,
    listSortDir,
  });

  useEffect(() => {
    if (typeof onEditorModeChange !== "function") return;
    onEditorModeChange(inEditor);
  }, [inEditor, onEditorModeChange]);

  const editingEntry = useMemo(() => {
    if (editorMode !== "edit") return null;
    return orderedUsers.find((entry) => Number(entry?.id || 0) === Number(editingUserId || 0)) || null;
  }, [orderedUsers, editorMode, editingUserId]);

  return {
    rolesByKey,
    roleOptions,
    manageableSet,
    projectOptions,
    viewMode,
    setViewMode,
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
    searchQuery,
    setSearchQuery,
    editorAvatarInputRef,
    editorMode,
    setEditorMode,
    editingUserId,
    setEditingUserId,
    draft,
    setDraft,
    setEditorAvatarError,
    editorAvatarLoading,
    setEditorAvatarLoading,
    inEditor,
    isCreate,
    resetEditorDraft,
    selectedPermissionProjectRef,
    setSelectedPermissionProjectRef,
    permissionDraft,
    setPermissionDraft,
    permissionLoading,
    permissionSaving,
    permissionError,
    setPermissionError,
    permissionInfo,
    setPermissionInfo,
    permissionTableSearch,
    setPermissionTableSearch,
    permissionTableScope,
    setPermissionTableScope,
    selectedPermissionProject,
    permissionSummaryRows,
    permissionOverridesCount,
    filteredPermissionSummaryRows,
    resetPermissionState,
    loadUserProjectPermissions,
    submitProjectPermissions,
    activityLoading,
    activityError,
    activityFromAtLocal,
    setActivityFromAtLocal,
    activityToAtLocal,
    setActivityToAtLocal,
    activityActionType,
    setActivityActionType,
    activityProjectRef,
    setActivityProjectRef,
    activitySearchQuery,
    setActivitySearchQuery,
    activitySearchDebounceRef,
    resetActivityState,
    loadUserActivity,
    editingActivities,
    filteredEditingActivities,
    editingSummary,
    editingTypeSummary,
    orderedUsers,
    groupedUsersByProfile,
    sortedUsersForList,
    editingEntry,
  };
}

export default useUserManagementState;
