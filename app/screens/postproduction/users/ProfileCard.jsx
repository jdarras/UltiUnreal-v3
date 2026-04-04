import { useEffect, useMemo, useRef, useState } from "react";
import {
  fromDateTimeLocalToIso,
} from "../shared/helpers";
import { ProfileDetailsForm } from "./profile/ProfileDetailsForm";
import { ProfileActivityPanel } from "./profile/ProfileActivityPanel";
import {
  DEFAULT_NOTIFICATION_PREFS,
  activityMatchesSearchQuery,
  avatarErrorMessage,
  buildAvatarDataUrlFromFile,
  getActivityTypeSummary,
  isUsableAvatarSrc,
  parseNotificationPrefs,
  resolveAvatarInitials,
} from "./userSharedHelpers";

function ProfileCard({
  t,
  user = null,
  appLang = "fr",
  onChangeAppLanguage = null,
  saving = false,
  error = "",
  projects = [],
  projectsLoading = false,
  myActivity = [],
  myActivitySummary = null,
  activityLoading = false,
  activityError = "",
  onRefreshActivity = null,
  onUpdateMe = null,
}) {
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [note, setNote] = useState("");
  const [notificationPrefs, setNotificationPrefs] = useState(() => parseNotificationPrefs(DEFAULT_NOTIFICATION_PREFS));
  const [password, setPassword] = useState("");
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarInputRef = useRef(null);
  const activitySearchDebounceRef = useRef(null);
  const [activityFromAtLocal, setActivityFromAtLocal] = useState("");
  const [activityToAtLocal, setActivityToAtLocal] = useState("");
  const [activityActionType, setActivityActionType] = useState("all");
  const [activityProjectRef, setActivityProjectRef] = useState("");
  const [activitySearchQuery, setActivitySearchQuery] = useState("");

  useEffect(() => {
    setDisplayName(String(user?.displayName || ""));
    setFirstName(String(user?.firstName || ""));
    setLastName(String(user?.lastName || ""));
    setEmail(String(user?.email || ""));
    setPhone(String(user?.phone || ""));
    setEmploymentType(String(user?.employmentType || ""));
    setNote(String(user?.note || ""));
    const rawPrefsJson = String(user?.notificationPrefsJson || "").trim();
    setNotificationPrefs(parseNotificationPrefs(rawPrefsJson || user?.notificationPreferences || DEFAULT_NOTIFICATION_PREFS));
    setAvatarPath(String(user?.avatarPath || ""));
    setAvatarError("");
    setAvatarLoading(false);
    setPassword("");
    setActivityFromAtLocal("");
    setActivityToAtLocal("");
    setActivityActionType("all");
    setActivityProjectRef("");
    setActivitySearchQuery("");
    if (activitySearchDebounceRef.current) {
      clearTimeout(activitySearchDebounceRef.current);
      activitySearchDebounceRef.current = null;
    }
  }, [user]);

  useEffect(() => (
    () => {
      if (activitySearchDebounceRef.current) {
        clearTimeout(activitySearchDebounceRef.current);
        activitySearchDebounceRef.current = null;
      }
    }
  ), []);

  const activityItems = Array.isArray(myActivity) ? myActivity : [];
  const activitySummary = myActivitySummary && typeof myActivitySummary === "object"
    ? myActivitySummary
    : { total: activityItems.length, projects: [], byType: { auth: 0, task: 0, render: 0, sync: 0, other: 0 } };
  const activityTypeSummary = useMemo(
    () => getActivityTypeSummary(activitySummary, activityItems),
    [activitySummary, activityItems]
  );
  const filteredActivityItems = useMemo(
    () => activityItems.filter((item) => activityMatchesSearchQuery(item, activitySearchQuery)),
    [activityItems, activitySearchQuery]
  );
  const activityProjectOptions = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .map((project) => {
        const id = String(project?.id || "").trim();
        const name = String(project?.name || "").trim();
        const code = String(project?.code || "").trim();
        const usageMode = String(project?.usageMode || project?.metaUsageMode || "").trim();
        const ref = id || name || code;
        if (!ref) return null;
        return {
          ref,
          usageMode,
          label: [code, name, id ? `[${id}]` : ""].filter(Boolean).join(" ").trim() || ref,
        };
      })
      .filter((project) => project && project.usageMode === "auto_render")
      .sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || "")));
  }, [projects]);
  const profileInitials = resolveAvatarInitials(displayName, user?.username);
  const avatarSrc = isUsableAvatarSrc(avatarPath) ? String(avatarPath || "").trim() : "";

  async function onSelectAvatarFile(event) {
    const file = event?.target?.files?.[0] || null;
    if (event?.target) {
      event.target.value = "";
    }
    if (!file) return;
    setAvatarError("");
    setAvatarLoading(true);
    try {
      const dataUrl = await buildAvatarDataUrlFromFile(file);
      setAvatarPath(dataUrl);
    } catch (err) {
      setAvatarError(avatarErrorMessage(t, err));
    } finally {
      setAvatarLoading(false);
    }
  }

  function buildActivityFilters(overrides = {}) {
    const fromAtLocal = String(overrides?.fromAtLocal ?? activityFromAtLocal ?? "").trim();
    const toAtLocal = String(overrides?.toAtLocal ?? activityToAtLocal ?? "").trim();
    const actionType = String(overrides?.actionType ?? activityActionType ?? "all").trim().toLowerCase();
    const projectRef = String(overrides?.projectRef ?? activityProjectRef ?? "").trim();
    const searchQuery = String(overrides?.searchQuery ?? activitySearchQuery ?? "").trim();
    return {
      fromAt: fromAtLocal ? fromDateTimeLocalToIso(fromAtLocal) : "",
      toAt: toAtLocal ? fromDateTimeLocalToIso(toAtLocal) : "",
      actionType: actionType || "all",
      projectRef: projectRef || "",
      searchQuery,
    };
  }

  return (
    <section className="uu-section">
      <ProfileDetailsForm
        t={t}
        user={user}
        appLang={appLang}
        onChangeAppLanguage={onChangeAppLanguage}
        saving={saving}
        error={error}
        displayName={displayName}
        setDisplayName={setDisplayName}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        employmentType={employmentType}
        setEmploymentType={setEmploymentType}
        note={note}
        setNote={setNote}
        notificationPrefs={notificationPrefs}
        setNotificationPrefs={setNotificationPrefs}
        password={password}
        setPassword={setPassword}
        avatarPath={avatarPath}
        setAvatarPath={setAvatarPath}
        avatarError={avatarError}
        setAvatarError={setAvatarError}
        avatarLoading={avatarLoading}
        avatarInputRef={avatarInputRef}
        avatarSrc={avatarSrc}
        profileInitials={profileInitials}
        onSelectAvatarFile={onSelectAvatarFile}
        onUpdateMe={onUpdateMe}
      />

      <ProfileActivityPanel
        t={t}
        saving={saving}
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
        activityProjectOptions={activityProjectOptions}
        activitySearchQuery={activitySearchQuery}
        setActivitySearchQuery={setActivitySearchQuery}
        activitySearchDebounceRef={activitySearchDebounceRef}
        onRefreshActivity={onRefreshActivity}
        buildActivityFilters={buildActivityFilters}
        activitySummary={activitySummary}
        activityTypeSummary={activityTypeSummary}
        activityItems={activityItems}
        filteredActivityItems={filteredActivityItems}
      />
    </section>
  );
}


export { ProfileCard };
export default ProfileCard;
