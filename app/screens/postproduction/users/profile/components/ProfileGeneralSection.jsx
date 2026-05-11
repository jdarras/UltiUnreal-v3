import { safeT } from "../../../shared/helpers";
import { normalizeNotificationPrefsCategories } from "../../userSharedHelpers";

function ProfileGeneralSection({
  t,
  saving = false,
  displayName = "",
  setDisplayName = null,
  firstName = "",
  setFirstName = null,
  lastName = "",
  setLastName = null,
  email = "",
  setEmail = null,
  phone = "",
  setPhone = null,
  notificationPrefs = null,
  setNotificationPrefs = null,
  note = "",
  setNote = null,
  password = "",
  setPassword = null,
  user = null,
}) {
  return (
    <>
      <div className="uu-grid-field">
        <label className="uu-label">{safeT(t, "postprod.profile.form.displayName", "Nom affiché")}</label>
        <input
          className="uu-input"
          type="text"
          value={displayName}
          disabled={saving}
          onChange={(e) => setDisplayName?.(e.target.value)}
        />
      </div>

      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.firstName", "Prenom")}</label>
          <input
            className="uu-input"
            type="text"
            value={firstName}
            disabled={saving}
            onChange={(e) => setFirstName?.(e.target.value)}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.lastName", "Nom")}</label>
          <input
            className="uu-input"
            type="text"
            value={lastName}
            disabled={saving}
            onChange={(e) => setLastName?.(e.target.value)}
          />
        </div>
      </div>

      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.email", "Email")}</label>
          <input
            className="uu-input"
            type="email"
            value={email}
            disabled={saving}
            onChange={(e) => setEmail?.(e.target.value)}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.phone", "Telephone")}</label>
          <input
            className="uu-input"
            type="text"
            value={phone}
            disabled={saving}
            onChange={(e) => setPhone?.(e.target.value)}
          />
        </div>
      </div>

      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.profile.form.notificationPrefs", "Preferences notifications")}</label>
        <div className="uu-grid2 mt-8">
          <label className="uu-check">
            <input
              type="checkbox"
              checked={notificationPrefs?.email !== false}
              disabled={saving}
              onChange={(e) => setNotificationPrefs?.((prev) => ({ ...(prev || {}), email: e.target.checked }))}
            />
            <span>{safeT(t, "postprod.profile.form.notificationPrefs.email", "Email")}</span>
          </label>
          <label className="uu-check">
            <input
              type="checkbox"
              checked={notificationPrefs?.inApp !== false}
              disabled={saving}
              onChange={(e) => setNotificationPrefs?.((prev) => ({ ...(prev || {}), inApp: e.target.checked }))}
            />
            <span>{safeT(t, "postprod.profile.form.notificationPrefs.inApp", "In-app")}</span>
          </label>
        </div>
        <label className="uu-label mt-8">
          {safeT(t, "postprod.profile.form.notificationPrefs.categories", "Categories")}
        </label>
        <input
          className="uu-input"
          value={Array.isArray(notificationPrefs?.categories) ? notificationPrefs.categories.join(", ") : ""}
          disabled={saving}
          onChange={(e) => {
            const categories = normalizeNotificationPrefsCategories(e.target.value);
            setNotificationPrefs?.((prev) => ({ ...(prev || {}), categories }));
          }}
          placeholder={safeT(
            t,
            "postprod.profile.form.notificationPrefs.categoriesPlaceholder",
            "renders, tasks, sync"
          )}
        />
      </div>

      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.profile.form.note", "Note visible par l'equipe")}</label>
        <textarea
          className="uu-input"
          rows={3}
          value={note}
          disabled={saving}
          onChange={(e) => setNote?.(e.target.value)}
          placeholder={safeT(t, "postprod.profile.form.notePlaceholder", "Ex: preferences de contact, infos utiles")}
        />
      </div>

      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.password", "Nouveau mot de passe")}</label>
          <input
            className="uu-input"
            type="password"
            value={password}
            disabled={saving}
            onChange={(e) => setPassword?.(e.target.value)}
            placeholder={safeT(t, "postprod.profile.form.passwordPlaceholder", "Laisser vide pour ne pas changer")}
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "postprod.profile.form.profile", "Profil")}</label>
          <input
            className="uu-input"
            type="text"
            value={String(user?.profile || user?.role || "-")}
            disabled={true}
          />
        </div>
      </div>
    </>
  );
}

export { ProfileGeneralSection };
