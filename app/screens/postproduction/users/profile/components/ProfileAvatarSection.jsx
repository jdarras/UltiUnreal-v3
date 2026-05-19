import { safeT } from "../../../shared/helpers";
import { AVATAR_PREVIEW_SIZE } from "../../userSharedHelpers";

const PROFILE_AVATAR_ROW_STYLE = { gap: "12px" };
const PROFILE_AVATAR_FRAME_STYLE = {
  borderRadius: "50%",
  overflow: "hidden",
  border: "1px solid var(--uu-border, #ddd)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--uu-surface-soft, #f3f3f3)",
  fontWeight: 600,
  userSelect: "none",
};
const PROFILE_AVATAR_FRAME_SIZED_STYLE = {
  ...PROFILE_AVATAR_FRAME_STYLE,
  width: `${AVATAR_PREVIEW_SIZE}px`,
  height: `${AVATAR_PREVIEW_SIZE}px`,
};
const PROFILE_AVATAR_IMAGE_STYLE = { width: "100%", height: "100%", objectFit: "cover" };
const PROFILE_AVATAR_INPUT_HIDDEN_STYLE = { display: "none" };

function ProfileAvatarSection({
  t,
  saving = false,
  avatarLoading = false,
  avatarInputRef = null,
  avatarSrc = "",
  profileInitials = "",
  onSelectAvatarFile = null,
  setAvatarPath = null,
  setAvatarError = null,
  avatarPath = "",
  avatarError = "",
}) {
  return (
    <div className="uu-grid-field mt-12">
      <label className="uu-label">{safeT(t, "postprod.profile.form.avatar.label", "Photo")}</label>
      <div className="uu-row uu-align-center" style={PROFILE_AVATAR_ROW_STYLE}>
        <div style={PROFILE_AVATAR_FRAME_SIZED_STYLE}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={safeT(t, "postprod.profile.form.avatar.alt", "Photo utilisateur")}
              style={PROFILE_AVATAR_IMAGE_STYLE}
            />
          ) : (
            <span>{profileInitials}</span>
          )}
        </div>
        <div className="uu-col">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={PROFILE_AVATAR_INPUT_HIDDEN_STYLE}
            disabled={saving || avatarLoading}
            onChange={(e) => {
              void onSelectAvatarFile?.(e);
            }}
          />
          <div className="uu-row">
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => avatarInputRef?.current?.click()}
              disabled={saving || avatarLoading}
            >
              {safeT(t, "postprod.profile.form.avatar.pick", "Choisir une photo")}
            </button>
            <button
              className="uu-btn-ghost"
              type="button"
              onClick={() => {
                setAvatarPath?.("");
                setAvatarError?.("");
              }}
              disabled={saving || avatarLoading || !String(avatarPath || "").trim()}
            >
              {safeT(t, "postprod.profile.form.avatar.clear", "Supprimer")}
            </button>
          </div>
          <span className="uu-muted">
            {safeT(t, "postprod.profile.form.avatar.help", "Image redimensionnee automatiquement (max 5 Mo).")}
          </span>
          {avatarLoading ? (
            <span className="uu-muted">{safeT(t, "common.loading", "Chargement…")}</span>
          ) : null}
          {avatarError ? (
            <span className="uu-msg warn">{avatarError}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { ProfileAvatarSection };
