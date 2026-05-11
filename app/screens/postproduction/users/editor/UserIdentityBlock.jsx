import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";

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

  return (
    <div className="uu-card mt-12">
      <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
        {safeT(t, "postprod.users.blocks.identity", "Informations utilisateur")}
      </h3>
      <div className="uu-grid-2 mt-8">
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.displayName", "Nom affiché")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="text"
            value={String(draft?.displayName || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), displayName: e.target.value }))}
          />
        </div>
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.role", "Role")}
          </label>
          <select
            className="uu-input"
            style={{ flex: 1 }}
            value={currentRole}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), role: e.target.value }))}
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
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.firstName", "Prenom")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="text"
            value={String(draft?.firstName || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), firstName: e.target.value }))}
          />
        </div>
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.lastName", "Nom")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="text"
            value={String(draft?.lastName || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), lastName: e.target.value }))}
          />
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.email1", "Email 1")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="email"
            value={String(draft?.email || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), email: e.target.value }))}
          />
        </div>
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.email2", "Email 2")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="email"
            value={String(draft?.email2 || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), email2: e.target.value }))}
          />
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.phone1", "Telephone 1")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="text"
            value={String(draft?.phone || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), phone: e.target.value }))}
          />
        </div>
        <div className="uu-grid-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label className="uu-label" style={{ width: "120px", minWidth: "120px", margin: 0 }}>
            {safeT(t, "postprod.users.form.phone2", "Telephone 2")}
          </label>
          <input
            className="uu-input"
            style={{ flex: 1 }}
            type="text"
            value={String(draft?.phone2 || "")}
            onChange={(e) => setDraft((prev) => ({ ...(prev || {}), phone2: e.target.value }))}
          />
        </div>
      </div>
      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.users.form.note", "Note visible par l'equipe")}</label>
        <textarea
          className="uu-input"
          rows={3}
          value={String(draft?.note || "")}
          onChange={(e) => setDraft((prev) => ({ ...(prev || {}), note: e.target.value }))}
          placeholder={safeT(t, "postprod.users.form.notePlaceholder", "Informations utiles partagees")}
        />
      </div>
    </div>
  );
}

export { UserIdentityBlock };
