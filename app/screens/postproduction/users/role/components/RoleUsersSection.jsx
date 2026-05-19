import { safeT } from "../../../shared/helpers";
import { resolveUserDisplayName } from "../../roleHelpers";
import { isUsableAvatarSrc, resolveAvatarInitials } from "../../userSharedHelpers";

const ROLE_USERS_TITLE_STYLE = { marginBottom: "6px" };
const ROLE_USERS_GRID_STYLE = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" };
const ROLE_USER_CARD_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "96px minmax(0, 1fr)",
  columnGap: "12px",
  rowGap: "8px",
  alignItems: "center",
};
const ROLE_USER_AVATAR_STYLE = {
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
};
const ROLE_USER_AVATAR_IMAGE_STYLE = { width: "100%", height: "100%", objectFit: "cover" };
const ROLE_USER_MIN_WIDTH_STYLE = { minWidth: 0 };
const ROLE_USER_NAME_ROW_STYLE = { alignItems: "center", gap: "8px", minWidth: 0 };
const ROLE_USER_DISPLAY_NAME_STYLE = {
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--uu-fg, #fff)",
};
const ROLE_USER_STATUS_DOT_STYLE = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  flex: "0 0 auto",
};
const ROLE_USER_STATUS_DOT_ACTIVE_STYLE = {
  ...ROLE_USER_STATUS_DOT_STYLE,
  background: "#22c55e",
};
const ROLE_USER_STATUS_DOT_INACTIVE_STYLE = {
  ...ROLE_USER_STATUS_DOT_STYLE,
  background: "#ef4444",
};
const ROLE_USER_NAME_LINE_STYLE = {
  marginTop: "2px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--uu-fg, #fff)",
};
const ROLE_USER_ICON_STYLE = { display: "flex", justifyContent: "center", alignItems: "center" };
const ROLE_USER_VALUE_STYLE = { color: "var(--uu-fg, #fff)", minWidth: 0, wordBreak: "break-word" };
const ROLE_USER_EMAIL_BUTTON_STYLE = {
  padding: 0,
  color: "var(--uu-fg, #fff)",
  display: "inline-block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  verticalAlign: "bottom",
};
const ROLE_USER_TEXT_STYLE = { color: "var(--uu-fg, #fff)" };
const ROLE_USER_OPEN_ACTION_STYLE = { gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" };

function RoleUsersSection({
  t,
  roleUsersKey = "",
  usersForRole = [],
  onOpenUser = null,
} = {}) {
  return (
    <div>
      <h4 className="uu-h3 uu-block-title" style={ROLE_USERS_TITLE_STYLE}>
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
        <div style={ROLE_USERS_GRID_STYLE}>
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
                <div style={ROLE_USER_CARD_GRID_STYLE}>
                  <div style={ROLE_USER_AVATAR_STYLE}>
                    {rowAvatarSrc ? (
                      <img
                        src={rowAvatarSrc}
                        alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
                        style={ROLE_USER_AVATAR_IMAGE_STYLE}
                      />
                    ) : (
                      <span>{rowAvatarInitials}</span>
                    )}
                  </div>
                  <div style={ROLE_USER_MIN_WIDTH_STYLE}>
                    <div className="uu-row" style={ROLE_USER_NAME_ROW_STYLE}>
                      <div style={ROLE_USER_DISPLAY_NAME_STYLE}>
                        {rowDisplayName}
                      </div>
                      <span
                        title={isActive
                          ? safeT(t, "postprod.users.status.active", "Disponible")
                          : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                        aria-label={isActive
                          ? safeT(t, "postprod.users.status.active", "Disponible")
                          : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                        style={isActive ? ROLE_USER_STATUS_DOT_ACTIVE_STYLE : ROLE_USER_STATUS_DOT_INACTIVE_STYLE}
                      />
                    </div>
                    <div style={ROLE_USER_NAME_LINE_STYLE}>
                      {rowNameLine}
                    </div>
                  </div>

                  <div
                    className="uu-muted"
                    title={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
                    aria-label={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
                    style={ROLE_USER_ICON_STYLE}
                  >
                    ☎
                  </div>
                  <div style={ROLE_USER_VALUE_STYLE}>
                    {rowPhone1 || "-"}
                  </div>

                  <div
                    className="uu-muted"
                    title={safeT(t, "postprod.users.form.email1", "Email 1")}
                    aria-label={safeT(t, "postprod.users.form.email1", "Email 1")}
                    style={ROLE_USER_ICON_STYLE}
                  >
                    ✉
                  </div>
                  <div style={ROLE_USER_MIN_WIDTH_STYLE}>
                    {rowEmail1 ? (
                      <button
                        type="button"
                        className="uu-link"
                        style={ROLE_USER_EMAIL_BUTTON_STYLE}
                        onClick={openMailCompose}
                        title={safeT(t, "postprod.users.action.writeMail", "Ecrire un email")}
                      >
                        {rowEmail1}
                      </button>
                    ) : (
                      <span style={ROLE_USER_TEXT_STYLE}>-</span>
                    )}
                  </div>

                  {onOpenUser ? (
                    <div style={ROLE_USER_OPEN_ACTION_STYLE}>
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
