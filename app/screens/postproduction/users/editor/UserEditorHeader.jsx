import { safeT } from "../../shared/helpers";

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
}) {
  return (
    <div className="uu-card">
      <div className="uu-row" style={{ justifyContent: "flex-end", alignItems: "center" }}>
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
        <button className="uu-btn-ghost" type="button" onClick={closeEditor} disabled={usersLoading}>
          {safeT(t, "postprod.users.form.cancel", "Retour liste")}
        </button>
      </div>

      <div className="uu-row mt-12" style={{ alignItems: "center", gap: "16px" }}>
        <div
          style={{
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
          }}
        >
          {editorAvatarSrc ? (
            <img
              src={editorAvatarSrc}
              alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span>{editorAvatarInitials}</span>
          )}
        </div>
        <div className="uu-col" style={{ minWidth: 0, gap: "6px" }}>
          <div className="uu-row" style={{ alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                color: "var(--uu-fg, #fff)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {String(draft?.displayName || "").trim() || safeT(t, "postprod.users.form.displayName", "Nom affiché")}
            </div>
            <span
              title={draft?.isActive !== false
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              aria-label={draft?.isActive !== false
                ? safeT(t, "postprod.users.status.active", "Disponible")
                : safeT(t, "postprod.users.status.inactive", "Indisponible")}
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "999px",
                background: draft?.isActive !== false ? "#22c55e" : "#ef4444",
                flex: "0 0 auto",
              }}
            />
          </div>
          <span className="uu-muted" style={{ alignSelf: "flex-start", textAlign: "left" }}>{selectedProfile}</span>
          <input
            ref={editorAvatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
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
