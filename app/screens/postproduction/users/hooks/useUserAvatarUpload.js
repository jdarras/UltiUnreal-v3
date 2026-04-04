import { useCallback } from "react";
import { avatarErrorMessage, buildAvatarDataUrlFromFile } from "../userSharedHelpers";

function useUserAvatarUpload({
  t,
  setDraft = null,
  setEditorAvatarError = null,
  setEditorAvatarLoading = null,
  onNotify = null,
}) {
  const onSelectEditorAvatar = useCallback(async (event) => {
    const file = event?.target?.files?.[0] || null;
    if (event?.target) {
      event.target.value = "";
    }
    if (!file) return;
    setEditorAvatarError?.("");
    setEditorAvatarLoading?.(true);
    try {
      const dataUrl = await buildAvatarDataUrlFromFile(file);
      setDraft?.((prev) => ({ ...(prev || {}), avatarPath: dataUrl }));
    } catch (err) {
      const message = avatarErrorMessage(t, err);
      setEditorAvatarError?.(message);
      if (typeof onNotify === "function") {
        onNotify(message, "warn");
      }
    } finally {
      setEditorAvatarLoading?.(false);
    }
  }, [setDraft, setEditorAvatarError, setEditorAvatarLoading, t, onNotify]);

  return {
    onSelectEditorAvatar,
  };
}

export { useUserAvatarUpload };
