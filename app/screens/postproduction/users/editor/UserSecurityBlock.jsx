import { useEffect, useState } from "react";
import { safeT } from "../../shared/helpers";

function UserSecurityBlock({
  t,
  draft = {},
  setDraft,
  isCreate = false,
  canBanUsers = false,
  selfProfile = false,
  onChangePassword = null,
}) {
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);

  function resetPwdInputs() {
    setChangeError("");
    setChangeSuccess(false);
  }

  useEffect(() => {
    setNewPwd("");
    setConfirmPwd("");
    setChangeBusy(false);
    setChangeError("");
    setChangeSuccess(false);
  }, [selfProfile, isCreate, draft?.username]);

  async function handleChangePassword() {
    setChangeError("");
    setChangeSuccess(false);
    if (newPwd.length < 4) {
      setChangeError(safeT(t, "postprod.users.error.invalidPassword", "Mot de passe invalide (minimum 4 caractères)."));
      return;
    }
    if (newPwd !== confirmPwd) {
      setChangeError(safeT(t, "postprod.profile.form.passwordMismatch", "Les mots de passe ne correspondent pas."));
      return;
    }
    if (typeof onChangePassword !== "function") return;
    setChangeBusy(true);
    try {
      await onChangePassword(newPwd);
      setNewPwd("");
      setConfirmPwd("");
      setChangeSuccess(true);
    } catch (e) {
      setChangeError(String(e?.message || safeT(t, "postprod.profile.form.passwordChangeFailed", "Échec du changement de mot de passe.")));
    } finally {
      setChangeBusy(false);
    }
  }

  if (selfProfile) {
    return (
      <div className="uu-card mt-12">
        <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
          {safeT(t, "postprod.users.blocks.security", "Mot de passe et securite")}
        </h3>
        <div
          className="uu-grid-field mt-8"
          style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
        >
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.profile.form.password", "Nouveau mot de passe")}
          </label>
          <input
            className="uu-input"
            type="password"
            style={{ maxWidth: 260, flex: "1 1 220px" }}
            value={newPwd}
            onChange={(e) => { setNewPwd(e.target.value); resetPwdInputs(); }}
            disabled={changeBusy}
            placeholder="••••••••"
          />
          <label className="uu-label" style={{ margin: 0 }}>
            {safeT(t, "postprod.profile.form.passwordConfirm", "Confirmer")}
          </label>
          <input
            className="uu-input"
            type="password"
            style={{ maxWidth: 260, flex: "1 1 220px" }}
            value={confirmPwd}
            onChange={(e) => { setConfirmPwd(e.target.value); resetPwdInputs(); }}
            disabled={changeBusy}
            placeholder="••••••••"
          />
          <button
            className="uu-btn"
            type="button"
            disabled={changeBusy || !newPwd || !confirmPwd}
            onClick={handleChangePassword}
          >
            {changeBusy
              ? safeT(t, "common.loading", "Chargement…")
              : safeT(t, "postprod.profile.form.passwordChange", "Modifier le mot de passe")}
          </button>
        </div>
        {changeError ? <div className="uu-msg warn mt-8">{changeError}</div> : null}
        {changeSuccess ? (
          <div className="uu-msg ok mt-8">
            {safeT(t, "postprod.profile.form.passwordChanged", "Mot de passe modifié.")}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="uu-card mt-12">
      <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
        {safeT(t, "postprod.users.blocks.security", "Mot de passe et securite")}
      </h3>
      {isCreate ? (
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
          />
        </div>
      ) : (
        <>
          <div
            className="uu-grid-field mt-8"
            style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
          >
            <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
              {safeT(t, "postprod.profile.form.password", "Nouveau mot de passe")}
            </label>
            <input
              className="uu-input"
              type="password"
              style={{ maxWidth: 260, flex: "1 1 220px" }}
              value={newPwd}
              onChange={(e) => { setNewPwd(e.target.value); resetPwdInputs(); }}
              disabled={changeBusy}
              placeholder="••••••••"
            />
            <label className="uu-label" style={{ margin: 0 }}>
              {safeT(t, "postprod.profile.form.passwordConfirm", "Confirmer")}
            </label>
            <input
              className="uu-input"
              type="password"
              style={{ maxWidth: 260, flex: "1 1 220px" }}
              value={confirmPwd}
              onChange={(e) => { setConfirmPwd(e.target.value); resetPwdInputs(); }}
              disabled={changeBusy}
              placeholder="••••••••"
            />
            <button
              className="uu-btn"
              type="button"
              disabled={changeBusy || !newPwd || !confirmPwd || typeof onChangePassword !== "function"}
              onClick={handleChangePassword}
            >
              {changeBusy
                ? safeT(t, "common.loading", "Chargement…")
                : safeT(t, "postprod.profile.form.passwordChange", "Modifier le mot de passe")}
            </button>
          </div>
          {changeError ? <div className="uu-msg warn mt-8">{changeError}</div> : null}
          {changeSuccess ? (
            <div className="uu-msg ok mt-8">
              {safeT(t, "postprod.profile.form.passwordChanged", "Mot de passe modifié.")}
            </div>
          ) : null}
        </>
      )}
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
