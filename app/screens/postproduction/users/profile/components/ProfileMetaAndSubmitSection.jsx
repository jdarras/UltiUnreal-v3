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
        <span>
          <span className="uu-muted">{safeT(t, "postprod.profile.meta.createdAt.label", "Créé le")}:</span>{" "}
          {formatDate(user?.createdAt)}
        </span>
        <span>
          <span className="uu-muted">{safeT(t, "postprod.profile.meta.updatedAt.label", "Mis à jour")}:</span>{" "}
          {formatDate(user?.updatedAt)}
        </span>
        <span>
          <span className="uu-muted">{safeT(t, "postprod.profile.meta.lastLoginAt.label", "Dernière connexion")}:</span>{" "}
          {formatDate(user?.lastLoginAt)}
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
