import { safeT } from "../../shared/helpers";
import { RoleManageableRolesSection } from "./components/RoleManageableRolesSection";
import { RolePermissionFlags } from "./components/RolePermissionFlags";
import { RoleUsersSection } from "./components/RoleUsersSection";

function RoleEditorPanel({
  t,
  isCreate = false,
  rolesLoading = false,
  closeEditor,
  draft = {},
  setDraft,
  editorManageableCandidates = [],
  toggleDraftManageable,
  roleUsersKey = "",
  usersForRole = [],
  submitDisabled = false,
  submitEditor,
  roleAutosaveBusy = false,
  roleAutosaveError = "",
  roleAutosaveInfo = "",
}) {
  return (
    <div className="uu-card mt-12">
      <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h4 className="uu-h3">
          {isCreate
            ? safeT(t, "postprod.roles.form.createTitle", "Ajouter un profil")
            : safeT(t, "postprod.roles.form.editTitle", "Modifier profil")}
        </h4>
        <button className="uu-btn-ghost" type="button" onClick={closeEditor} disabled={rolesLoading}>
          {safeT(t, "postprod.roles.form.cancel", "Retour liste")}
        </button>
      </div>

      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.roles.form.displayName", "Nom affiche")}</label>
        <input
          className="uu-input"
          type="text"
          value={String(draft?.displayName || "")}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), displayName: e.target.value }))}
        />
      </div>

      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.roles.form.note", "Note")}</label>
        <textarea
          className="uu-input"
          rows={3}
          value={String(draft?.note || "")}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), note: e.target.value }))}
          placeholder={safeT(t, "postprod.roles.form.notePlaceholder", "Informations internes sur ce profil")}
        />
      </div>

      <RolePermissionFlags
        t={t}
        draft={draft}
        setDraft={setDraft}
        rolesLoading={rolesLoading}
      />

      <RoleManageableRolesSection
        t={t}
        draft={draft}
        rolesLoading={rolesLoading}
        editorManageableCandidates={editorManageableCandidates}
        toggleDraftManageable={toggleDraftManageable}
      />

      <RoleUsersSection
        t={t}
        roleUsersKey={roleUsersKey}
        usersForRole={usersForRole}
      />

      {isCreate ? (
        <div className="uu-row mt-12" style={{ justifyContent: "flex-end" }}>
          <button
            className="uu-btn"
            type="button"
            disabled={submitDisabled}
            onClick={() => submitEditor?.()}
          >
            {safeT(t, "postprod.roles.form.create", "Creer profil")}
          </button>
        </div>
      ) : (
        <>
          {roleAutosaveBusy ? <div className="uu-muted mt-12">{safeT(t, "common.loading", "Chargement…")}</div> : null}
          {roleAutosaveError ? <div className="uu-msg warn mt-12">{roleAutosaveError}</div> : null}
          {!roleAutosaveBusy && !roleAutosaveError && roleAutosaveInfo ? (
            <div className="uu-msg ok mt-12">{roleAutosaveInfo}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

export { RoleEditorPanel };
