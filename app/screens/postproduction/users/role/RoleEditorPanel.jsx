import { safeT } from "../../shared/helpers";
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
  onOpenUser = null,
  submitDisabled = false,
  submitEditor,
  displayNameInvalid = false,
  saveNow = null,
  roleAutosaveBusy: _roleAutosaveBusy = false,
  roleAutosaveError: _roleAutosaveError = "",
  roleAutosaveInfo: _roleAutosaveInfo = "",
}) {
  return (
    <>
      <div className="uu-card mt-12">
        <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h4 className="uu-h3 uu-block-title">
            {isCreate
              ? safeT(t, "postprod.roles.form.createTitle", "Ajouter un profil")
              : safeT(t, "postprod.roles.form.editTitle", "Modifier profil")}
          </h4>
          <button className="uu-btn-ghost" type="button" onClick={closeEditor} disabled={rolesLoading}>
            {safeT(t, "postprod.roles.form.cancel", "Retour liste")}
          </button>
        </div>

        <div className="uu-row uu-binding-row mt-12">
          <label className="uu-label">{safeT(t, "postprod.roles.form.displayName", "Nom affiché")}</label>
          <input
            className={`uu-input${displayNameInvalid ? " uu-input-invalid" : ""}`}
            type="text"
            value={String(draft?.displayName || "")}
            onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), displayName: e.target.value }))}
            onBlur={() => saveNow?.()}
          />
        </div>

        <div className="uu-grid-field mt-12">
          <label className="uu-label">{safeT(t, "postprod.roles.form.note", "Note")}</label>
          <textarea
            className="uu-input"
            rows={3}
            value={String(draft?.note || "")}
            onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), note: e.target.value }))}
            onBlur={() => saveNow?.()}
            placeholder={safeT(t, "postprod.roles.form.notePlaceholder", "Informations internes sur ce profil")}
          />
        </div>

        <RolePermissionFlags
          t={t}
          draft={draft}
          setDraft={setDraft}
          rolesLoading={rolesLoading}
          editorManageableCandidates={editorManageableCandidates}
          toggleDraftManageable={toggleDraftManageable}
        />

        {isCreate ? (
          <div className="uu-row mt-12" style={{ justifyContent: "flex-end" }}>
            <button
              className="uu-btn"
              type="button"
              disabled={submitDisabled}
              onClick={() => submitEditor?.()}
            >
              {safeT(t, "postprod.roles.form.create", "Créer profil")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="uu-card mt-12">
        <RoleUsersSection
          t={t}
          roleUsersKey={roleUsersKey}
          usersForRole={usersForRole}
          onOpenUser={onOpenUser}
        />
      </div>
    </>
  );
}

export { RoleEditorPanel };
