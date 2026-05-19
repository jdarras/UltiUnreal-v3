import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";

const IDENTITY_BLOCK_TITLE_STYLE = { margin: 0 };
const IDENTITY_INLINE_FIELD_STYLE = { display: "flex", alignItems: "center", gap: "10px" };
const IDENTITY_INPUT_FLEX_STYLE = { flex: 1 };

function UserIdentityBlock({
  t,
  draft = {},
  setDraft,
  roleOptions = [],
  rolesByKey = new Map(),
  readOnlyFields = false,
}) {
  const currentRole = String(draft?.role || "").trim();
  const effectiveRoleOptions = Array.isArray(roleOptions) ? [...roleOptions] : [];
  if (currentRole && !effectiveRoleOptions.includes(currentRole)) {
    effectiveRoleOptions.push(currentRole);
  }
  const updateDraftField = (fieldName) => (e) =>
    setDraft((prev) => ({ ...(prev || {}), [fieldName]: e.target.value }));

  return (
    <div className="uu-card mt-12">
      <h3 className="uu-h3 uu-block-title" style={IDENTITY_BLOCK_TITLE_STYLE}>
        {safeT(t, "postprod.users.blocks.identity", "Informations utilisateur")}
      </h3>
      <div className="uu-grid-2 mt-8">
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.displayName", "Nom affiché")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="text"
            value={String(draft?.displayName || "")}
            onChange={updateDraftField("displayName")}
          />
        </div>
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.role", "Role")}
          </label>
          <select
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            value={currentRole}
            onChange={updateDraftField("role")}
            disabled={effectiveRoleOptions.length === 0 || readOnlyFields}
          >
            {effectiveRoleOptions.map((roleName) => (
              <option key={roleName} value={roleName}>
                {roleLabel(t, roleName, rolesByKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.firstName", "Prenom")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="text"
            value={String(draft?.firstName || "")}
            onChange={updateDraftField("firstName")}
          />
        </div>
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.lastName", "Nom")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="text"
            value={String(draft?.lastName || "")}
            onChange={updateDraftField("lastName")}
          />
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.email1", "Email 1")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="email"
            value={String(draft?.email || "")}
            onChange={updateDraftField("email")}
          />
        </div>
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.email2", "Email 2")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="email"
            value={String(draft?.email2 || "")}
            onChange={updateDraftField("email2")}
          />
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.phone1", "Telephone 1")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="text"
            value={String(draft?.phone || "")}
            onChange={updateDraftField("phone")}
          />
        </div>
        <div className="uu-grid-field" style={IDENTITY_INLINE_FIELD_STYLE}>
          <label className="uu-label uu-label-fixed-120">
            {safeT(t, "postprod.users.form.phone2", "Telephone 2")}
          </label>
          <input
            className="uu-input"
            style={IDENTITY_INPUT_FLEX_STYLE}
            type="text"
            value={String(draft?.phone2 || "")}
            onChange={updateDraftField("phone2")}
          />
        </div>
      </div>
      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.users.form.note", "Note visible par l'equipe")}</label>
        <textarea
          className="uu-input"
          rows={3}
          value={String(draft?.note || "")}
          onChange={updateDraftField("note")}
          placeholder={safeT(t, "postprod.users.form.notePlaceholder", "Informations utiles partagees")}
        />
      </div>
    </div>
  );
}

export { UserIdentityBlock };

