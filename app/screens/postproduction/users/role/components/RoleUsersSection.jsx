import { safeT } from "../../../shared/helpers";
import { resolveUserDisplayName } from "../../roleHelpers";

function RoleUsersSection({
  t,
  roleUsersKey = "",
  usersForRole = [],
} = {}) {
  return (
    <div className="mt-12">
      <div className="uu-label" style={{ marginBottom: "6px" }}>
        {safeT(t, "postprod.roles.users.title", "Utilisateurs de ce profil")}
      </div>
      {!String(roleUsersKey || "").trim() ? (
        <div className="uu-muted">
          {safeT(t, "postprod.roles.users.hint", "Renseigne le nom du profil pour visualiser les utilisateurs associes.")}
        </div>
      ) : usersForRole.length === 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.roles.users.empty", "Aucun utilisateur sur ce profil.")}
        </div>
      ) : (
        <div className="uu-col">
          {usersForRole.map((entry) => {
            const entryId = Number(entry?.id || 0);
            const isActive = entry?.isActive !== false;
            const entryDisplayName = resolveUserDisplayName(entry);
            return (
              <div key={entryId} className="uu-card">
                <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{entryDisplayName}</div>
                    <div className="uu-muted">
                      {safeT(t, "postprod.users.meta.email", "Email: {value}", {
                        value: String(entry?.email || "-"),
                      })}
                    </div>
                  </div>
                  <span className={`uu-msg ${isActive ? "ok" : "warn"}`}>
                    {isActive
                      ? safeT(t, "postprod.users.status.active", "Disponible")
                      : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { RoleUsersSection };
export default RoleUsersSection;
