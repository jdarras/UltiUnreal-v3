import { safeT } from "../../shared/helpers";
import { buildProfileUpdatePayload } from "./buildProfileUpdatePayload";
import { ProfileAvatarSection } from "./components/ProfileAvatarSection";
import { ProfileGeneralSection } from "./components/ProfileGeneralSection";
import { ProfileMetaAndSubmitSection } from "./components/ProfileMetaAndSubmitSection";

function ProfileDetailsForm({
  t,
  user = null,
  appLang = "fr",
  onChangeAppLanguage = null,
  saving = false,
  error = "",
  displayName = "",
  setDisplayName,
  firstName = "",
  setFirstName,
  lastName = "",
  setLastName,
  email = "",
  setEmail,
  phone = "",
  setPhone,
  employmentType = "",
  setEmploymentType,
  note = "",
  setNote,
  notificationPrefs = null,
  setNotificationPrefs,
  password = "",
  setPassword,
  avatarPath = "",
  setAvatarPath,
  avatarError = "",
  setAvatarError,
  avatarLoading = false,
  avatarInputRef = null,
  avatarSrc = "",
  profileInitials = "",
  onSelectAvatarFile = null,
  onUpdateMe = null,
}) {
  return (
    <>
      <h3 className="uu-h3">{safeT(t, "postprod.profile.title", "Mon profil")}</h3>
      <p className="uu-muted" style={{ marginTop: "8px", marginBottom: "12px" }}>
        {safeT(t, "postprod.profile.subtitle", "Modifie ton profil, mot de passe et tes informations de contact.")}
      </p>

      <ProfileAvatarSection
        t={t}
        saving={saving}
        avatarLoading={avatarLoading}
        avatarInputRef={avatarInputRef}
        avatarSrc={avatarSrc}
        profileInitials={profileInitials}
        onSelectAvatarFile={onSelectAvatarFile}
        setAvatarPath={setAvatarPath}
        setAvatarError={setAvatarError}
        avatarPath={avatarPath}
        avatarError={avatarError}
      />

      <ProfileGeneralSection
        t={t}
        saving={saving}
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
        appLang={appLang}
        onChangeAppLanguage={onChangeAppLanguage}
        notificationPrefs={notificationPrefs}
        setNotificationPrefs={setNotificationPrefs}
        note={note}
        setNote={setNote}
        password={password}
        setPassword={setPassword}
        user={user}
      />

      <ProfileMetaAndSubmitSection
        t={t}
        user={user}
        saving={saving}
        error={error}
        onSubmit={() => {
          const payload = buildProfileUpdatePayload({
            displayName,
            firstName,
            lastName,
            email,
            phone,
            employmentType,
            note,
            avatarPath,
            appLang,
            notificationPrefs,
            password,
          });
          onUpdateMe?.(payload);
        }}
      />
    </>
  );
}

export { ProfileDetailsForm };
