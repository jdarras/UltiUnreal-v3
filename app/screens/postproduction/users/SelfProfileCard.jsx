import { useEffect, useMemo, useRef, useState } from "react";
import { safeT } from "../shared/helpers";
import { UserEditorPanel } from "./components/UserEditorPanel";
import { useUserAvatarUpload } from "./hooks/useUserAvatarUpload";
import { useActivityFilters } from "./hooks/useActivityFilters";
import { resolveUserProfileLabel } from "./roleHelpers";
import {
  activityMatchesSearchQuery,
  activityMatchesSelectedType,
  getActivityTypeSummary,
  isUsableAvatarSrc,
  mapActivityActionTypeToApi,
  resolveAvatarInitials,
} from "./userSharedHelpers";

const SELF_PROFILE_SAVE_ROW_STYLE = { justifyContent: "flex-end" };

function SelfProfileCard({
  t,
  user = null,
  roles = [],
  saving = false,
  onUpdateMe = null,
  myActivity = [],
  myActivitySummary = null,
  myActivityLoading = false,
  myActivityError = "",
  onRefreshMyActivity = null,
  projects = [],
  projectsLoading = false,
}) {
  const [draft, setDraft] = useState({});
  const [_editorAvatarError, setEditorAvatarError] = useState("");
  const [editorAvatarLoading, setEditorAvatarLoading] = useState(false);
  const editorAvatarInputRef = useRef(null);
  const {
    activityFromAtLocal, setActivityFromAtLocal,
    activityToAtLocal, setActivityToAtLocal,
    activityActionType, setActivityActionType,
    activityProjectRef, setActivityProjectRef,
    activitySearchQuery, setActivitySearchQuery,
    activitySearchDebounceRef,
    buildActivityFilters,
  } = useActivityFilters({ mapActionType: mapActivityActionTypeToApi });

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
    if (currentRole && !options.includes(currentRole)) options.push(currentRole);
    return options;
  }, [rolesByKey, user?.role]);

  const { onSelectEditorAvatar } = useUserAvatarUpload({
    t,
    setDraft,
    setEditorAvatarError,
    setEditorAvatarLoading,
  });

  const userId = Number(user?.id || 0);

  const projectOptions = useMemo(() => {
    return (Array.isArray(projects) ? projects : [])
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

  const rawActivities = useMemo(() => (Array.isArray(myActivity) ? myActivity : []), [myActivity]);

  const typedActivities = useMemo(
    () => rawActivities.filter((item) => activityMatchesSelectedType(item, "all")),
    [rawActivities]
  );

  const filteredActivities = useMemo(
    () => typedActivities
      .filter((item) => activityMatchesSelectedType(item, activityActionType))
      .filter((item) => activityMatchesSearchQuery(item, activitySearchQuery)),
    [typedActivities, activityActionType, activitySearchQuery]
  );

  const editingSummary = useMemo(() => {
    if (myActivitySummary && typeof myActivitySummary === "object") return myActivitySummary;
    return {
      total: typedActivities.length,
      projects: Array.from(
        typedActivities.reduce((acc, item) => {
          for (const ref of (Array.isArray(item?.projectRefs) ? item.projectRefs : [])) {
            const n = String(ref || "").trim();
            if (n) acc.add(n);
          }
          return acc;
        }, new Set())
      ),
    };
  }, [myActivitySummary, typedActivities]);

  const editingTypeSummary = useMemo(
    () => getActivityTypeSummary(editingSummary, typedActivities),
    [editingSummary, typedActivities]
  );

  function handleLoadActivity(_, filterOverrides = {}) {
    onRefreshMyActivity?.(buildActivityFilters(filterOverrides));
  }

  useEffect(() => {
    setDraft({
      displayName: String(user?.displayName || ""),
      firstName: String(user?.firstName || ""),
      lastName: String(user?.lastName || ""),
      email: String(user?.email || ""),
      email2: String(user?.email2 || ""),
      phone: String(user?.phone || ""),
      phone2: String(user?.phone2 || ""),
      role: String(user?.role || ""),
      note: String(user?.note || ""),
      avatarPath: String(user?.avatarPath || ""),
      password: "",
      mustChangePassword: user?.mustChangePassword === true,
      isActive: user?.isActive !== false,
    });
    setEditorAvatarError("");
    setEditorAvatarLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- brouillon réinitialisé seulement quand un autre utilisateur est affiché (préserve la saisie)
  }, [userId]);

  const avatarPath = String(draft?.avatarPath || "");
  const editorAvatarSrc = isUsableAvatarSrc(avatarPath) ? avatarPath : "";
  const editorAvatarInitials = resolveAvatarInitials(
    String(draft?.displayName || ""),
    String(user?.username || "")
  );
  const selectedProfile = resolveUserProfileLabel(user, t, rolesByKey);
  const editingEntry = user && typeof user === "object" ? user : null;

  function buildProfilePayload() {
    return {
      displayName: String(draft?.displayName || "").trim(),
      firstName: String(draft?.firstName || ""),
      lastName: String(draft?.lastName || ""),
      email: String(draft?.email || ""),
      email2: String(draft?.email2 || ""),
      phone: String(draft?.phone || ""),
      phone2: String(draft?.phone2 || ""),
      note: String(draft?.note || ""),
      avatarPath: String(draft?.avatarPath || ""),
    };
  }

  async function handleSubmit() {
    if (typeof onUpdateMe !== "function") return;
    await onUpdateMe({ ...buildProfilePayload(), password: "" });
  }

  async function handleChangePassword(newPassword) {
    if (typeof onUpdateMe !== "function") return;
    await onUpdateMe({ ...buildProfilePayload(), password: newPassword });
  }

  return (
    <section className="uu-section">
      <UserEditorPanel
        t={t}
        usersLoading={saving}
        requestAutosaveOnBlur={null}
        closeEditor={null}
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
        activityLoading={myActivityLoading}
        activityError={myActivityError}
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
        loadUserActivity={handleLoadActivity}
        editingSummary={editingSummary}
        editingTypeSummary={editingTypeSummary}
        editingActivities={typedActivities}
        filteredEditingActivities={filteredActivities}
        onPurgeUserActivity={null}
        submitDisabled={saving}
        onChangePassword={handleChangePassword}
      />
      <div className="uu-row mt-12" style={SELF_PROFILE_SAVE_ROW_STYLE}>
        <button
          className="uu-btn"
          type="button"
          disabled={saving}
          onClick={handleSubmit}
        >
          {safeT(t, "postprod.profile.form.save", "Enregistrer mon profil")}
        </button>
      </div>
    </section>
  );
}

export { SelfProfileCard };
export default SelfProfileCard;
