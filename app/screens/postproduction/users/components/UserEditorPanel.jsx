import { safeT } from "../../shared/helpers";
import { UserActivityBlock } from "../editor/UserActivityBlock";
import { UserEditorHeader } from "../editor/UserEditorHeader";
import { UserIdentityBlock } from "../editor/UserIdentityBlock";
import { UserProjectPermissionsBlock } from "../editor/UserProjectPermissionsBlock";
import { UserSecurityBlock } from "../editor/UserSecurityBlock";

function UserEditorPanel({
  t,
  usersLoading = false,
  closeEditor = null,
  editorAvatarSrc = "",
  editorAvatarInitials = "",
  draft = {},
  selectedProfile = "-",
  editorAvatarInputRef = null,
  editorAvatarLoading = false,
  onSelectEditorAvatar = null,
  onClearAvatar = null,
  editorAvatarPath = "",
  setDraft = null,
  setEditorAvatarError = null,
  roleOptions = [],
  rolesByKey = new Map(),
  isCreate = false,
  canBanUsers = false,
  editingEntry = null,
  canManageProjectPermissions = false,
  projectsLoading = false,
  projectsError = "",
  projectOptions = [],
  permissionOverridesCount = 0,
  permissionSummaryRows = [],
  permissionTableSearch = "",
  setPermissionTableSearch = null,
  permissionTableScope = "all",
  setPermissionTableScope = null,
  permissionLoading = false,
  permissionSaving = false,
  filteredPermissionSummaryRows = [],
  selectedPermissionProjectRef = "",
  setSelectedPermissionProjectRef = null,
  setPermissionError = null,
  setPermissionInfo = null,
  selectedPermissionProject = null,
  permissionDraft = {},
  setPermissionDraft = null,
  submitProjectPermissions = null,
  onUpdateUserProjectPermissions = null,
  permissionError = "",
  permissionInfo = "",
  activityLoading = false,
  activityError = "",
  activityFromAtLocal = "",
  setActivityFromAtLocal = null,
  activityToAtLocal = "",
  setActivityToAtLocal = null,
  activityActionType = "all",
  setActivityActionType = null,
  activityProjectRef = "all",
  setActivityProjectRef = null,
  activitySearchQuery = "",
  setActivitySearchQuery = null,
  activitySearchDebounceRef = null,
  editingUserId = 0,
  loadUserActivity = null,
  editingSummary = null,
  editingTypeSummary = null,
  editingActivities = [],
  filteredEditingActivities = [],
  submitDisabled = false,
  submitEditor = null,
  userAutosaveBusy = false,
  userAutosaveError = "",
  userAutosaveInfo = "",
}) {
  return (
    <div className="uu-card mt-12">
      <UserEditorHeader
        t={t}
        usersLoading={usersLoading}
        closeEditor={closeEditor}
        editorAvatarSrc={editorAvatarSrc}
        editorAvatarInitials={editorAvatarInitials}
        draft={draft}
        selectedProfile={selectedProfile}
        editorAvatarInputRef={editorAvatarInputRef}
        editorAvatarLoading={editorAvatarLoading}
        onSelectEditorAvatar={onSelectEditorAvatar}
        onClearAvatar={() => {
          if (typeof onClearAvatar === "function") {
            onClearAvatar();
            return;
          }
          if (typeof setDraft === "function") {
            setDraft((prev) => ({ ...(prev || {}), avatarPath: "" }));
          }
          if (typeof setEditorAvatarError === "function") {
            setEditorAvatarError("");
          }
        }}
        editorAvatarPath={editorAvatarPath}
      />

      <UserIdentityBlock
        t={t}
        draft={draft}
        setDraft={setDraft}
        usersLoading={usersLoading}
        roleOptions={roleOptions}
        rolesByKey={rolesByKey}
      />

      <UserSecurityBlock
        t={t}
        draft={draft}
        setDraft={setDraft}
        usersLoading={usersLoading}
        isCreate={isCreate}
        canBanUsers={canBanUsers}
      />

      {!isCreate && editingEntry && canManageProjectPermissions ? (
        <UserProjectPermissionsBlock
          t={t}
          usersLoading={usersLoading}
          projectsLoading={projectsLoading}
          projectsError={projectsError}
          projectOptions={projectOptions}
          permissionOverridesCount={permissionOverridesCount}
          permissionSummaryRows={permissionSummaryRows}
          permissionTableSearch={permissionTableSearch}
          setPermissionTableSearch={setPermissionTableSearch}
          permissionTableScope={permissionTableScope}
          setPermissionTableScope={setPermissionTableScope}
          permissionLoading={permissionLoading}
          permissionSaving={permissionSaving}
          filteredPermissionSummaryRows={filteredPermissionSummaryRows}
          selectedPermissionProjectRef={selectedPermissionProjectRef}
          setSelectedPermissionProjectRef={setSelectedPermissionProjectRef}
          setPermissionError={setPermissionError}
          setPermissionInfo={setPermissionInfo}
          selectedPermissionProject={selectedPermissionProject}
          permissionDraft={permissionDraft}
          setPermissionDraft={setPermissionDraft}
          submitProjectPermissions={submitProjectPermissions}
          onUpdateUserProjectPermissions={onUpdateUserProjectPermissions}
          permissionError={permissionError}
          permissionInfo={permissionInfo}
        />
      ) : null}

      {!isCreate && editingEntry ? (
        <UserActivityBlock
          t={t}
          usersLoading={usersLoading}
          activityLoading={activityLoading}
          activityError={activityError}
          activityFromAtLocal={activityFromAtLocal}
          setActivityFromAtLocal={setActivityFromAtLocal}
          activityToAtLocal={activityToAtLocal}
          setActivityToAtLocal={setActivityToAtLocal}
          activityActionType={activityActionType}
          setActivityActionType={setActivityActionType}
          activityProjectRef={activityProjectRef}
          setActivityProjectRef={setActivityProjectRef}
          projectsLoading={projectsLoading}
          projectOptions={projectOptions}
          activitySearchQuery={activitySearchQuery}
          setActivitySearchQuery={setActivitySearchQuery}
          activitySearchDebounceRef={activitySearchDebounceRef}
          editingUserId={editingUserId}
          loadUserActivity={loadUserActivity}
          editingSummary={editingSummary}
          editingTypeSummary={editingTypeSummary}
          editingActivities={editingActivities}
          filteredEditingActivities={filteredEditingActivities}
        />
      ) : null}

      {isCreate ? (
        <div className="uu-row mt-12" style={{ justifyContent: "space-between" }}>
          <button className="uu-btn-ghost" type="button" onClick={closeEditor} disabled={usersLoading}>
            {safeT(t, "postprod.users.form.cancel", "Retour liste")}
          </button>
          <button
            className="uu-btn"
            type="button"
            disabled={submitDisabled}
            onClick={() => submitEditor?.()}
          >
            {safeT(t, "postprod.users.form.create", "Creer utilisateur")}
          </button>
        </div>
      ) : (
        <>
          {userAutosaveBusy ? <div className="uu-muted mt-12">{safeT(t, "common.loading", "Chargement…")}</div> : null}
          {userAutosaveError ? <div className="uu-msg warn mt-12">{userAutosaveError}</div> : null}
          {!userAutosaveBusy && !userAutosaveError && userAutosaveInfo ? (
            <div className="uu-msg ok mt-12">{userAutosaveInfo}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { UserEditorPanel };
