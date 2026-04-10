import { safeT } from "../../shared/helpers";
import { UserActivityBlock } from "../editor/UserActivityBlock";
import { UserEditorHeader } from "../editor/UserEditorHeader";
import { UserIdentityBlock } from "../editor/UserIdentityBlock";
import { UserSecurityBlock } from "../editor/UserSecurityBlock";
import { UserDeleteDialog } from "./UserDeleteDialog";

function UserEditorPanel({
  t,
  usersLoading = false,
  setEditorInputFocused = null,
  requestAutosaveOnBlur = null,
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
  projectsLoading = false,
  projectOptions = [],
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
  onOpenActivityTarget = null,
  submitDisabled = false,
  submitEditor = null,
  userAutosaveBusy = false,
  userAutosaveError = "",
  userAutosaveInfo = "",
  canDeleteUser = false,
  deleteUserTargetName = "",
  requestDeleteUser = null,
  cancelDeleteUser = null,
  confirmDeleteUser = null,
  deleteDialogOpen = false,
  deleteDialogConfirmRef = null,
  deleteUserBusy = false,
}) {
  return (
    <div
      className="uu-card mt-12"
      onFocusCapture={() => {
        if (typeof setEditorInputFocused === "function") {
          setEditorInputFocused(true);
        }
      }}
      onBlurCapture={(event) => {
        const target = event?.target instanceof HTMLElement ? event.target : null;
        const tagName = String(target?.tagName || "").toLowerCase();
        const isFieldTarget =
          tagName === "input" || tagName === "select" || tagName === "textarea";
        if (!isCreate && isFieldTarget && typeof requestAutosaveOnBlur === "function") {
          requestAutosaveOnBlur();
        }
        if (typeof setEditorInputFocused !== "function") return;
        const container = event.currentTarget;
        setTimeout(() => {
          const activeElement = document.activeElement;
          const stillInside =
            container instanceof HTMLElement
            && activeElement instanceof HTMLElement
            && container.contains(activeElement);
          setEditorInputFocused(stillInside);
        }, 0);
      }}
    >
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
        isCreate={isCreate}
        canDeleteUser={canDeleteUser}
        onRequestDeleteUser={requestDeleteUser}
        deleteUserBusy={deleteUserBusy}
      />

      <UserIdentityBlock
        t={t}
        draft={draft}
        setDraft={setDraft}
        roleOptions={roleOptions}
        rolesByKey={rolesByKey}
      />

      <UserSecurityBlock
        t={t}
        draft={draft}
        setDraft={setDraft}
        isCreate={isCreate}
        canBanUsers={canBanUsers}
      />

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
          onOpenActivityTarget={onOpenActivityTarget}
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
            {safeT(t, "postprod.users.form.create", "Créer utilisateur")}
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
      <UserDeleteDialog
        t={t}
        open={deleteDialogOpen}
        busy={deleteUserBusy}
        targetName={deleteUserTargetName}
        onCancel={cancelDeleteUser}
        onConfirm={confirmDeleteUser}
        confirmRef={deleteDialogConfirmRef}
      />
    </div>
  );
}

export { UserEditorPanel };
