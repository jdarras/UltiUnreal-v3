import { safeT } from "../../../shared/helpers";
import { resolveUserDisplayName } from "../../roleHelpers";
import { isUsableAvatarSrc, resolveAvatarInitials } from "../../userSharedHelpers";

function RoleUsersSection({
  t,
  roleUsersKey = "",
  usersForRole = [],
  onOpenUser = null,
} = {}) {
  return (
    <div>
      <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "6px" }}>
        {safeT(t, "postprod.roles.users.title", "Utilisateurs de ce profil")}
      </h4>
      {!String(roleUsersKey || "").trim() ? (
        <div className="uu-muted">
          {safeT(t, "postprod.roles.users.hint", "Renseigne le nom du profil pour visualiser les utilisateurs associes.")}
        </div>
      ) : usersForRole.length === 0 ? (
        <div className="uu-muted">
          {safeT(t, "postprod.roles.users.empty", "Aucun utilisateur sur ce profil.")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
          {usersForRole.map((entry) => {
            const entryId = Number(entry?.id || 0);
            const isActive = entry?.isActive !== false;
            const rowDisplayName = resolveUserDisplayName(entry);
            const rowFirstName = String(entry?.firstName || "").trim();
            const rowLastName = String(entry?.lastName || "").trim();
            const rowNameLine = `${rowFirstName} ${rowLastName}`.trim() || "-";
            const rowPhone1 = String(entry?.phone1 || entry?.phone || entry?.mobilePhone || "").trim();
            const rowEmail1 = String(entry?.email || "").trim();
            const rowAvatarPath = String(entry?.avatarPath || "").trim();
            const rowAvatarSrc = isUsableAvatarSrc(rowAvatarPath) ? rowAvatarPath : "";
            const rowAvatarInitials = resolveAvatarInitials(rowDisplayName, entry?.username);

            const openMailCompose = () => {
              if (!rowEmail1) return;
              const href = `mailto:${rowEmail1}`;
              if (typeof window !== "undefined" && typeof window.electron?.openExternal === "function") {
                window.electron.openExternal(href);
                return;
              }
              if (typeof window !== "undefined" && typeof window.open === "function") {
                window.open(href, "_blank", "noopener,noreferrer");
              }
            };

            return (
              <div key={entryId} className="uu-card">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px minmax(0, 1fr)",
                    columnGap: "12px",
                    rowGap: "8px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "1px solid var(--uu-border, #ddd)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--uu-surface-soft, #f3f3f3)",
                      fontWeight: 700,
                      userSelect: "none",
                      flex: "0 0 auto",
                    }}
                  >
                    {rowAvatarSrc ? (
                      <img
                        src={rowAvatarSrc}
                        alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span>{rowAvatarInitials}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="uu-row" style={{ alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--uu-fg, #fff)",
                        }}
                      >
                        {rowDisplayName}
                      </div>
                      <span
                        title={isActive
                          ? safeT(t, "postprod.users.status.active", "Disponible")
                          : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                        aria-label={isActive
                          ? safeT(t, "postprod.users.status.active", "Disponible")
                          : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "999px",
                          background: isActive ? "#22c55e" : "#ef4444",
                          flex: "0 0 auto",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--uu-fg, #fff)",
                      }}
                    >
                      {rowNameLine}
                    </div>
                  </div>

                  <div
                    className="uu-muted"
                    title={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
                    aria-label={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
                    style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                  >
                    ☎
                  </div>
                  <div style={{ color: "var(--uu-fg, #fff)", minWidth: 0, wordBreak: "break-word" }}>
                    {rowPhone1 || "-"}
                  </div>

                  <div
                    className="uu-muted"
                    title={safeT(t, "postprod.users.form.email1", "Email 1")}
                    aria-label={safeT(t, "postprod.users.form.email1", "Email 1")}
                    style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                  >
                    ✉
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {rowEmail1 ? (
                      <button
                        type="button"
                        className="uu-link"
                        style={{
                          padding: 0,
                          color: "var(--uu-fg, #fff)",
                          display: "inline-block",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          verticalAlign: "bottom",
                        }}
                        onClick={openMailCompose}
                        title={safeT(t, "postprod.users.action.writeMail", "Ecrire un email")}
                      >
                        {rowEmail1}
                      </button>
                    ) : (
                      <span style={{ color: "var(--uu-fg, #fff)" }}>-</span>
                    )}
                  </div>

                  {onOpenUser ? (
                    <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="uu-btn-ghost"
                        onClick={() => onOpenUser(entry)}
                        title={safeT(t, "postprod.roles.users.openUser", "Ouvrir la fiche utilisateur")}
                      >
                        {safeT(t, "postprod.roles.users.openUser", "Ouvrir")}
                      </button>
                    </div>
                  ) : null}
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
