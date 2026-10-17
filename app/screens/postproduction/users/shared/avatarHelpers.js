import { safeT } from "../../shared/helpers";

const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024;
const AVATAR_PREVIEW_SIZE = 96;
const AVATAR_UPLOAD_MAX_SIDE = 256;

function resolveAvatarInitials(displayName, username) {
  const source = String(displayName || username || "").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return String(parts[0][0] || "U").toUpperCase();
  return `${String(parts[0][0] || "")}${String(parts[1][0] || "")}`.toUpperCase() || "U";
}

function isUsableAvatarSrc(value) {
  const src = String(value || "").trim();
  if (!src) return false;
  if (/^data:image\//i.test(src)) return true;
  if (/^https?:\/\//i.test(src)) return true;
  if (/^[./]/.test(src)) return true;
  return false;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("avatar_read_error"));
    };
    image.src = objectUrl;
  });
}

async function buildAvatarDataUrlFromFile(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw Object.assign(new Error("invalid_avatar_file_type"), { code: "invalid_avatar_file_type" });
  }
  if (Number(file.size || 0) > MAX_AVATAR_FILE_BYTES) {
    throw Object.assign(new Error("avatar_file_too_large"), { code: "avatar_file_too_large" });
  }
  const image = await loadImageFromFile(file);
  const width = Number(image?.naturalWidth || image?.width || 0);
  const height = Number(image?.naturalHeight || image?.height || 0);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw Object.assign(new Error("avatar_read_error"), { code: "avatar_read_error" });
  }
  const ratio = Math.min(1, AVATAR_UPLOAD_MAX_SIDE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw Object.assign(new Error("avatar_read_error"), { code: "avatar_read_error" });
  }
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function avatarErrorMessage(t, err) {
  const code = String(err?.code || err?.message || "").trim().toLowerCase();
  if (code === "invalid_avatar_file_type") {
    return safeT(t, "postprod.profile.form.avatar.error.invalidType", "Le fichier doit etre une image.");
  }
  if (code === "avatar_file_too_large") {
    return safeT(t, "postprod.profile.form.avatar.error.tooLarge", "Image trop volumineuse (5 Mo max).");
  }
  return safeT(t, "postprod.profile.form.avatar.error.read", "Impossible de lire l'image.");
}

export {
  MAX_AVATAR_FILE_BYTES,
  AVATAR_PREVIEW_SIZE,
  AVATAR_UPLOAD_MAX_SIDE,
  resolveAvatarInitials,
  isUsableAvatarSrc,
  buildAvatarDataUrlFromFile,
  avatarErrorMessage,
};
