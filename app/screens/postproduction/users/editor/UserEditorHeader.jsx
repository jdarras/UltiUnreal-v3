import { safeT } from "../../shared/helpers";

const USER_EDITOR_HEADER_ACTIONS_ROW_STYLE = { justifyContent: "flex-end", alignItems: "center" };
const USER_EDITOR_HEADER_CONTENT_ROW_STYLE = { alignItems: "center", gap: "16px" };
const USER_EDITOR_HEADER_AVATAR_STYLE = {
  width: "88px",
  height: "88px",
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
const USER_EDITOR_HEADER_AVATAR_IMAGE_STYLE = { width: "100%", height: "100%", objectFit: "cover" };
const USER_EDITOR_HEADER_DETAILS_STYLE = { minWidth: 0, gap: "6px" };
const USER_EDITOR_HEADER_NAME_ROW_STYLE = { alignItems: "center", gap: "8px", minWidth: 0 };
const USER_EDITOR_HEADER_NAME_STYLE = {
  fontWeight: 700,
  color: "var(--uu-fg, #fff)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const USER_EDITOR_HEADER_STATUS_DOT_STYLE = {
  width: "9px",
  height: "9px",
  borderRadius: "999px",
  flex: "0 0 auto",
};
const USER_EDITOR_HEADER_STATUS_DOT_ACTIVE_STYLE = {
  ...USER_EDITOR_HEADER_STATUS_DOT_STYLE,
  background: "#22c55e",
};
const USER_EDITOR_HEADER_STATUS_DOT_INACTIVE_STYLE = {
  ...USER_EDITOR_HEADER_STATUS_DOT_STYLE,
  background: "#ef4444",
};
const USER_EDITOR_HEADER_PROFILE_STYLE = { alignSelf: "flex-start", textAlign: "left" };
const USER_EDITOR_HEADER_HIDDEN_INPUT_STYLE = { display: "none" };

function UserEditorHeader({
  t,
  usersLoading = false,
  closeEditor,
  editorAvatarSrc = "",
  editorAvatarInitials = "",
  draft = {},
  selectedProfile = "",
  editorAvatarInputRef = null,
  editorAvatarLoading = false,
  onSelectEditorAvatar,
  onClearAvatar,
  editorAvatarPath = "",
  isCreate = false,
  canDeleteUser = false,
  onRequestDeleteUser = null,
  deleteUserBusy = false,
  selfProfile = false,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row" style={USER_EDITOR_HEADER_ACTIONS_ROW_STYLE}>
        {!isCreate && canDeleteUser ? (
          <button
            className="uu-btn-ghost"
            type="button"
            onClick={() => onRequestDeleteUser?.()}
            disabled={deleteUserBusy}
          >
            {safeT(t, "postprod.users.action.deleteUser", "Supprimer utilisateur")}
          </button>
        ) : null}
        {!selfProfile ? (
          <button className="uu-btn-ghost" type="button" onClick={closeEditor} disabled={usersLoading}>
            {safeT(t, "postprod.users.form.cancel", "Retour liste")}
          </button>
        ) : null}
      </div>

      <div className="uu-row mt-12" style={USER_EDITOR_HEADER_CONTENT_ROW_STYLE}>
        <div style={USER_EDITOR_HEADER_AVATAR_STYLE}>
          {editorAvatarSrc ? (
            <img
              src={editorAvatarSrc}
              alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
              style={USER_EDITOR_HEADER_AVATAR_IMAGE_STYLE}
            />
          ) : (
            <span>{editorAvatarInitials}</span>
          )}
        </div>
        <div className="uu-col" style={USER_EDITOR_HEADER_DETAILS_STYLE}>
          <div className="uu-row" style={USER_EDITOR_HEADER_NAME_ROW_STYLE}>
            <div style={USER_EDITOR_HEADER_NAME_STYLE}>
              {String(draft?.displayName || "").trim() || safeT(t, "postprod.users.form.displayName", "Nom affiché")}
            </div>
            <span
              title={draft?.isActive !== false
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              aria-label={draft?.isActive !== false
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              style={draft?.isActive !== false ? USER_EDITOR_HEADER_STATUS_DOT_ACTIVE_STYLE : USER_EDITOR_HEADER_STATUS_DOT_INACTIVE_STYLE}
            />
          </div>
          <span className="uu-muted" style={USER_EDITOR_HEADER_PROFILE_STYLE}>{selectedProfile}</span>
          <input
            ref={editorAvatarInputRef}
            type="file"
            accept="image/*"
            style={USER_EDITOR_HEADER_HIDDEN_INPUT_STYLE}
            disabled={usersLoading || editorAvatarLoading}
            onChange={(e) => {
              void onSelectEditorAvatar?.(e);
            }}
          />
          <div className="uu-row">
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => editorAvatarInputRef?.current?.click()}
              disabled={usersLoading || editorAvatarLoading}
            >
              {safeT(t, "postprod.profile.form.avatar.pick", "Choisir une photo")}
            </button>
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => {
                onClearAvatar?.();
              }}
              disabled={usersLoading || editorAvatarLoading || !editorAvatarPath}
            >
              {safeT(t, "postprod.profile.form.avatar.clear", "Supprimer photo")}
            </button>
          </div>
          {editorAvatarLoading ? (
            <span className="uu-muted">{safeT(t, "common.loading", "Chargement…")}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { UserEditorHeader };
