import { safeT } from "../../shared/helpers";

function UserSecurityBlock({
  t,
  draft = {},
  setDraft,
  isCreate = false,
  canBanUsers = false,
}) {
  return (
    <div className="uu-card mt-12">
      <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
        {safeT(t, "postprod.users.blocks.security", "Mot de passe et securite")}
      </h3>
      <div className="uu-grid-field mt-8" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
          {safeT(t, "postprod.users.form.password", "Mot de passe")}
        </label>
        <input
          className="uu-input"
          type="password"
          style={{ maxWidth: 260 }}
          value={String(draft?.password || "")}
          onChange={(e) => setDraft((prev) => ({ ...(prev || {}), password: e.target.value }))}
          placeholder={!isCreate
            ? safeT(t, "postprod.users.form.passwordOptional", "Laisser vide pour ne pas changer")
            : undefined}
        />
      </div>
      <label className="uu-check mt-12">
        <input
          type="checkbox"
          checked={draft?.mustChangePassword === true}
          onChange={(e) => setDraft((prev) => ({ ...(prev || {}), mustChangePassword: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.users.form.mustChangePassword", "Doit changer le mot de passe")}</span>
      </label>
      {!isCreate && canBanUsers ? (
        <label className="uu-check mt-12">
          <input
            type="checkbox"
            checked={draft?.isActive !== false}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), isActive: e.target.checked }))}
          />
          <span>{safeT(t, "postprod.users.form.isActive", "Compte disponible")}</span>
        </label>
      ) : null}
    </div>
  );
}

export { UserSecurityBlock };
