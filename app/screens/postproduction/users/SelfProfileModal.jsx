import { useEffect, useMemo, useRef, useState } from "react";
import { safeT } from "../shared/helpers";
import { UserEditorPanel } from "./components/UserEditorPanel";
import { useUserActivity } from "./hooks/useUserActivity";
import { useUserAvatarUpload } from "./hooks/useUserAvatarUpload";
import { resolveUserProfileLabel } from "./roleHelpers";
import { isUsableAvatarSrc, resolveAvatarInitials } from "./userSharedHelpers";

function SelfProfileModal({
  t,
  open = false,
  user = null,
  roles = [],
  saving = false,
  onClose = null,
  onUpdateMe = null,
  onLoadUserActivity = null,
  projects = [],
  projectsLoading = false,
}) {
  const [draft, setDraft] = useState({});
  const [editorAvatarError, setEditorAvatarError] = useState("");
  const [editorAvatarLoading, setEditorAvatarLoading] = useState(false);
  const editorAvatarInputRef = useRef(null);

  const rolesByKey = useMemo(() => {
    const map = new Map();
    for (const row of Array.isArray(roles) ? roles : []) {
      const key = String(row?.key || "").trim();
      if (key) map.set(key, row);
    }
    return map;
  }, [roles]);

  const roleOptions = useMemo(() => {
    const options = Array.from(rolesByKey.keys());
    const currentRole = String(user?.role || "").trim();
    if (currentRole && !options.includes(currentRole)) {
      options.push(currentRole);
    }
    return options;
  }, [rolesByKey, user?.role]);

  const { onSelectEditorAvatar } = useUserAvatarUpload({
    t,
    setDraft,
    setEditorAvatarError,
    setEditorAvatarLoading,
  });

  const userId = Number(user?.id || 0);

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
    loadUserActivity,
    editingActivities,
    filteredEditingActivities,
    editingSummary,
    editingTypeSummary,
  } = useUserActivity({ t, editingUserId: userId, onLoadUserActivity });

  const loadUserActivityRef = useRef(loadUserActivity);
  loadUserActivityRef.current = loadUserActivity;

  const projectOptions = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .map((project) => {
        const id = String(project?.id || "").trim();
        const name = String(project?.name || "").trim();
        const code = String(project?.code || "").trim();
        const ref = id || name || code;
        if (!ref) return null;
        return {
          ref,
          label: [code, name, id ? `[${id}]` : ""].filter(Boolean).join(" ").trim() || ref,
        };
      })
      .filter(Boolean);
  }, [projects]);

  useEffect(() => {
    if (!open) return;
    setDraft({
      displayName: String(user?.displayName || ""),
      firstName: String(user?.firstName || ""),
      lastName: String(user?.lastName || ""),
      email: String(user?.email || ""),
      email2: String(user?.email2 || ""),
      phone: String(user?.phone || ""),
      phone2: String(user?.phone2 || ""),
      role: String(user?.role || ""),
      employmentType: String(user?.employmentType || ""),
      language: String(user?.language || "fr"),
      note: String(user?.note || ""),
      avatarPath: String(user?.avatarPath || ""),
      password: "",
      mustChangePassword: user?.mustChangePassword === true,
      isActive: user?.isActive !== false,
    });
    setEditorAvatarError("");
    setEditorAvatarLoading(false);
  }, [open, userId]);

  useEffect(() => {
    if (open && userId > 0) {
      loadUserActivityRef.current(userId);
    }
  }, [open, userId]);

  if (!open) return null;

  const avatarPath = String(draft?.avatarPath || "");
  const editorAvatarSrc = isUsableAvatarSrc(avatarPath) ? avatarPath : "";
  const editorAvatarInitials = resolveAvatarInitials(
    String(draft?.displayName || ""),
    String(user?.username || "")
  );
  const selectedProfile = resolveUserProfileLabel(user, t, rolesByKey);
  const editingEntry = user && typeof user === "object" ? user : null;

  async function handleSubmit() {
    if (typeof onUpdateMe !== "function") return;
    await onUpdateMe({
      displayName: String(draft?.displayName || "").trim(),
      firstName: String(draft?.firstName || ""),
      lastName: String(draft?.lastName || ""),
      email: String(draft?.email || ""),
      email2: String(draft?.email2 || ""),
      phone: String(draft?.phone || ""),
      phone2: String(draft?.phone2 || ""),
      employmentType: String(draft?.employmentType || ""),
      language: String(draft?.language || "fr"),
      note: String(draft?.note || ""),
      avatarPath: String(draft?.avatarPath || ""),
      password: String(draft?.password || ""),
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        justifyContent: "center",
        overflowY: "auto",
        padding: "32px 16px 48px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px", alignSelf: "flex-start" }}>
        <UserEditorPanel
          t={t}
          usersLoading={saving}
          requestAutosaveOnBlur={null}
          closeEditor={onClose}
          editorAvatarSrc={editorAvatarSrc}
          editorAvatarInitials={editorAvatarInitials}
          draft={draft}
          selectedProfile={selectedProfile}
          editorAvatarInputRef={editorAvatarInputRef}
          editorAvatarLoading={editorAvatarLoading}
          onSelectEditorAvatar={onSelectEditorAvatar}
          onClearAvatar={() => setDraft((prev) => ({ ...(prev || {}), avatarPath: "" }))}
          editorAvatarPath={avatarPath}
          setDraft={setDraft}
          setEditorAvatarError={setEditorAvatarError}
          roleOptions={roleOptions}
          rolesByKey={rolesByKey}
          isCreate={false}
          canBanUsers={false}
          canDeleteUser={false}
          readOnlyFields={true}
          selfProfile={true}
          editingEntry={editingEntry}
          editingUserId={userId}
          projectsLoading={projectsLoading}
          projectOptions={projectOptions}
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
          activitySearchQuery={activitySearchQuery}
          setActivitySearchQuery={setActivitySearchQuery}
          activitySearchDebounceRef={activitySearchDebounceRef}
          loadUserActivity={loadUserActivity}
          editingSummary={editingSummary}
          editingTypeSummary={editingTypeSummary}
          editingActivities={editingActivities}
          filteredEditingActivities={filteredEditingActivities}
          onPurgeUserActivity={null}
          submitDisabled={saving}
        />
        <div className="uu-row mt-12" style={{ justifyContent: "flex-end" }}>
          <button
            className="uu-btn"
            type="button"
            disabled={saving}
            onClick={handleSubmit}
          >
            {safeT(t, "postprod.profile.form.save", "Enregistrer mon profil")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { SelfProfileModal };
export default SelfProfileModal;
