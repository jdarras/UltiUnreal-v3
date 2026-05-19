import { safeT } from "../shared/helpers";
import { resolveUserDisplayName } from "./roleHelpers";
import { isUsableAvatarSrc, resolveAvatarInitials } from "./userSharedHelpers";

const USER_THUMB_CARD_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "96px minmax(0, 1fr)",
  columnGap: "12px",
  rowGap: "8px",
  alignItems: "center",
};
const USER_THUMB_CARD_AVATAR_STYLE = {
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
const USER_THUMB_CARD_AVATAR_IMAGE_STYLE = { width: "100%", height: "100%", objectFit: "cover" };
const USER_THUMB_CARD_MIN_WIDTH_STYLE = { minWidth: 0 };
const USER_THUMB_CARD_NAME_ROW_STYLE = { alignItems: "center", gap: "8px", minWidth: 0 };
const USER_THUMB_CARD_DISPLAY_NAME_STYLE = {
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--uu-fg, #fff)",
};
const USER_THUMB_CARD_STATUS_DOT_STYLE = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  flex: "0 0 auto",
};
const USER_THUMB_CARD_STATUS_DOT_ACTIVE_STYLE = {
  ...USER_THUMB_CARD_STATUS_DOT_STYLE,
  background: "#22c55e",
};
const USER_THUMB_CARD_STATUS_DOT_INACTIVE_STYLE = {
  ...USER_THUMB_CARD_STATUS_DOT_STYLE,
  background: "#ef4444",
};
const USER_THUMB_CARD_NAME_LINE_STYLE = {
  marginTop: "2px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--uu-fg, #fff)",
};
const USER_THUMB_CARD_ICON_STYLE = { display: "flex", justifyContent: "center", alignItems: "center" };
const USER_THUMB_CARD_VALUE_STYLE = { color: "var(--uu-fg, #fff)", minWidth: 0, wordBreak: "break-word" };
const USER_THUMB_CARD_EMAIL_BUTTON_STYLE = {
  padding: 0,
  color: "var(--uu-fg, #fff)",
  display: "inline-block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  verticalAlign: "bottom",
};
const USER_THUMB_CARD_TEXT_STYLE = { color: "var(--uu-fg, #fff)" };

function UserThumbCard({
  t,
  entry = null,
  openEdit,
  usersLoading = false,
  manageableSet = new Set(),
}) {
  const rowRole = String(entry?.role || "").trim();
  const canEditRow = manageableSet?.has?.(rowRole) === true;
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
    <div className="uu-card">
      <div style={USER_THUMB_CARD_GRID_STYLE}>
        <div style={USER_THUMB_CARD_AVATAR_STYLE}>
          {rowAvatarSrc ? (
            <img
              src={rowAvatarSrc}
              alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
              style={USER_THUMB_CARD_AVATAR_IMAGE_STYLE}
            />
          ) : (
            <span>{rowAvatarInitials}</span>
          )}
        </div>
        <div style={USER_THUMB_CARD_MIN_WIDTH_STYLE}>
          <div className="uu-row" style={USER_THUMB_CARD_NAME_ROW_STYLE}>
            <div style={USER_THUMB_CARD_DISPLAY_NAME_STYLE}>
              {rowDisplayName}
            </div>
            <span
              title={isActive
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              aria-label={isActive
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              style={isActive ? USER_THUMB_CARD_STATUS_DOT_ACTIVE_STYLE : USER_THUMB_CARD_STATUS_DOT_INACTIVE_STYLE}
            />
          </div>
          <div style={USER_THUMB_CARD_NAME_LINE_STYLE}>
            {rowNameLine}
          </div>
        </div>

        <div
          className="uu-muted"
          title={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
          aria-label={safeT(t, "postprod.users.form.phone1", "Telephone 1")}
          style={USER_THUMB_CARD_ICON_STYLE}
        >
          ☎
        </div>
        <div style={USER_THUMB_CARD_VALUE_STYLE}>
          {rowPhone1 || "-"}
        </div>

        <div
          className="uu-muted"
          title={safeT(t, "postprod.users.form.email1", "Email 1")}
          aria-label={safeT(t, "postprod.users.form.email1", "Email 1")}
          style={USER_THUMB_CARD_ICON_STYLE}
        >
          ✉
        </div>
        <div style={USER_THUMB_CARD_MIN_WIDTH_STYLE}>
          {rowEmail1 ? (
            <button
              type="button"
              className="uu-link"
              style={USER_THUMB_CARD_EMAIL_BUTTON_STYLE}
              onClick={openMailCompose}
              title={safeT(t, "postprod.users.action.writeMail", "Ecrire un email")}
            >
              {rowEmail1}
            </button>
          ) : (
            <span style={USER_THUMB_CARD_TEXT_STYLE}>-</span>
          )}
        </div>

        <div>
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={usersLoading || !canEditRow}
            title={!canEditRow ? safeT(t, "postprod.users.readOnly", "Lecture seule pour ce role.") : undefined}
            onClick={() => openEdit?.(entry)}
          >
            {safeT(t, "postprod.users.action.edit", "Éditer")}
          </button>
        </div>
        <div />
      </div>
    </div>
  );
}

export { UserThumbCard };
