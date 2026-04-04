import { formatDate, safeT } from "../../../shared/helpers";

function ProfileMetaAndSubmitSection({
  t,
  user = null,
  saving = false,
  error = "",
  onSubmit = null,
}) {
  return (
    <>
      <div className="uu-row mt-12">
        <span className="uu-muted">
          {safeT(t, "postprod.profile.meta.createdAt", "Cree le: {value}", {
            value: formatDate(user?.createdAt),
          })}
        </span>
        <span className="uu-muted">
          {safeT(t, "postprod.profile.meta.updatedAt", "Mis a jour: {value}", {
            value: formatDate(user?.updatedAt),
          })}
        </span>
        <span className="uu-muted">
          {safeT(t, "postprod.profile.meta.lastLoginAt", "Derniere connexion: {value}", {
            value: formatDate(user?.lastLoginAt),
          })}
        </span>
      </div>

      <div className="mt-12">
        <button
          className="uu-btn"
          type="button"
          disabled={saving}
          onClick={() => {
            onSubmit?.();
          }}
        >
          {safeT(t, "postprod.profile.form.save", "Enregistrer mon profil")}
        </button>
      </div>

      {error ? <div className="uu-msg error mt-12">{error}</div> : null}
    </>
  );
}

export { ProfileMetaAndSubmitSection };
